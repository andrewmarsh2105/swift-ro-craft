import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, ChevronRight, LogOut, Shield, Star } from 'lucide-react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { cn } from '@/lib/utils';
import type { SaveSettingResult } from '@/hooks/useUserSettings';

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
  updateSetting: (key: 'displayName' | 'shopName', value: string) => Promise<SaveSettingResult>;
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
  const [savedField, setSavedField] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [isSavingField, setIsSavingField] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalDisplayName(displayName);
      setLocalShopName(shopName);
      setSavedField(null);
      setErrorField(null);
      setIsSavingField(null);
      return;
    }

    setSavedField(null);
    setErrorField(null);
    setIsSavingField(null);
  }, [isOpen, displayName, shopName]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleSave = async (field: 'displayName' | 'shopName', value: string) => {
    setIsSavingField(field);
    setErrorField(null);
    const result = await updateSetting(field, value);
    setIsSavingField(null);

    if (result.status === 'failed') {
      setErrorField(field);
      return;
    }

    setSavedField(field);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedField(null), 2000);
  };

  const displayNameDirty = localDisplayName.trim() !== displayName;
  const shopNameDirty = localShopName.trim() !== shopName;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Account">
      <div className="p-4 space-y-5">

        {/* Avatar + email header */}
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

        {/* Profile fields — stacked, full-width */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground/70 uppercase tracking-wider px-1">Profile</h4>
          <div className="card-mobile divide-y divide-border/80 border border-border/90 bg-gradient-to-b from-card to-secondary/35 overflow-hidden">

            {/* Your name */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between min-h-[20px]">
                <label className="text-sm font-medium">Your name</label>
                {savedField === 'displayName' ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                ) : displayNameDirty ? (
                  <button
                    onClick={() => handleSave('displayName', localDisplayName.trim())}
                    disabled={isSavingField === 'displayName'}
                    className="text-xs font-semibold text-primary disabled:opacity-50"
                  >
                    {isSavingField === 'displayName' ? 'Saving…' : 'Save'}
                  </button>
                ) : null}
              </div>
              <input
                type="text"
                value={localDisplayName}
                onChange={e => setLocalDisplayName(e.target.value)}
                placeholder="e.g. Mike"
                className={cn(
                  'w-full h-11 px-3 text-sm bg-muted rounded-lg border focus:outline-none focus:ring-2 focus:ring-ring',
                  displayNameDirty ? 'border-primary/50' : 'border-input'
                )}
              />
              <p className="text-xs text-muted-foreground">Shown in the app header</p>
              {errorField === 'displayName' && <p className="text-xs text-destructive">Failed to save. Please try again.</p>}
            </div>

            {/* Shop name */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between min-h-[20px]">
                <label className="text-sm font-medium">Shop name</label>
                {savedField === 'shopName' ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                ) : shopNameDirty ? (
                  <button
                    onClick={() => handleSave('shopName', localShopName.trim())}
                    disabled={isSavingField === 'shopName'}
                    className="text-xs font-semibold text-primary disabled:opacity-50"
                  >
                    {isSavingField === 'shopName' ? 'Saving…' : 'Save'}
                  </button>
                ) : null}
              </div>
              <input
                type="text"
                value={localShopName}
                onChange={e => setLocalShopName(e.target.value)}
                placeholder="e.g. Smith's Auto"
                className={cn(
                  'w-full h-11 px-3 text-sm bg-muted rounded-lg border focus:outline-none focus:ring-2 focus:ring-ring',
                  shopNameDirty ? 'border-primary/50' : 'border-input'
                )}
              />
              <p className="text-xs text-muted-foreground">Replaces "Repair Orders" as the page title</p>
              {errorField === 'shopName' && <p className="text-xs text-destructive">Failed to save. Please try again.</p>}
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
