import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, LogOut, Shield, Star, Check } from 'lucide-react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { cn } from '@/lib/utils';

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  avatarInitial: string;
  displayName: string;
  shopName: string;
  email: string | undefined;
  isPro: boolean;
  subscriptionEnd: string | null | undefined;
  daysUntilEnd: number | null;
  isNearExpiry: boolean;
  hasBillingIssue: boolean;
  isAdmin: boolean;
  updateSetting: (key: string, value: unknown) => void;
  openPortal: () => void;
  setShowUpgradeDialog: (v: boolean) => void;
  signOut: () => void;
}

export function AccountSheet({
  isOpen,
  onClose,
  avatarInitial,
  displayName,
  shopName,
  email,
  isPro,
  subscriptionEnd,
  daysUntilEnd,
  isNearExpiry,
  hasBillingIssue,
  isAdmin,
  updateSetting,
  openPortal,
  setShowUpgradeDialog,
  signOut,
}: AccountSheetProps) {
  const navigate = useNavigate();
  const [localDisplayName, setLocalDisplayName] = useState(displayName);
  const [localShopName, setLocalShopName] = useState(shopName);
  const initializedRef = useRef(false);

  // Sync local state when the sheet opens
  useEffect(() => {
    if (isOpen) {
      if (!initializedRef.current) {
        setLocalDisplayName(displayName);
        setLocalShopName(shopName);
        initializedRef.current = true;
      }
    } else {
      initializedRef.current = false;
    }
  }, [isOpen, displayName, shopName]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Account">
      <div className="p-4 space-y-6">
        {/* Avatar + email */}
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold select-none"
            style={{ backgroundColor: 'hsl(214 95% 53%)' }}
          >
            {avatarInitial}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {displayName || <span className="text-muted-foreground font-normal italic text-sm">No name set</span>}
            </div>
            <div className="text-sm text-muted-foreground truncate">{email}</div>
          </div>
        </div>

        {/* Name fields */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="shrink-0">
              <span className="font-medium text-sm">Your name</span>
              <p className="text-xs text-muted-foreground">Shown in the app header</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={localDisplayName}
                onChange={e => setLocalDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && updateSetting('displayName', localDisplayName.trim())}
                placeholder="e.g. Mike"
                className="w-32 h-10 px-3 text-sm bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => updateSetting('displayName', localDisplayName.trim())}
                className={cn(
                  'h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors',
                  localDisplayName.trim() !== displayName
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
                aria-label="Save name"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="shrink-0">
              <span className="font-medium text-sm">Shop name</span>
              <p className="text-xs text-muted-foreground">Replaces "Repair Orders" title</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={localShopName}
                onChange={e => setLocalShopName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && updateSetting('shopName', localShopName.trim())}
                placeholder="e.g. Smith's Auto"
                className="w-32 h-10 px-3 text-sm bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => updateSetting('shopName', localShopName.trim())}
                className={cn(
                  'h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors',
                  localShopName.trim() !== shopName
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
                aria-label="Save shop name"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="card-mobile overflow-hidden">
          <button
            onClick={() => {
              onClose();
              if (isPro) {
                openPortal();
              } else {
                setShowUpgradeDialog(true);
              }
            }}
            className="w-full p-4 flex items-center justify-between tap-target touch-feedback"
          >
            <span className="font-medium">Plan</span>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm', isPro ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {isPro ? 'Pro' : 'Free'}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
          {subscriptionEnd && isPro && !isNearExpiry && (
            <div className="px-4 pb-3 -mt-1">
              <p className="text-xs text-muted-foreground">Renews {new Date(subscriptionEnd).toLocaleDateString()}</p>
            </div>
          )}
          {isNearExpiry && daysUntilEnd !== null && (
            <div className="mx-4 mb-3 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
              <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-snug">
                Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong> — add a payment method to keep Pro access.
              </p>
            </div>
          )}
          {hasBillingIssue && (
            <div className="mx-4 mb-3 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400 leading-snug">
                We couldn't renew your Pro subscription. Open billing to update payment details.
              </p>
            </div>
          )}
        </div>

        {/* Admin + Sign out */}
        <div className="card-mobile overflow-hidden">
          {isAdmin && (
            <button
              onClick={() => { onClose(); navigate('/admin'); }}
              className="w-full p-4 flex items-center gap-3 tap-target touch-feedback text-primary border-b border-border"
            >
              <Shield className="h-5 w-5" />
              <span className="font-medium">Admin Panel</span>
              <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
            </button>
          )}
          <button
            onClick={signOut}
            className="w-full p-4 flex items-center gap-3 tap-target touch-feedback text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
