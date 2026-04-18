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
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{
          background: 'linear-gradient(90deg, #EFF6FF 0%, #DBEAFE 100%)',
          borderColor: '#BFDBFE',
          color: '#1E3A8A',
        }}
      >
        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: '#BFDBFE' }}>
          <Crown className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} />
        </div>
        <p className="flex-1 text-xs font-medium leading-tight">
          {dayLabel} —{' '}
          <button
            className="font-semibold underline underline-offset-2 transition-colors"
            style={{ color: '#0B5FFF' }}
            onClick={() => setShowUpgrade(true)}
          >
            unlock lifetime access for $15.99
          </button>
        </p>
        <button
          className="rounded p-0.5 transition-colors hover:bg-white/70"
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
