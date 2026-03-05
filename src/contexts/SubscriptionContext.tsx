import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { trackCheckoutStarted, trackPurchaseCompleted } from '@/lib/analytics';

const PRO_PRODUCT_IDS = ['prod_TytAJ1A0OZTgh0', 'prod_U2nOsuL3zAYIwa', 'prod_U2ndu4y9M2upB3'];

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  checkoutLoading: boolean;
  checkoutFallbackUrl: string | null;
  clearCheckoutFallback: () => void;
  checkSubscription: () => Promise<void>;
  startCheckout: (plan?: 'monthly' | 'yearly') => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const prevIsPro = useRef(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutFallbackUrl, setCheckoutFallbackUrl] = useState<string | null>(null);

  const clearCheckoutFallback = useCallback(() => setCheckoutFallbackUrl(null), []);

  const checkSubscription = useCallback(async () => {
    // Always get fresh session to avoid stale closures (e.g. post-checkout redirect)
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[SUB] check-subscription FULL response:', JSON.stringify(data));
      if (data?.debug) {
        console.warn('[SUB] DEBUG INFO:', JSON.stringify(data.debug));
      }
      if (error) {
        console.error('[SUB] invoke error:', error.message);
        // On transient errors, keep current Pro state instead of resetting
        console.log('[SUB] Keeping current isPro state due to error');
        return;
      }

      const subStatus = data?.status as string | null;
      const subscribed = data?.subscribed === true;
      console.log('[SUB] Resolved:', { subscribed, status: subStatus, product_id: data?.product_id, subscription_end: data?.subscription_end });
      // Track purchase_completed when Pro becomes active
      if (subscribed && !prevIsPro.current && user) {
        trackPurchaseCompleted(user.id);
      }
      prevIsPro.current = subscribed;
      setIsPro(subscribed);
      setSubscriptionEnd(data?.subscription_end || null);
    } catch (err) {
      console.error('Failed to check subscription:', err);
      // Don't reset isPro on errors — preserve current state
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setIsPro(false);
      setLoading(false);
    }
  }, [user, checkSubscription]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

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
        console.log(`[SUB] Post-checkout check attempt ${attempt}/${maxAttempts}`);
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
    }
  }, [checkSubscription]);

  const startCheckout = useCallback(async (plan?: 'monthly' | 'yearly') => {
    setCheckoutLoading(true);
    setCheckoutFallbackUrl(null);
    try {
      console.log('[CHECKOUT] Invoking create-checkout, plan:', plan || 'monthly');
      const token = session?.access_token;
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: plan || 'monthly' },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      console.log('[CHECKOUT] Response:', { hasUrl: !!data?.url, version: data?.version, error: error?.message });
      if (error) throw error;
      if (data?.url) {
        console.log('[CHECKOUT] Redirecting via location.href...');
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
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[CHECKOUT] Failed:', msg);
      toast.error(`Checkout failed: ${msg}`);
    }
    setCheckoutLoading(false);
  }, [session]);

  const openPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to open portal:', err);
      toast.error('Could not open billing portal. Please try again.');
    }
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isPro, loading, subscriptionEnd, checkoutLoading, checkoutFallbackUrl, clearCheckoutFallback, checkSubscription, startCheckout, openPortal }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
