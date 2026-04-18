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
        className="flex items-start gap-2.5 border-b px-3 py-2.5 sm:items-center sm:gap-2"
        style={{
          background: 'linear-gradient(90deg, #F8FBFF 0%, #EFF6FF 52%, #DBEAFE 100%)',
          borderColor: '#BFDBFE',
          color: '#1E3A8A',
        }}
      >
        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full sm:mt-0" style={{ background: '#DBEAFE' }}>
          <Crown className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold leading-tight sm:text-xs">{dayLabel}</p>
          <button
            className="mt-1 inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold leading-none transition-colors hover:bg-white/85 sm:mt-1.5"
            style={{ color: '#0B5FFF', borderColor: '#BFDBFE', background: 'rgba(255,255,255,0.72)' }}
            onClick={() => setShowUpgrade(true)}
          >
            Unlock lifetime access — $15.99 one-time
          </button>
        </div>
        <button
          className="mt-0.5 rounded p-1 transition-colors hover:bg-white/70 sm:mt-0"
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
