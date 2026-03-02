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
    if (!session?.access_token) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        if (error.message?.includes('non-2xx')) {
          setIsPro(false);
          return;
        }
        throw error;
      }

      const subStatus = data?.status as string | null;
      const subscribed = data?.subscribed === true && (PRO_PRODUCT_IDS.includes(data?.product_id) || data?.product_id === 'override');
      if (subscribed) console.log('[SUB] Pro active, stripe status:', subStatus);
      // Track purchase_completed when Pro becomes active
      if (subscribed && !prevIsPro.current && user) {
        trackPurchaseCompleted(user.id);
      }
      prevIsPro.current = subscribed;
      setIsPro(subscribed);
      setSubscriptionEnd(data?.subscription_end || null);
    } catch (err) {
      console.error('Failed to check subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

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
      setTimeout(checkSubscription, 2000);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('checkout') === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkSubscription]);

  const startCheckout = useCallback(async (plan?: 'monthly' | 'yearly') => {
    setCheckoutLoading(true);
    setCheckoutFallbackUrl(null);
    try {
      console.log('[CHECKOUT] Invoking create-checkout, plan:', plan || 'monthly');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: plan || 'monthly' },
      });
      console.log('[CHECKOUT] Response:', { hasUrl: !!data?.url, error: error?.message });
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
  }, []);

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
