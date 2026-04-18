import { useState } from 'react';
import { Crown, X } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';

export function TrialCountdownBanner() {
  const { subscriptionStatus, daysUntilEnd } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (subscriptionStatus !== 'trialing' || daysUntilEnd === null || daysUntilEnd > 3 || dismissed) return null;

  const dayLabel = daysUntilEnd <= 0
    ? 'Trial ends today'
    : daysUntilEnd === 1
      ? '1 day left in your trial'
      : `${daysUntilEnd} days left in your trial`;

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: '#EAF8F5', borderColor: '#BFE8DF', color: '#0F766E' }}>
        <Crown className="h-3.5 w-3.5 flex-shrink-0" />
        <p className="flex-1 text-xs font-medium leading-tight">
          {dayLabel} —{' '}
          <button
            className="underline underline-offset-2 font-semibold transition-colors"
            onClick={() => setShowUpgrade(true)}
          >
            unlock lifetime access for $15.99
          </button>
        </p>
        <button
          className="p-0.5 rounded transition-colors"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss trial warning"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ProUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} trigger="generic" />
    </>
  );
}
