import { useState, useEffect, useRef } from 'react';
import { useFlagContext } from '@/contexts/FlagContext';
import { Plus, Trash2, ChevronDown, ChevronUp, Crown, Star, Mail, Loader2, User, Building2, DollarSign, Target, Shield, LogOut, Bell } from 'lucide-react';
import { useGoalNotifications } from '@/hooks/useGoalNotifications';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { useRO } from '@/contexts/ROContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Preset, LaborType, Advisor } from '@/types/ro';
import { cn } from '@/lib/utils';
import { SettingsGroup } from '@/components/settings/SettingsGroup';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { PresetItem } from '@/components/settings/PresetItem';
import { AdvisorItem } from '@/components/settings/AdvisorItem';
import { TemplatesSection } from '@/components/settings/TemplatesSection';
import { PayPeriodRangeSection } from '@/components/settings/PayPeriodRangeSection';
import { PresetEditorSheet } from '@/components/settings/PresetEditorSheet';
import { AdvisorEditorSheet } from '@/components/settings/AdvisorEditorSheet';
import { ClearAllROsDialog } from '@/components/settings/ClearAllROsDialog';
import { DesktopInlineField, GoalField, GoalSaveStatusDisplay } from '@/components/settings/SettingsFields';
import type { FieldStatus, GoalSaveStatus } from '@/components/settings/SettingsFields';

const _adminCache = new Map<string, boolean>();

function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground/95">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground leading-relaxed">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsTab() {
  const { settings, updatePresets, updateAdvisors, clearAllROs, ros } = useRO();
  const { user, signOut } = useAuth();
  const { userSettings, updateUserSetting, userSettingsLoaded } = useFlagContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const syncedSettings = userSettings;
  const updateSetting = updateUserSetting;
  const { isPro, subscriptionEnd, daysUntilEnd, isNearExpiry, hasBillingIssue, openPortal } = useSubscription();
  const { permissionState: notifPermission, notificationsEnabled, toggleNotifications } = useGoalNotifications();

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [showAdvisorEditor, setShowAdvisorEditor] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [showAllAdvisors, setShowAllAdvisors] = useState(false);
  const [settingsView, setSettingsView] = useLocalStorageState<'settings' | 'profile'>('ui.settings.view.v2', 'settings');

  const [localDailyGoal, setLocalDailyGoal] = useState('');
  const [localWeeklyGoal, setLocalWeeklyGoal] = useState('');
  const [localHourlyRate, setLocalHourlyRate] = useState('');
  const [goalSaveStatus, setGoalSaveStatus] = useState<GoalSaveStatus>('idle');
  const goalSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localDisplayName, setLocalDisplayName] = useState('');
  const [localShopName, setLocalShopName] = useState('');
  const [nameStatus, setNameStatus] = useState<FieldStatus>('idle');
  const [shopStatus, setShopStatus] = useState<FieldStatus>('idle');
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userSettingsLoaded) return;
    setLocalDailyGoal(syncedSettings.hoursGoalDaily > 0 ? String(syncedSettings.hoursGoalDaily) : '');
    setLocalWeeklyGoal(syncedSettings.hoursGoalWeekly > 0 ? String(syncedSettings.hoursGoalWeekly) : '');
    setLocalHourlyRate(syncedSettings.hourlyRate > 0 ? String(syncedSettings.hourlyRate) : '');
    setLocalDisplayName(syncedSettings.displayName || '');
    setLocalShopName(syncedSettings.shopName || '');
  }, [syncedSettings.hoursGoalDaily, syncedSettings.hoursGoalWeekly, syncedSettings.hourlyRate, syncedSettings.displayName, syncedSettings.shopName, userSettingsLoaded]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;

    if (_adminCache.has(uid)) {
      setIsAdmin(_adminCache.get(uid)!);
      return;
    }

    async function checkAdmin() {
      try {
        const { data } = await (await import('@/integrations/supabase/client')).supabase.functions.invoke('admin-manage-overrides', {
          body: { action: 'check-admin' },
        });
        const result = data?.isAdmin === true;
        _adminCache.set(uid, result);
        setIsAdmin(result);
      } catch {
        _adminCache.set(uid, false);
        setIsAdmin(false);
      }
    }

    checkAdmin();
  }, [user]);

  useEffect(() => {
    return () => {
      const goalTimer = goalSavedTimerRef.current;
      const nameTimer = nameTimerRef.current;
      const shopTimer = shopTimerRef.current;
      if (goalTimer) clearTimeout(goalTimer);
      if (nameTimer) clearTimeout(nameTimer);
      if (shopTimer) clearTimeout(shopTimer);
    };
  }, []);

  const openPresetEditor = (preset?: Preset) => {
    if (preset) {
      setEditingPreset(preset);
      setPresetName(preset.name);
      setPresetLaborType(preset.laborType);
      setPresetHours(preset.defaultHours?.toString() || '');
      setPresetTemplate(preset.workTemplate || '');
    } else {
      setEditingPreset(null);
      setPresetName('');
      setPresetLaborType('customer-pay');
      setPresetHours('');
      setPresetTemplate('');
    }
    setShowPresetEditor(true);
  };

  const savePreset = () => {
    const trimmedName = presetName.trim();
    if (!trimmedName) return;

    const isDuplicate = settings.presets.some(
      p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== editingPreset?.id
    );
    if (isDuplicate) {
      toast.error(`A preset named "${trimmedName}" already exists`);
      return;
    }

    const newPreset: Preset = {
      id: editingPreset?.id || Date.now().toString(),
      name: trimmedName,
      laborType: presetLaborType,
      defaultHours: presetHours ? parseFloat(presetHours) : undefined,
      workTemplate: presetTemplate || undefined,
      isFavorite: editingPreset?.isFavorite,
    };

    if (editingPreset) {
      updatePresets(settings.presets.map(p => p.id === editingPreset.id ? newPreset : p));
    } else {
      updatePresets([...settings.presets, newPreset]);
    }

    setShowPresetEditor(false);
  };

  const deletePreset = (id: string) => {
    updatePresets(settings.presets.filter(p => p.id !== id));
  };

  const openAdvisorEditor = (advisor?: Advisor) => {
    if (advisor) {
      setEditingAdvisor(advisor);
      setAdvisorName(advisor.name);
    } else {
      setEditingAdvisor(null);
      setAdvisorName('');
    }
    setShowAdvisorEditor(true);
  };

  const saveAdvisor = () => {
    const trimmedName = advisorName.trim();
    if (!trimmedName) return;

    const isDuplicate = settings.advisors.some(
      a => a.name.toLowerCase() === trimmedName.toLowerCase() && a.id !== editingAdvisor?.id
    );
    if (isDuplicate) {
      toast.error(`An advisor named "${trimmedName}" already exists`);
      return;
    }

    const newAdvisor: Advisor = {
      id: editingAdvisor?.id || Date.now().toString(),
      name: trimmedName,
    };

    if (editingAdvisor) {
      updateAdvisors(settings.advisors.map(a => a.id === editingAdvisor.id ? newAdvisor : a));
    } else {
      updateAdvisors([...settings.advisors, newAdvisor]);
    }

    setShowAdvisorEditor(false);
  };

  const deleteAdvisor = (id: string) => {
    updateAdvisors(settings.advisors.filter(a => a.id !== id));
  };

  const toggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    localStorage.setItem('ro-tracker-theme', enabled ? 'dark' : 'light');
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const blueHsl = enabled ? '214 90% 65%' : '214 95% 53%';
    document.documentElement.style.setProperty('--primary', blueHsl);
    document.documentElement.style.setProperty('--ring', blueHsl);
  };

  const handleClearAllClick = () => {
    setConfirmText('');
    setShowClearAllDialog(true);
  };

  const handleFirstConfirm = () => {
    if (confirmText.toUpperCase() === 'DELETE') {
      setShowClearAllDialog(false);
      setShowFinalConfirm(true);
    }
  };

  const handleFinalConfirm = () => {
    clearAllROs();
    setShowFinalConfirm(false);
    setConfirmText('');
    toast.success('All ROs have been deleted');
  };

  const avatarInitial = (syncedSettings.displayName || user?.email || '?').charAt(0).toUpperCase();

  const parseNonNegative = (value: string) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const dailyGoalValue = parseNonNegative(localDailyGoal);
  const weeklyGoalValue = parseNonNegative(localWeeklyGoal);
  const hourlyRateValue = parseNonNegative(localHourlyRate);
  const goalsDirty =
    dailyGoalValue !== syncedSettings.hoursGoalDaily
    || weeklyGoalValue !== syncedSettings.hoursGoalWeekly
    || hourlyRateValue !== syncedSettings.hourlyRate;

  const handleSaveGoals = async () => {
    setGoalSaveStatus('saving');

    const results = await Promise.all([
      updateSetting('hoursGoalDaily', dailyGoalValue),
      updateSetting('hoursGoalWeekly', weeklyGoalValue),
      updateSetting('hourlyRate', hourlyRateValue),
    ]);

    const allSucceeded = results.every(r => r.status !== 'failed');
    if (allSucceeded) {
      setGoalSaveStatus('saved');
      if (goalSavedTimerRef.current) clearTimeout(goalSavedTimerRef.current);
      goalSavedTimerRef.current = setTimeout(() => setGoalSaveStatus('idle'), 2500);
    } else {
      setGoalSaveStatus('error');
    }
  };

  const handleInlineSave = async (field: 'displayName' | 'shopName', value: string) => {
    const setStatus = field === 'displayName' ? setNameStatus : setShopStatus;
    const timerRef = field === 'displayName' ? nameTimerRef : shopTimerRef;
    setStatus('saving');
    const result = await updateSetting(field, value);
    if (result.status === 'failed') {
      setStatus('error');
      return;
    }
    setStatus('saved');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus('idle'), 2500);
  };

  const handleInlineBlur = (field: 'displayName' | 'shopName') => {
    const value = field === 'displayName' ? localDisplayName.trim() : localShopName.trim();
    const original = field === 'displayName' ? syncedSettings.displayName : syncedSettings.shopName;
    if (value !== (original || '')) {
      handleInlineSave(field, value);
    }
  };

  const [presetName, setPresetName] = useState('');
  const [presetLaborType, setPresetLaborType] = useState<LaborType>('customer-pay');
  const [presetHours, setPresetHours] = useState('');
  const [presetTemplate, setPresetTemplate] = useState('');
  const [advisorName, setAdvisorName] = useState('');

  const renderManagement = () => (
    <SettingsSection
      title="Management"
      description="Manage quick-fill data for faster RO entry and scan review."
    >
      <SettingsGroup title="Presets">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{settings.presets.length} saved presets</p>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openPresetEditor()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Preset
          </Button>
        </div>
        <div className="px-2 pb-2 space-y-1">
          {(showAllPresets ? settings.presets : settings.presets.slice(0, 6)).map((preset) => (
            <PresetItem
              key={preset.id}
              preset={preset}
              onEdit={() => openPresetEditor(preset)}
              onDelete={() => deletePreset(preset.id)}
              onToggleFavorite={() => {
                updatePresets(settings.presets.map(p =>
                  p.id === preset.id ? { ...p, isFavorite: !p.isFavorite } : p
                ));
              }}
            />
          ))}
          {settings.presets.length > 6 && (
            <button
              onClick={() => setShowAllPresets(v => !v)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {showAllPresets
                ? <><ChevronUp className="h-3 w-3" /> Show Less</>
                : <><ChevronDown className="h-3 w-3" /> Show More ({settings.presets.length - 6})</>}
            </button>
          )}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Advisors">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{settings.advisors.length} active advisors</p>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openAdvisorEditor()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Advisor
          </Button>
        </div>
        <div className="px-2 pb-2 space-y-1">
          {(showAllAdvisors ? settings.advisors : settings.advisors.slice(0, 6)).map((advisor) => (
            <AdvisorItem
              key={advisor.id}
              advisor={advisor}
              onEdit={() => openAdvisorEditor(advisor)}
              onDelete={() => deleteAdvisor(advisor.id)}
            />
          ))}
          {settings.advisors.length > 6 && (
            <button
              onClick={() => setShowAllAdvisors(v => !v)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {showAllAdvisors
                ? <><ChevronUp className="h-3 w-3" /> Show Less</>
                : <><ChevronDown className="h-3 w-3" /> Show More ({settings.advisors.length - 6})</>}
            </button>
          )}
        </div>
      </SettingsGroup>

      {isPro && <TemplatesSection />}
    </SettingsSection>
  );

  const renderSettings = () => (
    <div className="space-y-8">
      <SettingsSection
        title="Display & Workflow"
        description="Control appearance and repair-order behavior across desktop and mobile."
      >
        <SettingsGroup title="Display">
          <SettingsRow label="Dark mode" toggle toggleValue={darkMode} onToggle={toggleDarkMode} />
          <SettingsRow
            label="Hide hour totals"
            description="Shows — instead of totals"
            toggle
            toggleValue={userSettings.hideTotals}
            onToggle={(v) => updateUserSetting('hideTotals', v)}
          />
        </SettingsGroup>

        <SettingsGroup title="RO behavior">
          <SettingsRow
            label="Vehicle on lines"
            description="Show year/make/model on each line"
            toggle
            toggleValue={userSettings.showVehicleChips}
            onToggle={(v) => updateUserSetting('showVehicleChips', v)}
          />
          <SettingsRow
            label="Keyword auto-fill"
            description="Match job keywords to preset hours"
            toggle
            toggleValue={userSettings.keywordAutofill}
            onToggle={(v) => updateUserSetting('keywordAutofill', v)}
          />
          <SettingsRow
            label="Scan confidence"
            description={isPro ? 'Show match % on scanned ROs' : 'Pro only'}
            toggle
            toggleValue={userSettings.showScanConfidence}
            onToggle={(v) => updateUserSetting('showScanConfidence', v)}
            disabled={!isPro}
          />
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection
        title="Goals & Pay Period"
        description="Keep targets and pay-period boundaries aligned with summary calculations."
      >
        <SettingsGroup title="Goals & earnings">
          <div className="px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <GoalField
                icon={<Target className="h-3 w-3 text-muted-foreground/50" />}
                label="Daily"
                value={localDailyGoal}
                onChange={setLocalDailyGoal}
                suffix="hr"
                placeholder="—"
                min={0}
                max={24}
                step={0.5}
              />
              <GoalField
                icon={<Target className="h-3 w-3 text-muted-foreground/50" />}
                label="Weekly"
                value={localWeeklyGoal}
                onChange={setLocalWeeklyGoal}
                suffix="hr"
                placeholder="—"
                min={0}
                max={168}
                step={1}
              />
            </div>
            <GoalField
              icon={<DollarSign className="h-3 w-3 text-muted-foreground/50" />}
              label="Flat rate"
              value={localHourlyRate}
              onChange={setLocalHourlyRate}
              prefix="$"
              suffix="/ hr"
              placeholder="Not set"
              min={0}
              step={0.5}
            />
          </div>
          <div className="border-t border-border/40 px-4 py-2 flex items-center justify-between">
            <GoalSaveStatusDisplay status={goalSaveStatus} />
            <Button
              size="sm"
              variant={goalsDirty ? 'default' : 'ghost'}
              onClick={handleSaveGoals}
              disabled={!goalsDirty || goalSaveStatus === 'saving'}
              className="h-8 text-xs gap-1.5"
            >
              {goalSaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
              {goalSaveStatus === 'saving' ? 'Saving…' : goalSaveStatus === 'saved' ? 'Saved' : 'Save Goals'}
            </Button>
          </div>
        </SettingsGroup>

        {notifPermission !== 'unsupported' && (
          <SettingsGroup title="Reminders">
            <SettingsRow
              label="Goal reminders"
              description={
                notifPermission === 'denied'
                  ? 'Notifications are blocked — enable them in browser settings.'
                  : 'Get notified when you are behind on hours or when a period closes.'
              }
              toggle
              toggleValue={notificationsEnabled}
              onToggle={toggleNotifications}
              disabled={notifPermission === 'denied'}
              icon={<Bell className="h-4 w-4" />}
            />
          </SettingsGroup>
        )}

        <PayPeriodRangeSection
          userSettings={userSettings}
          updateUserSetting={updateUserSetting}
        />
      </SettingsSection>

      {renderManagement()}

      <SettingsSection
        title="Data & Support"
        description="Back up your data, manage resets safely, and reach support quickly."
      >
        <SettingsGroup title="Backup">
          <SettingsRow
            label="Download backup"
            description="Export all repair orders as a JSON backup file"
            onClick={() => {
              if (ros.length === 0) { toast.info('No ROs to export'); return; }
              const exportData = ros.map(ro => ({
                roNumber: ro.roNumber, date: ro.date, advisor: ro.advisor,
                customerName: ro.customerName, vehicle: ro.vehicle, mileage: ro.mileage,
                notes: ro.notes, paidDate: ro.paidDate,
                lines: ro.lines.map(l => ({
                  lineNo: l.lineNo, description: l.description,
                  laborType: l.laborType, hoursPaid: l.hoursPaid,
                })),
              }));
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ro-navigator-export-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${ros.length} ROs`);
            }}
          />
        </SettingsGroup>

        <SettingsGroup title="Danger zone">
          <div className="w-full px-4 py-3.5 flex items-center justify-between bg-destructive/[0.04]">
            <div>
              <span className="text-sm font-medium text-destructive">Clear all repair orders</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently deletes {ros.length} RO{ros.length !== 1 ? 's' : ''} from this workspace
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllClick}
              disabled={ros.length === 0}
              className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Help & version">
          <button
            onClick={() => {
              window.open('mailto:support@ronavigator.com', '_blank');
              navigator.clipboard.writeText('support@ronavigator.com');
              toast.success('Email copied');
            }}
            className="w-full px-4 py-3 flex items-center gap-3 tap-target active:bg-muted/40 transition-colors"
          >
            <Mail className="h-4 w-4 text-muted-foreground/60" />
            <div className="flex-1 min-w-0 text-left">
              <span className="text-sm font-medium">Contact support</span>
              <p className="text-xs text-muted-foreground">support@ronavigator.com</p>
            </div>
          </button>
          <div className="px-4 py-3 border-t border-border/40">
            <p className="text-sm font-medium">RO Navigator</p>
            <p className="text-xs text-muted-foreground">Product settings and profile are now separated for clearer management.</p>
          </div>
        </SettingsGroup>
      </SettingsSection>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-8">
      <SettingsSection
        title="Profile"
        description="Manage your identity, subscription status, and account access."
      >
        <SettingsGroup title="Account overview">
          <div className="px-4 py-4 flex items-start gap-3">
            <div className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground text-sm font-bold select-none bg-primary">
              {avatarInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{syncedSettings.displayName || 'Set your name'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">{syncedSettings.shopName || 'Set your shop name'}</p>
            </div>
            <span className={cn(
              'px-2.5 py-1 rounded-md text-[10px] font-bold',
              isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/60'
            )}>
              {isPro ? 'PRO' : 'FREE'}
            </span>
          </div>

          {(isNearExpiry && daysUntilEnd !== null) && (
            <div className="mx-4 mb-3 flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-md px-3 py-2">
              <Star className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
                Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong>
              </p>
            </div>
          )}

          {hasBillingIssue && (
            <div className="mx-4 mb-3 text-xs text-destructive bg-destructive/10 border border-destructive/25 rounded-md px-3 py-2">
              Billing issue detected. Please review your subscription details.
            </div>
          )}

          <div className="border-t border-border/40 px-4 py-4 space-y-3.5">
            <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
              <DesktopInlineField
                icon={<User className="h-3.5 w-3.5" />}
                label="Your name"
                value={localDisplayName}
                onChange={setLocalDisplayName}
                onBlur={() => handleInlineBlur('displayName')}
                onSave={() => handleInlineSave('displayName', localDisplayName.trim())}
                status={nameStatus}
                isDirty={localDisplayName.trim() !== (syncedSettings.displayName || '')}
                placeholder="e.g. Mike"
              />
              <DesktopInlineField
                icon={<Building2 className="h-3.5 w-3.5" />}
                label="Shop name"
                value={localShopName}
                onChange={setLocalShopName}
                onBlur={() => handleInlineBlur('shopName')}
                onSave={() => handleInlineSave('shopName', localShopName.trim())}
                status={shopStatus}
                isDirty={localShopName.trim() !== (syncedSettings.shopName || '')}
                placeholder="e.g. Smith's Auto"
              />
            </div>

            <div className="rounded-md border border-border/50 px-3 py-2.5 bg-muted/[0.25]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-0.5">Email address</p>
              <p className="text-sm">{user?.email || 'No email available'}</p>
            </div>

            <div className="space-y-2.5 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">Account actions</p>
              <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={isPro ? 'outline' : 'default'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  if (isPro) openPortal();
                  else setShowUpgradeDialog(true);
                }}
              >
                <Crown className="h-3.5 w-3.5 mr-1" />
                {isPro ? 'Manage subscription' : 'Upgrade to Pro'}
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => navigate('/admin')}
                >
                  <Shield className="h-3.5 w-3.5 mr-1" />
                  Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Sign out
              </Button>
              </div>
            </div>
          </div>
        </SettingsGroup>
      </SettingsSection>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gradient-to-b from-background via-background to-muted/20">
      <div className={cn('panel-header border-b border-border/40 bg-background/90 backdrop-blur', isMobile ? 'px-4 pt-4 pb-3' : 'px-5 pt-4 pb-3')}>
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight">Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Professional, organized controls for your workspace and account.</p>
          </div>
          <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-1">
            {[
              { value: 'settings', label: 'Settings' },
              { value: 'profile', label: 'Profile' },
            ].map((tab) => {
              const active = settingsView === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setSettingsView(tab.value as 'settings' | 'profile')}
                  className={cn(
                    'h-8 px-4 rounded-md text-xs font-semibold transition-all',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={cn('max-w-5xl mx-auto w-full', isMobile ? 'p-4 pb-32' : 'p-6')}>
        {settingsView === 'settings' ? renderSettings() : renderProfile()}
      </div>

      <PresetEditorSheet
        isOpen={showPresetEditor}
        onClose={() => setShowPresetEditor(false)}
        editingPreset={editingPreset}
        presetName={presetName}
        setPresetName={setPresetName}
        presetLaborType={presetLaborType}
        setPresetLaborType={setPresetLaborType}
        presetHours={presetHours}
        setPresetHours={setPresetHours}
        presetTemplate={presetTemplate}
        setPresetTemplate={setPresetTemplate}
        onSave={savePreset}
      />

      <AdvisorEditorSheet
        isOpen={showAdvisorEditor}
        onClose={() => setShowAdvisorEditor(false)}
        editingAdvisor={editingAdvisor}
        advisorName={advisorName}
        setAdvisorName={setAdvisorName}
        onSave={saveAdvisor}
      />

      <ClearAllROsDialog
        roCount={ros.length}
        showStep1={showClearAllDialog}
        onCloseStep1={() => setShowClearAllDialog(false)}
        confirmText={confirmText}
        setConfirmText={setConfirmText}
        onFirstConfirm={handleFirstConfirm}
        showStep2={showFinalConfirm}
        onCloseStep2={() => setShowFinalConfirm(false)}
        onFinalConfirm={handleFinalConfirm}
      />

      <ProUpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
    </div>
  );
}
