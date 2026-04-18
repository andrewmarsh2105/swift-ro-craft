import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { trackCheckoutStarted, trackPurchaseCompleted } from '@/lib/analytics';
import { hasProAccess, type AccessStatus } from '@/lib/subscriptionAccess';

export type BillingStatus = AccessStatus;

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  /** Preferred access-oriented name. */
  accessEndsAt: string | null;
  /** Legacy name retained for compatibility across existing consumers. */
  subscriptionEnd: string | null;
  /** Preferred access-oriented name. */
  accessStatus: BillingStatus;
  /** Legacy name retained for compatibility across existing consumers. */
  subscriptionStatus: BillingStatus;
  /** Days until trial ends. null when no active trial. */
  daysUntilEnd: number | null;
  /** True only when an active trial is within 3 days of ending. */
  isNearExpiry: boolean;
  /** Legacy key retained for API compatibility; always false in trial + lifetime billing model. */
  hasBillingIssue: boolean;
  checkoutLoading: boolean;
  checkoutFallbackUrl: string | null;
  clearCheckoutFallback: () => void;
  /** Preferred access-oriented method name. */
  checkAccess: () => Promise<BillingStatus>;
  /** Legacy method retained for compatibility across existing consumers. */
  checkSubscription: () => Promise<BillingStatus>;
  startCheckout: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isPro, setIsPro] = useState(false);
  const previousStatusRef = useRef<BillingStatus>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<BillingStatus>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutFallbackUrl, setCheckoutFallbackUrl] = useState<string | null>(null);

  const clearCheckoutFallback = useCallback(() => setCheckoutFallbackUrl(null), []);

  const SUBSCRIPTION_CHECK_TIMEOUT_MS = 10_000;

  const checkSubscription = useCallback(async (): Promise<BillingStatus> => {
    const timeoutHandle = setTimeout(() => {
      console.warn(
        `[Subscription] checkSubscription did not resolve within ${SUBSCRIPTION_CHECK_TIMEOUT_MS}ms. ` +
        'Defaulting to no access. Check Supabase connectivity and Edge Function health.'
      );
      setLoading(false);
    }, SUBSCRIPTION_CHECK_TIMEOUT_MS);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setIsPro(false);
        setSubscriptionStatus(null);
        setSubscriptionEnd(null);
        previousStatusRef.current = null;
        return null;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) {
        return previousStatusRef.current;
      }

      const status = (data?.status || null) as BillingStatus;
      const subscribed = data?.subscribed === true || hasProAccess(status);
      if (
        status === 'lifetime' &&
        previousStatusRef.current !== 'lifetime' &&
        sessionData.session?.user?.id
      ) {
        trackPurchaseCompleted(sessionData.session.user.id);
      }
      previousStatusRef.current = status;
      setIsPro(subscribed);
      setSubscriptionStatus(status);
      setSubscriptionEnd(data?.subscription_end || null);
      return status;
    } catch {
      // Preserve existing state on transient errors.
      return previousStatusRef.current;
    } finally {
      clearTimeout(timeoutHandle);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }

    if (userId) {
      checkSubscription();
    } else {
      setIsPro(false);
      setSubscriptionStatus(null);
      setSubscriptionEnd(null);
      previousStatusRef.current = null;
      setLoading(false);
    }
  }, [userId, checkSubscription]);

  useEffect(() => {
    if (!userId || !SUPABASE_CONFIGURED) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [userId, checkSubscription]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      let attempt = 0;
      const maxAttempts = 5;
      const delays = [2000, 3000, 3000, 3500, 3500];
      const syncToast = toast.loading('Syncing access…');
      const tryCheck = async () => {
        attempt++;
        const status = await checkSubscription();
        if (status === 'lifetime') {
          toast.success('Lifetime access unlocked', { id: syncToast });
          return;
        }
        if (attempt < maxAttempts) {
          setTimeout(tryCheck, delays[attempt]);
          return;
        }
        toast.dismiss(syncToast);
        toast('Payment received. Access may take a moment to sync. Please refresh shortly.', { duration: 5000 });
      };
      setTimeout(tryCheck, delays[0]);
    } else if (params.get('checkout') === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
      toast.info('Checkout was canceled. No charges were made.');
    }
  }, [checkSubscription]);

  const startCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    setCheckoutFallbackUrl(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const requestId = crypto.randomUUID();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { request_id: requestId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) throw error;
      if (data?.url) {
        if (user) trackCheckoutStarted(user.id, 'lifetime');
        window.location.href = data.url;
        setTimeout(() => {
          setCheckoutFallbackUrl(data.url);
          setCheckoutLoading(false);
        }, 2000);
        return;
      }

      toast.error('Checkout URL not received. Please try again.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      toast.error(`Checkout failed: ${message}`);
    }

    setCheckoutLoading(false);
  }, [user]);

  const daysUntilEnd = subscriptionStatus === 'trialing' && subscriptionEnd
    ? Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isNearExpiry = subscriptionStatus === 'trialing' && daysUntilEnd !== null && daysUntilEnd <= 3;

  return (
    <SubscriptionContext.Provider value={{
      isPro,
      loading,
      accessEndsAt: subscriptionEnd,
      subscriptionEnd,
      accessStatus: subscriptionStatus,
      subscriptionStatus,
      daysUntilEnd,
      isNearExpiry,
      hasBillingIssue: false,
      checkoutLoading,
      checkoutFallbackUrl,
      clearCheckoutFallback,
      checkAccess: checkSubscription,
      checkSubscription,
      startCheckout,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
