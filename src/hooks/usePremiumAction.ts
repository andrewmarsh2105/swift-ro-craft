import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

/**
 * Returns a function that either runs the action (if Pro) or opens checkout.
 */
export function usePremiumAction() {
  const { isPro, loading, openCheckout } = useSubscription();

  const guardAction = (action: () => void, featureName: string) => {
    if (loading) return;
    if (isPro) {
      action();
    } else {
      toast('Pro feature', {
        description: `${featureName} requires a Pro subscription.`,
        action: {
          label: 'Upgrade',
          onClick: () => openCheckout(),
        },
      });
    }
  };

  return { guardAction, isPro, loading };
}
