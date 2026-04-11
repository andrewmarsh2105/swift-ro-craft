import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, LogOut, Shield, Star } from 'lucide-react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { cn } from '@/lib/utils';

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  avatarInitial: string;
  email: string | undefined;
  isPro: boolean;
  subscriptionEnd: string | null | undefined;
  daysUntilEnd: number | null;
  isNearExpiry: boolean;
  hasBillingIssue: boolean;
  isAdmin: boolean;
  openPortal: () => void;
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
  hasBillingIssue,
  isAdmin,
  openPortal,
  setShowUpgradeDialog,
  signOut,
}: AccountSheetProps) {
  const navigate = useNavigate();

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
          <h4 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide px-0.5">Plan</h4>
          <div
            className="bg-card border border-border/60 overflow-hidden"
            style={{ borderRadius: 'var(--radius)' }}
          >
            <button
              onClick={() => {
                onClose();
                if (isPro) openPortal();
                else setShowUpgradeDialog(true);
              }}
              className="w-full px-4 py-3 flex items-center justify-between tap-target active:bg-muted/40 transition-colors"
            >
              <span className="text-[13px] font-medium">Subscription</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-[12px] font-semibold',
                  isPro ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {isPro ? 'Pro' : 'Free'}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </div>
            </button>
            {subscriptionEnd && isPro && !isNearExpiry && (
              <div className="px-4 pb-3 -mt-1">
                <p className="text-[11px] text-muted-foreground/60">Renews {new Date(subscriptionEnd).toLocaleDateString()}</p>
              </div>
            )}
            {isNearExpiry && daysUntilEnd !== null && (
              <div className="mx-4 mb-3 flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-md px-3 py-2">
                <Star className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-snug">
                  Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong> — add a payment method to keep Pro.
                </p>
              </div>
            )}
            {hasBillingIssue && (
              <div className="mx-4 mb-3 flex items-start gap-2 bg-destructive/8 border border-destructive/20 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-destructive leading-snug">
                  We couldn't renew your subscription.{' '}
                  <button onClick={() => { onClose(); openPortal(); }} className="font-semibold underline underline-offset-2">
                    Fix payment
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          className="bg-card border border-border/60 overflow-hidden divide-y divide-border/40"
          style={{ borderRadius: 'var(--radius)' }}
        >
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
