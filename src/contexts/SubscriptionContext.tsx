import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { trackCheckoutStarted, trackPurchaseCompleted } from '@/lib/analytics';
import { hasProAccess, type AccessStatus } from '@/lib/subscriptionAccess';

export type BillingStatus = AccessStatus;
export type AccessCheckState = 'loading' | 'ready' | 'error';

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  accessState: AccessCheckState;
  accessResolved: boolean;
  accessError: string | null;
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
  startTrial: () => Promise<void>;
  startCheckout: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timed out')) return 'Access check timed out. Please retry.';
    if (msg.includes('network')) return 'Network issue while checking access. Please retry.';
  }
  return 'Could not verify access right now. Please retry.';
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isPro, setIsPro] = useState(false);
  const previousStatusRef = useRef<BillingStatus>(null);
  const [accessState, setAccessState] = useState<AccessCheckState>('loading');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<BillingStatus>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutFallbackUrl, setCheckoutFallbackUrl] = useState<string | null>(null);

  const clearCheckoutFallback = useCallback(() => setCheckoutFallbackUrl(null), []);

  const SUBSCRIPTION_CHECK_TIMEOUT_MS = 10_000;

  const checkSubscription = useCallback(async (): Promise<BillingStatus> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setIsPro(false);
        setSubscriptionStatus(null);
        setSubscriptionEnd(null);
        previousStatusRef.current = null;
        setAccessError(null);
        setAccessState('ready');
        return null;
      }

      const invokeResult = await Promise.race([
        supabase.functions.invoke('check-subscription', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Access check timed out')), SUBSCRIPTION_CHECK_TIMEOUT_MS);
        }),
      ]);

      const { data, error } = invokeResult;
      if (error) throw error;

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
      setAccessError(null);
      setAccessState('ready');

      return status;
    } catch (error: unknown) {
      const fallbackStatus = previousStatusRef.current;
      if (fallbackStatus !== null) {
        setIsPro(hasProAccess(fallbackStatus));
        setSubscriptionStatus(fallbackStatus);
        setAccessState('ready');
      } else {
        setAccessState('error');
      }
      setAccessError(messageFromError(error));
      return fallbackStatus;
    }
  }, []);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setAccessState('ready');
      setAccessError(null);
      return;
    }

    if (userId) {
      setAccessState('loading');
      setAccessError(null);
      checkSubscription();
    } else {
      setIsPro(false);
      setSubscriptionStatus(null);
      setSubscriptionEnd(null);
      previousStatusRef.current = null;
      setAccessError(null);
      setAccessState('ready');
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

  const startTrial = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const { error } = await supabase.functions.invoke('start-trial', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      await checkSubscription();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      toast.error(`Could not start trial: ${message}`);
      throw err;
    }
  }, [checkSubscription]);

  const daysUntilEnd = subscriptionStatus === 'trialing' && subscriptionEnd
    ? Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isNearExpiry = subscriptionStatus === 'trialing' && daysUntilEnd !== null && daysUntilEnd <= 3;

  return (
    <SubscriptionContext.Provider value={{
      isPro,
      loading: accessState === 'loading',
      accessState,
      accessResolved: accessState === 'ready',
      accessError,
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
      startTrial,
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
