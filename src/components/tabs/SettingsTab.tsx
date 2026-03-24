import { useState, useEffect, useRef } from 'react';
import { useFlagContext } from '@/contexts/FlagContext';
import { Plus, Trash2, ChevronDown, ChevronUp, Crown, ChevronRight, Star, Mail } from 'lucide-react';
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

export function SettingsTab() {
  const { settings, updateSettings, updatePresets, updateAdvisors, clearAllROs, ros } = useRO();
  const { user, signOut } = useAuth();
  // Single shared source of truth — all reads/writes go through FlagContext's one useUserSettings instance
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
  const [localDailyGoal, setLocalDailyGoal] = useState(syncedSettings.hoursGoalDaily > 0 ? String(syncedSettings.hoursGoalDaily) : '');
  const [localWeeklyGoal, setLocalWeeklyGoal] = useState(syncedSettings.hoursGoalWeekly > 0 ? String(syncedSettings.hoursGoalWeekly) : '');
  const [localHourlyRate, setLocalHourlyRate] = useState(syncedSettings.hourlyRate > 0 ? String(syncedSettings.hourlyRate) : '');
  // Sync local draft state from DB exactly once per load cycle, when
  // userSettingsLoaded transitions false→true. React 18 batches the setSettings +
  // setLoaded calls inside fetchSettings, so syncedSettings already holds the
  // fetched values by the time this effect runs. We intentionally omit the
  // individual field deps: subsequent optimistic updates change syncedSettings but
  // must NOT overwrite the user's in-progress typing in other fields.
  const hasInitialSyncedRef = useRef(false);
  useEffect(() => {
    if (!userSettingsLoaded) {
      hasInitialSyncedRef.current = false;
      return;
    }
    if (hasInitialSyncedRef.current) return;
    hasInitialSyncedRef.current = true;
    setLocalDailyGoal(syncedSettings.hoursGoalDaily > 0 ? String(syncedSettings.hoursGoalDaily) : '');
    setLocalWeeklyGoal(syncedSettings.hoursGoalWeekly > 0 ? String(syncedSettings.hoursGoalWeekly) : '');
    setLocalHourlyRate(syncedSettings.hourlyRate > 0 ? String(syncedSettings.hourlyRate) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettingsLoaded]);

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

  // Reorder removed to prevent duplication bugs

  // Advisor management
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

  // Advisor reorder removed

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

  // Derived display values for settings rows
  const avatarInitial = (syncedSettings.displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32 bg-accent/[0.14]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-card via-card to-accent/35 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border/90 space-y-3 shadow-[var(--shadow-sm)]">
        <h1 className="text-2xl font-bold">Settings</h1>
        <SegmentedControl
          options={[
            { value: 'settings', label: 'Settings' },
            { value: 'manage', label: 'Manage' },
          ]}
          value={settingsView}
          onChange={(v) => setSettingsView(v as 'settings' | 'manage')}
        />
      </div>

      <div className="p-4 space-y-6">
        {settingsView === 'settings' ? (
          <>
            {/* Profile Card — tappable, opens Account sheet */}
            <button
              onClick={() => setShowAccountSheet(true)}
              className="card-mobile p-4 w-full text-left tap-target touch-feedback border border-border/90 bg-gradient-to-b from-card to-secondary/30"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xl font-bold select-none"
                  style={{ backgroundColor: 'hsl(214 95% 53%)' }}
                >
                  {avatarInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base leading-tight truncate">
                    {syncedSettings.displayName || <span className="text-muted-foreground font-normal text-sm italic">Set your name</span>}
                  </div>
                  {syncedSettings.shopName && (
                    <div className="text-xs text-muted-foreground truncate">{syncedSettings.shopName}</div>
                  )}
                  <div className="text-sm text-muted-foreground truncate mt-0.5">{user?.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                      isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isPro ? <><Crown className="h-3 w-3" /> Pro</> : 'Free'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              {isNearExpiry && daysUntilEnd !== null && (
                <div className="mt-3 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                  <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-snug">
                    Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong> — add a payment method to keep Pro access.
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
                toggle
                toggleValue={userSettings.hideTotals}
                onToggle={(v) => updateUserSetting('hideTotals', v)}
              />
            </SettingsGroup>

            {/* General */}
            <SettingsGroup title="General">
              <SettingsRow
                label="Show Vehicle on Lines"
                toggle
                toggleValue={userSettings.showVehicleChips}
                onToggle={(v) => updateUserSetting('showVehicleChips', v)}
              />
              <SettingsRow
                label="Keyword Auto-Fill Hours"
                toggle
                toggleValue={userSettings.keywordAutofill}
                onToggle={(v) => updateUserSetting('keywordAutofill', v)}
              />
              <SettingsRow
                label="Show Scan Confidence"
                description={!isPro ? 'Pro only' : undefined}
                toggle
                toggleValue={userSettings.showScanConfidence}
                onToggle={(v) => updateUserSetting('showScanConfidence', v)}
                disabled={!isPro}
              />
            </SettingsGroup>

            {/* Goals & Earnings */}
            <SettingsGroup title="Goals & Earnings">
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="font-medium text-sm">Daily goal</span>
                  <p className="text-xs text-muted-foreground">Hours per day target</p>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={24}
                  step={0.5}
                  value={localDailyGoal}
                  onChange={e => setLocalDailyGoal(e.target.value)}
                  onBlur={e => updateSetting('hoursGoalDaily', parseFloat(e.target.value) || 0)}
                  placeholder="Off"
                  className="w-20 h-10 px-3 text-sm text-right bg-card rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="font-medium text-sm">Weekly goal</span>
                  <p className="text-xs text-muted-foreground">Hours per week target</p>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={168}
                  step={1}
                  value={localWeeklyGoal}
                  onChange={e => setLocalWeeklyGoal(e.target.value)}
                  onBlur={e => updateSetting('hoursGoalWeekly', parseFloat(e.target.value) || 0)}
                  placeholder="Off"
                  className="w-20 h-10 px-3 text-sm text-right bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                />
              </div>
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="font-medium text-sm">Flat rate</span>
                  <p className="text-xs text-muted-foreground">$/hr — shows earnings in Summary</p>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    value={localHourlyRate}
                    onChange={e => setLocalHourlyRate(e.target.value)}
                    onBlur={e => updateSetting('hourlyRate', parseFloat(e.target.value) || 0)}
                    placeholder="Off"
                    className="w-24 h-10 pl-7 pr-3 text-sm text-right bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                  />
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
                  toast.success('Email copied to clipboard!');
                }}
                className="w-full p-4 flex items-center gap-3 tap-target touch-feedback"
              >
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-medium">Contact Support</span>
                  <p className="text-xs text-muted-foreground">support@ronavigator.com</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </SettingsGroup>
          </>
        ) : (
          <>
            {/* Quick Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Presets</h3>
                <button onClick={() => openPresetEditor()} className="p-2 tap-target touch-feedback text-primary">
                  <Plus className="h-5 w-5" />
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
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {showAllPresets
                      ? <><ChevronUp className="h-3.5 w-3.5" /> Show Less</>
                      : <><ChevronDown className="h-3.5 w-3.5" /> Show More ({settings.presets.length - 6})</>}
                  </button>
                )}
              </div>
            </div>

            {/* Advisors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Advisors</h3>
                <button onClick={() => openAdvisorEditor()} className="p-2 tap-target touch-feedback text-primary">
                  <Plus className="h-5 w-5" />
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
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {showAllAdvisors
                      ? <><ChevronUp className="h-3.5 w-3.5" /> Show Less</>
                      : <><ChevronDown className="h-3.5 w-3.5" /> Show More ({settings.advisors.length - 6})</>}
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
              <div className="w-full p-4 flex items-center justify-between tap-target touch-feedback">
                <div>
                  <span className="font-medium text-destructive">Clear All ROs</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
                  <Trash2 className="h-4 w-4 mr-1" />
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
        updateSetting={updateSetting}
        openPortal={openPortal}
        setShowUpgradeDialog={setShowUpgradeDialog}
        signOut={signOut}
      />
    </div>
  );
}
