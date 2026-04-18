import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Shield } from 'lucide-react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { cn } from '@/lib/utils';
import type { BillingStatus } from '@/contexts/SubscriptionContext';

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  avatarInitial: string;
  email: string | undefined;
  isPro: boolean;
  subscriptionEnd: string | null | undefined;
  daysUntilEnd: number | null;
  isNearExpiry: boolean;
  subscriptionStatus: BillingStatus;
  isAdmin: boolean;
  setShowUpgradeDialog: (v: boolean) => void;
  signOut: () => void;
}

export function AccountSheet({
  isOpen,
  onClose,
  avatarInitial,
  email,
  isPro,
  subscriptionEnd,
  daysUntilEnd,
  isNearExpiry,
  subscriptionStatus,
  isAdmin,
  setShowUpgradeDialog,
  signOut,
}: AccountSheetProps) {
  const navigate = useNavigate();

  const statusLabel =
    subscriptionStatus === 'lifetime'
      ? 'Lifetime unlocked'
      : subscriptionStatus === 'trialing'
        ? 'Trial active'
        : subscriptionStatus === 'expired'
          ? 'Trial expired'
          : isPro
            ? 'Access active'
            : 'Locked';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Account">
      <div className="p-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground text-lg font-bold select-none bg-primary">
            {avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">Account</div>
            <div className="text-[12px] text-muted-foreground/70 truncate">{email}</div>
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide px-0.5">Access</h4>
          <div className="bg-card border border-border/60 overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
            <button
              onClick={() => {
                onClose();
                if (!isPro || subscriptionStatus === 'expired') setShowUpgradeDialog(true);
              }}
              className="w-full px-4 py-3 flex items-center justify-between tap-target active:bg-muted/40 transition-colors"
              disabled={isPro && subscriptionStatus !== 'expired'}
            >
              <span className="text-[13px] font-medium">{isPro && subscriptionStatus !== 'expired' ? 'Access status' : 'Unlock full access'}</span>
              <div className="flex items-center gap-2">
                <span className={cn('text-[12px] font-semibold', isPro ? 'text-primary' : 'text-muted-foreground')}>
                  {statusLabel}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </div>
            </button>
            {subscriptionStatus === 'trialing' && subscriptionEnd && (
              <div className="px-4 pb-3 -mt-1">
                <p className="text-[11px] text-muted-foreground/60">Trial expires {new Date(subscriptionEnd).toLocaleDateString()}</p>
              </div>
            )}
            {isNearExpiry && daysUntilEnd !== null && (
              <div className="mx-4 mb-3 rounded-md px-3 py-2 bg-amber-500/8 border border-amber-500/20">
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                  Trial expires in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border/60 overflow-hidden divide-y divide-border/40" style={{ borderRadius: 'var(--radius)' }}>
          {isAdmin && (
            <button
              onClick={() => { onClose(); navigate('/admin'); }}
              className="w-full px-4 py-3 flex items-center gap-3 tap-target active:bg-muted/40 transition-colors text-primary"
            >
              <Shield className="h-4 w-4" />
              <span className="text-[13px] font-medium flex-1 text-left">Admin Panel</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </button>
          )}
          <button
            onClick={signOut}
            className="w-full px-4 py-3 flex items-center gap-3 tap-target active:bg-muted/40 transition-colors text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[13px] font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
