import { useState, useEffect, useRef } from 'react';
import { useFlagContext } from '@/contexts/FlagContext';
import { Plus, Trash2, ChevronDown, ChevronUp, Crown, ChevronRight, Star, Mail, Check, Loader2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { useRO } from '@/contexts/ROContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
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
import { AccountSheet } from '@/components/settings/AccountSheet';
import type { SaveSettingResult } from '@/hooks/useUserSettings';

type GoalSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function SettingsTab() {
  const { settings, updateSettings, updatePresets, updateAdvisors, clearAllROs, ros } = useRO();
  const { user, signOut } = useAuth();
  const { userSettings, updateUserSetting, userSettingsLoaded } = useFlagContext();
  const syncedSettings = userSettings;
  const updateSetting = updateUserSetting;
  const { isPro, subscriptionEnd, daysUntilEnd, isNearExpiry, hasBillingIssue, openPortal } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
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
  const [settingsView, setSettingsView] = useLocalStorageState<'settings' | 'manage'>('ui.settings.view.v1', 'settings');
  const [localDailyGoal, setLocalDailyGoal] = useState('');
  const [localWeeklyGoal, setLocalWeeklyGoal] = useState('');
  const [localHourlyRate, setLocalHourlyRate] = useState('');
  const [goalSaveStatus, setGoalSaveStatus] = useState<GoalSaveStatus>('idle');
  const goalSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userSettingsLoaded) return;
    setLocalDailyGoal(syncedSettings.hoursGoalDaily > 0 ? String(syncedSettings.hoursGoalDaily) : '');
    setLocalWeeklyGoal(syncedSettings.hoursGoalWeekly > 0 ? String(syncedSettings.hoursGoalWeekly) : '');
    setLocalHourlyRate(syncedSettings.hourlyRate > 0 ? String(syncedSettings.hourlyRate) : '');
  }, [syncedSettings.hoursGoalDaily, syncedSettings.hoursGoalWeekly, syncedSettings.hourlyRate, userSettingsLoaded]);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data } = await (await import('@/integrations/supabase/client')).supabase.functions.invoke('admin-manage-overrides', {
          body: { action: 'check-admin' },
        });
        setIsAdmin(data?.isAdmin === true);
      } catch {
        setIsAdmin(false);
      }
    }
    if (user) checkAdmin();
  }, [user]);

  useEffect(() => {
    return () => {
      if (goalSavedTimerRef.current) clearTimeout(goalSavedTimerRef.current);
    };
  }, []);

  // Preset form state
  const [presetName, setPresetName] = useState('');
  const [presetLaborType, setPresetLaborType] = useState<LaborType>('customer-pay');
  const [presetHours, setPresetHours] = useState('');
  const [presetTemplate, setPresetTemplate] = useState('');

  // Advisor form state
  const [advisorName, setAdvisorName] = useState('');

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

  const handleAccountSettingSave = async (key: 'displayName' | 'shopName', value: string) => {
    const result = await updateSetting(key, value);
    // No toast here — AccountSheet handles its own inline feedback
    return result;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/60 px-4 pt-4 pb-3 space-y-3">
        <h1 className="text-xl font-bold">Settings</h1>
        <SegmentedControl
          options={[
            { value: 'settings', label: 'Settings' },
            { value: 'manage', label: 'Manage' },
          ]}
          value={settingsView}
          onChange={(v) => setSettingsView(v as 'settings' | 'manage')}
        />
      </div>

      <div className="p-4 space-y-5">
        {settingsView === 'settings' ? (
          <>
            {/* Profile Card */}
            <button
              onClick={() => setShowAccountSheet(true)}
              className="rounded-xl border border-border/60 bg-card p-3.5 w-full text-left tap-target touch-feedback"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground text-lg font-bold select-none bg-primary">
                  {avatarInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-tight truncate">
                    {syncedSettings.displayName || <span className="text-muted-foreground font-normal text-xs italic">Set your name</span>}
                  </div>
                  {syncedSettings.shopName && (
                    <div className="text-[11px] text-muted-foreground truncate">{syncedSettings.shopName}</div>
                  )}
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                    isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {isPro ? <><Crown className="h-2.5 w-2.5" /> Pro</> : 'Free'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </div>
              {isNearExpiry && daysUntilEnd !== null && (
                <div className="mt-2.5 flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
                  <Star className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong>
                  </p>
                </div>
              )}
            </button>

            {/* Appearance */}
            <SettingsGroup title="Appearance">
              <SettingsRow
                label="Dark Mode"
                toggle
                toggleValue={darkMode}
                onToggle={toggleDarkMode}
              />
              <SettingsRow
                label="Hide Hour Totals"
                description="Shows — instead of totals in the RO list"
                toggle
                toggleValue={userSettings.hideTotals}
                onToggle={(v) => updateUserSetting('hideTotals', v)}
              />
            </SettingsGroup>

            {/* General */}
            <SettingsGroup title="General">
              <SettingsRow
                label="Show Vehicle on Lines"
                description="Year/make/model shown on each RO line"
                toggle
                toggleValue={userSettings.showVehicleChips}
                onToggle={(v) => updateUserSetting('showVehicleChips', v)}
              />
              <SettingsRow
                label="Keyword Auto-Fill Hours"
                description="Matches job keywords to preset hours"
                toggle
                toggleValue={userSettings.keywordAutofill}
                onToggle={(v) => updateUserSetting('keywordAutofill', v)}
              />
              <SettingsRow
                label="Show Scan Confidence"
                description={isPro ? 'Displays match % on scanned ROs' : 'Pro only'}
                toggle
                toggleValue={userSettings.showScanConfidence}
                onToggle={(v) => updateUserSetting('showScanConfidence', v)}
                disabled={!isPro}
              />
            </SettingsGroup>

            {/* Goals & Earnings — redesigned with inline save status */}
            <SettingsGroup title="Goals & Earnings" description="Targets and earnings shown in Summary">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <GoalInput
                    label="Daily goal"
                    value={localDailyGoal}
                    onChange={setLocalDailyGoal}
                    suffix="hr"
                    placeholder="—"
                    min={0}
                    max={24}
                    step={0.5}
                  />
                  <GoalInput
                    label="Weekly goal"
                    value={localWeeklyGoal}
                    onChange={setLocalWeeklyGoal}
                    suffix="hr"
                    placeholder="—"
                    min={0}
                    max={168}
                    step={1}
                  />
                </div>
                <GoalInput
                  label="Flat rate"
                  hint="Estimates earnings in Summary"
                  value={localHourlyRate}
                  onChange={setLocalHourlyRate}
                  prefix="$"
                  suffix="/ hr"
                  placeholder="Not set"
                  min={0}
                  step={0.5}
                />

                {/* Save bar: status-aware */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <GoalSaveStatusDisplay status={goalSaveStatus} />
                  <Button
                    size="sm"
                    onClick={handleSaveGoals}
                    disabled={!goalsDirty || goalSaveStatus === 'saving'}
                    className={cn(
                      'transition-all gap-1.5',
                      goalsDirty && goalSaveStatus !== 'saving'
                        ? 'bg-primary text-primary-foreground'
                        : ''
                    )}
                  >
                    {goalSaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {goalSaveStatus === 'saving' ? 'Saving…' : goalSaveStatus === 'saved' ? 'Saved' : 'Save goals'}
                  </Button>
                </div>
              </div>
            </SettingsGroup>

            {/* Pay Period Range */}
            <PayPeriodRangeSection
              userSettings={userSettings}
              updateUserSetting={updateUserSetting}
            />

            {/* Support */}
            <SettingsGroup title="Support">
              <button
                onClick={() => {
                  window.open('mailto:support@ronavigator.com', '_blank');
                  navigator.clipboard.writeText('support@ronavigator.com');
                  toast.success('Email copied');
                }}
                className="w-full p-3.5 flex items-center gap-3 tap-target touch-feedback"
              >
                <Mail className="h-4.5 w-4.5 text-muted-foreground" />
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-medium text-sm">Contact Support</span>
                  <p className="text-[11px] text-muted-foreground">support@ronavigator.com</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </button>
            </SettingsGroup>
          </>
        ) : (
          <>
            {/* Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.14em]">Quick Presets</h3>
                <button onClick={() => openPresetEditor()} className="p-2 tap-target touch-feedback text-primary">
                  <Plus className="h-4.5 w-4.5" />
                </button>
              </div>
              <div className="space-y-1">
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
                    className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {showAllPresets
                      ? <><ChevronUp className="h-3 w-3" /> Show Less</>
                      : <><ChevronDown className="h-3 w-3" /> Show More ({settings.presets.length - 6})</>}
                  </button>
                )}
              </div>
            </div>

            {/* Advisors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.14em]">Advisors</h3>
                <button onClick={() => openAdvisorEditor()} className="p-2 tap-target touch-feedback text-primary">
                  <Plus className="h-4.5 w-4.5" />
                </button>
              </div>
              <div className="space-y-1">
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
                    className="w-full flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {showAllAdvisors
                      ? <><ChevronUp className="h-3 w-3" /> Show Less</>
                      : <><ChevronDown className="h-3 w-3" /> Show More ({settings.advisors.length - 6})</>}
                  </button>
                )}
              </div>
            </div>

            {/* Scan Templates - Pro only */}
            {isPro && <TemplatesSection />}

            {/* Data */}
            <SettingsGroup title="Data">
              <SettingsRow
                label="Download Backup (JSON)"
                description="Exports all ROs + lines as JSON"
                onClick={() => {
                  if (ros.length === 0) { toast.info('No ROs to export'); return; }
                  const exportData = ros.map(ro => ({
                    roNumber: ro.roNumber, date: ro.date, advisor: ro.advisor,
                    customerName: ro.customerName, vehicle: ro.vehicle, mileage: ro.mileage,
                    notes: ro.notes, paidDate: ro.paidDate,
                    lines: ro.lines.map(l => ({
                      lineNo: l.lineNo, description: l.description,
                      laborType: l.laborType, hoursPaid: l.hoursPaid, isTbd: l.isTbd,
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
              <div className="w-full p-3.5 flex items-center justify-between tap-target touch-feedback">
                <div>
                  <span className="font-medium text-sm text-destructive">Clear All ROs</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {ros.length} RO{ros.length !== 1 ? 's' : ''} will be deleted
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAllClick}
                  disabled={ros.length === 0}
                  className="tap-target"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </SettingsGroup>
          </>
        )}
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

      <AccountSheet
        isOpen={showAccountSheet}
        onClose={() => setShowAccountSheet(false)}
        avatarInitial={avatarInitial}
        displayName={syncedSettings.displayName}
        shopName={syncedSettings.shopName}
        email={user?.email}
        isPro={isPro}
        subscriptionEnd={subscriptionEnd}
        daysUntilEnd={daysUntilEnd}
        isNearExpiry={isNearExpiry}
        hasBillingIssue={hasBillingIssue}
        isAdmin={isAdmin}
        updateSetting={handleAccountSettingSave}
        openPortal={openPortal}
        setShowUpgradeDialog={setShowUpgradeDialog}
        signOut={signOut}
      />
    </div>
  );
}

// ── Goal Input ──
function GoalInput({
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  min,
  max,
  step,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground/60">{hint}</span>}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60 pointer-events-none">{prefix}</span>
        )}
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full h-10 text-sm bg-muted/50 rounded-lg border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 tabular-nums transition-all',
            prefix ? 'pl-7 pr-10' : 'px-3 pr-10',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/50 pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ── Goal save status display ──
function GoalSaveStatusDisplay({ status }: { status: GoalSaveStatus }) {
  if (status === 'saved') {
    return (
      <span className="text-[11px] text-green-600 flex items-center gap-1 font-medium">
        <Check className="h-3 w-3" /> Goals saved
      </span>
    );
  }
  if (status === 'error') {
    return <span className="text-[11px] text-destructive font-medium">Save failed — try again</span>;
  }
  return <div />;
}
