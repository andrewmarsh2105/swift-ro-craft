import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const PRO_PRODUCT_IDS = ['prod_TytAJ1A0OZTgh0', 'prod_U2nOsuL3zAYIwa', 'prod_U2ndu4y9M2upB3'];

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
  startCheckout: (plan?: 'monthly' | 'yearly') => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        // Silently handle auth errors (expired session, etc.)
        if (error.message?.includes('non-2xx')) {
          setIsPro(false);
          return;
        }
        throw error;
      }

      const subscribed = data?.subscribed === true && (PRO_PRODUCT_IDS.includes(data?.product_id) || data?.product_id === 'override');
      setIsPro(subscribed);
      setSubscriptionEnd(data?.subscription_end || null);
    } catch (err) {
      console.error('Failed to check subscription:', err);
      // Don't reset isPro on transient errors
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Check on mount and when auth changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setIsPro(false);
      setLoading(false);
    }
  }, [user, checkSubscription]);

  // Periodic refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Check on checkout return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      // Delay slightly for Stripe to process
      setTimeout(checkSubscription, 2000);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('checkout') === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkSubscription]);

  const startCheckout = useCallback(async (plan?: 'monthly' | 'yearly') => {
    try {
      console.log('[CHECKOUT] Starting checkout with plan:', plan || 'monthly');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: plan || 'monthly' },
      });
      console.log('[CHECKOUT] Response:', { data, error });
      if (error) {
        console.error('[CHECKOUT] Edge function error:', error);
        throw error;
      }
      if (data?.url) {
        console.log('[CHECKOUT] Redirecting to:', data.url);
        window.location.href = data.url;
      } else {
        console.error('[CHECKOUT] No URL in response:', data);
        toast.error('Checkout URL not received. Please try again.');
      }
    } catch (err) {
      console.error('[CHECKOUT] Failed to start checkout:', err);
      toast.error('Could not open checkout. Please try again.');
    }
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
    <SubscriptionContext.Provider value={{ isPro, loading, subscriptionEnd, checkSubscription, startCheckout, openPortal }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
