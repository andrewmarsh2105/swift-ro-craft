import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, ChevronRight, LogOut, Shield, Star, Loader2 } from 'lucide-react';
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

type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  const [nameStatus, setNameStatus] = useState<FieldStatus>('idle');
  const [shopStatus, setShopStatus] = useState<FieldStatus>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalDisplayName(displayName);
      setLocalShopName(shopName);
      setNameStatus('idle');
      setShopStatus('idle');
    }
  }, [isOpen, displayName, shopName]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (shopTimerRef.current) clearTimeout(shopTimerRef.current);
    };
  }, []);

  const handleSave = useCallback(async (field: 'displayName' | 'shopName', value: string) => {
    const setStatus = field === 'displayName' ? setNameStatus : setShopStatus;
    const timerRef = field === 'displayName' ? savedTimerRef : shopTimerRef;

    setStatus('saving');
    const result = await updateSetting(field, value);

    if (result.status === 'failed') {
      setStatus('error');
      return;
    }

    setStatus('saved');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus('idle'), 2500);
  }, [updateSetting]);

  // Auto-save on blur when dirty
  const handleBlur = useCallback((field: 'displayName' | 'shopName') => {
    const value = field === 'displayName' ? localDisplayName.trim() : localShopName.trim();
    const original = field === 'displayName' ? displayName : shopName;
    if (value !== original) {
      handleSave(field, value);
    }
  }, [localDisplayName, localShopName, displayName, shopName, handleSave]);

  const displayNameDirty = localDisplayName.trim() !== displayName;
  const shopNameDirty = localShopName.trim() !== shopName;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Account">
      <div className="p-4 space-y-4">

        {/* Avatar + email header */}
        <div className="flex items-center gap-3.5">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground text-xl font-bold select-none bg-primary"
          >
            {avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">
              {displayName || <span className="text-muted-foreground font-normal italic text-sm">No name set</span>}
            </div>
            <div className="text-sm text-muted-foreground truncate">{email}</div>
          </div>
        </div>

        {/* Profile fields */}
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.14em] px-0.5">Profile</h4>
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <ProfileField
              label="Your name"
              hint="Shown in the app header"
              value={localDisplayName}
              onChange={setLocalDisplayName}
              onBlur={() => handleBlur('displayName')}
              onSave={() => handleSave('displayName', localDisplayName.trim())}
              isDirty={displayNameDirty}
              status={nameStatus}
              placeholder="e.g. Mike"
            />
            <ProfileField
              label="Shop name"
              hint="Replaces 'Repair Orders' as page title"
              value={localShopName}
              onChange={setLocalShopName}
              onBlur={() => handleBlur('shopName')}
              onSave={() => handleSave('shopName', localShopName.trim())}
              isDirty={shopNameDirty}
              status={shopStatus}
              placeholder="e.g. Smith's Auto"
            />
          </div>
        </div>

        {/* Plan */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <button
            onClick={() => {
              onClose();
              if (isPro) {
                openPortal();
              } else {
                setShowUpgradeDialog(true);
              }
            }}
            className="w-full p-3.5 flex items-center justify-between tap-target touch-feedback"
          >
            <span className="font-medium text-sm">Plan</span>
            <div className="flex items-center gap-2">
              <span className={cn('text-sm', isPro ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {isPro ? 'Pro' : 'Free'}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
          {subscriptionEnd && isPro && !isNearExpiry && (
            <div className="px-4 pb-3 -mt-1">
              <p className="text-[11px] text-muted-foreground">Renews {new Date(subscriptionEnd).toLocaleDateString()}</p>
            </div>
          )}
          {isNearExpiry && daysUntilEnd !== null && (
            <div className="mx-3.5 mb-3 flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
              <Star className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-snug">
                Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong> — add a payment method to keep Pro.
              </p>
            </div>
          )}
          {hasBillingIssue && (
            <div className="mx-3.5 mb-3 flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 leading-snug">
                We couldn't renew your subscription.{' '}
                <button onClick={() => { onClose(); openPortal(); }} className="font-semibold underline underline-offset-2">
                  Fix payment
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Admin + Sign out */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {isAdmin && (
            <button
              onClick={() => { onClose(); navigate('/admin'); }}
              className="w-full p-3.5 flex items-center gap-3 tap-target touch-feedback text-primary border-b border-border/40"
            >
              <Shield className="h-4.5 w-4.5" />
              <span className="font-medium text-sm">Admin Panel</span>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </button>
          )}
          <button
            onClick={signOut}
            className="w-full p-3.5 flex items-center gap-3 tap-target touch-feedback text-destructive"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ── Inline profile field with auto-save on blur ──
function ProfileField({
  label,
  hint,
  value,
  onChange,
  onBlur,
  onSave,
  isDirty,
  status,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onSave: () => void;
  isDirty: boolean;
  status: FieldStatus;
  placeholder: string;
}) {
  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between min-h-[18px]">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        <FieldStatusIndicator status={status} isDirty={isDirty} onSave={onSave} />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSave(); (e.target as HTMLInputElement).blur(); } }}
        placeholder={placeholder}
        className={cn(
          'w-full h-10 px-3 text-sm bg-muted/50 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all',
          isDirty ? 'border-primary/40' : 'border-border/50',
          status === 'error' && 'border-destructive/50 ring-1 ring-destructive/20',
        )}
      />
      <p className="text-[10px] text-muted-foreground/60">{hint}</p>
      {status === 'error' && <p className="text-[11px] text-destructive">Failed to save. Tap to retry or try again later.</p>}
    </div>
  );
}

function FieldStatusIndicator({ status, isDirty, onSave }: { status: FieldStatus; isDirty: boolean; onSave: () => void }) {
  if (status === 'saving') {
    return (
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="text-[10px] text-green-600 flex items-center gap-1 font-medium">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (status === 'error') {
    return (
      <button onClick={onSave} className="text-[10px] text-destructive font-semibold">
        Retry
      </button>
    );
  }
  if (isDirty) {
    return (
      <span className="text-[10px] text-primary/60 font-medium">Unsaved</span>
    );
  }
  return null;
}
