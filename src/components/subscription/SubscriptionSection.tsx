import { useSubscription } from '@/contexts/SubscriptionContext';
import { Crown, CreditCard, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SubscriptionSection() {
  const { isPro, subscriptionEnd, loading, openCheckout, openPortal, refresh } = useSubscription();

  const handleUpgrade = async () => {
    try {
      await openCheckout();
    } catch {
      toast.error('Failed to open checkout');
    }
  };

  const handleManage = async () => {
    try {
      await openPortal();
    } catch {
      toast.error('Failed to open billing portal. Make sure you have an active subscription.');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4">
        Subscription
      </h3>
      <div className="card-mobile overflow-hidden">
        <div className={cn(
          'p-4',
          isPro ? 'bg-primary/10' : 'bg-muted/50'
        )}>
          <div className="flex items-center gap-3 mb-2">
            {isPro ? (
              <Crown className="h-5 w-5 text-primary" />
            ) : (
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-bold text-lg">{isPro ? 'Pro' : 'Free'}</span>
            {isPro && (
              <span className="text-[10px] px-2 py-0.5 bg-primary text-primary-foreground rounded-full font-semibold">
                ACTIVE
              </span>
            )}
          </div>
          {isPro && subscriptionEnd && (
            <p className="text-sm text-muted-foreground">
              Renews {new Date(subscriptionEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {!isPro && (
            <p className="text-sm text-muted-foreground">
              Unlock OCR scanning, exports, templates & more
            </p>
          )}
        </div>
        <div className="divide-y divide-border">
          {isPro ? (
            <button
              onClick={handleManage}
              className="w-full p-4 flex items-center justify-between tap-target touch-feedback"
            >
              <span className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Manage Billing
              </span>
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              className="w-full p-4 flex items-center justify-between tap-target touch-feedback"
            >
              <span className="font-medium flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro — $9.99/mo
              </span>
            </button>
          )}
          <button
            onClick={() => { refresh(); toast.success('Subscription refreshed'); }}
            className="w-full p-4 flex items-center justify-between tap-target touch-feedback"
          >
            <span className="font-medium flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
