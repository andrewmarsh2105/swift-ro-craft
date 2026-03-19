import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { trackCheckoutStarted, trackPurchaseCompleted } from '@/lib/analytics';
import { hasBillingIssue, hasProAccess, type StripeSubscriptionStatus } from '@/lib/subscriptionAccess';

export type BillingStatus = StripeSubscriptionStatus;

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  subscriptionStatus: BillingStatus;
  /** Days until subscription/trial ends. null when no active subscription. */
  daysUntilEnd: number | null;
  /** True when Pro is active and ends within 7 days (trial window). */
  isNearExpiry: boolean;
  hasBillingIssue: boolean;
  checkoutLoading: boolean;
  checkoutFallbackUrl: string | null;
  clearCheckoutFallback: () => void;
  checkSubscription: () => Promise<void>;
  startCheckout: (plan?: 'monthly' | 'yearly') => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Use user.id (stable string) so token refreshes (which create a new user object)
  // don't unnecessarily re-run subscription checks and cause isPro to flash false.
  const userId = user?.id ?? null;
  const [isPro, setIsPro] = useState(false);
  const prevIsPro = useRef(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<BillingStatus>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutFallbackUrl, setCheckoutFallbackUrl] = useState<string | null>(null);

  const clearCheckoutFallback = useCallback(() => setCheckoutFallbackUrl(null), []);

  const checkSubscription = useCallback(async () => {
    // Always get fresh session to avoid stale closures (e.g. post-checkout redirect)
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      // If the user was previously pro, don't reset — this can happen briefly during
      // a token refresh before the new token is available. Only reset if genuinely signed out.
      if (!prevIsPro.current) {
        setIsPro(false);
        setSubscriptionStatus(null);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) {
        // On transient errors, keep current Pro state instead of resetting
        return;
      }

      const status = (data?.status || null) as BillingStatus;
      const subscribed = data?.subscribed === true || hasProAccess(status);
      // Track purchase_completed when Pro becomes active
      if (subscribed && !prevIsPro.current && sessionData.session?.user?.id) {
        trackPurchaseCompleted(sessionData.session.user.id);
      }
      prevIsPro.current = subscribed;
      setIsPro(subscribed);
      setSubscriptionStatus(status);
      setSubscriptionEnd(data?.subscription_end || null);
    } catch {
      // Don't reset isPro on transient errors — preserve current state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      checkSubscription();
    } else {
      setIsPro(false);
      setSubscriptionStatus(null);
      prevIsPro.current = false;
      setLoading(false);
    }
  }, [userId, checkSubscription]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [userId, checkSubscription]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      // Retry up to 5 times over ~15s to wait for Stripe to propagate
      let attempt = 0;
      const maxAttempts = 5;
      const delays = [2000, 3000, 3000, 3500, 3500]; // cumulative: 2s, 5s, 8s, 11.5s, 15s
      const syncToast = toast.loading('Syncing subscription…');
      const tryCheck = async () => {
        attempt++;
        await checkSubscription();
        setTimeout(() => {
          if (prevIsPro.current) {
            toast.success('Pro unlocked! 🎉', { id: syncToast });
          } else if (attempt < maxAttempts) {
            setTimeout(tryCheck, delays[attempt]);
          } else {
            toast.dismiss(syncToast);
            toast('Subscription may take a moment to activate. Pull to refresh.', { duration: 5000 });
          }
        }, 500);
      };
      setTimeout(tryCheck, delays[0]);
    } else if (params.get('checkout') === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
      toast.info('Checkout was canceled. No charges were made.');
    }
  }, [checkSubscription]);

  const startCheckout = useCallback(async (plan?: 'monthly' | 'yearly') => {
    setCheckoutLoading(true);
    setCheckoutFallbackUrl(null);
    try {
      // Always get a fresh token — the closure's `session` may be stale after a
      // token refresh, which would send an expired JWT and get a 401 from checkout.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const requestId = crypto.randomUUID();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: plan || 'monthly', request_id: requestId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.url) {
        if (user) trackCheckoutStarted(user.id, plan || 'monthly');
        window.location.href = data.url;
        // If still here after 2s, Safari may have blocked — show fallback
        setTimeout(() => {
          setCheckoutFallbackUrl(data.url);
          setCheckoutLoading(false);
        }, 2000);
        return;
      } else {
        toast.error('Checkout URL not received. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      toast.error(`Checkout failed: ${message}`);
    }
    setCheckoutLoading(false);
  }, [user]);

  const openPortal = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Could not open billing portal. Please try again.');
    }
  }, []);

  const daysUntilEnd = subscriptionEnd
    ? Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isNearExpiry = isPro && daysUntilEnd !== null && daysUntilEnd <= 7;
  const hasBillingIssueState = !isPro && hasBillingIssue(subscriptionStatus);

  return (
    <SubscriptionContext.Provider value={{ isPro, loading, subscriptionEnd, subscriptionStatus, daysUntilEnd, isNearExpiry, hasBillingIssue: hasBillingIssueState, checkoutLoading, checkoutFallbackUrl, clearCheckoutFallback, checkSubscription, startCheckout, openPortal }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
