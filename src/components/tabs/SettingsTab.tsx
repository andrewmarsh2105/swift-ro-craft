import { useState, useEffect, useRef } from 'react';
import { useFlagContext } from '@/contexts/FlagContext';
import { Plus, Trash2, ChevronDown, ChevronUp, ChevronRight, Star, Mail, Loader2, User, Building2, DollarSign, Target, Shield, LogOut } from 'lucide-react';
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

// Session-level cache for admin status. Uses a WeakMap keyed on the module
// scope so HMR gets fresh state, but re-mounts within the same session reuse.
const _adminCache = new Map<string, boolean>();

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-[11px] text-muted-foreground/80 mt-1 leading-relaxed">{description}</p>}
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
  const { isPro, daysUntilEnd, isNearExpiry, hasBillingIssue, openPortal } = useSubscription();
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

  // Desktop inline account fields
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

    // Use cached result if already determined this session
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
      if (goalSavedTimerRef.current) clearTimeout(goalSavedTimerRef.current);
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
      if (shopTimerRef.current) clearTimeout(shopTimerRef.current);
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

  // Inline save for name/shop
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

  const isDesktop = !isMobile;

  // ── Shared manage content ──
  const ManageContent = () => (
    <>
      {/* Quick Presets */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground/75 uppercase tracking-wide">Quick Presets</h3>
            <p className="text-[10px] text-muted-foreground/55 mt-0.5">Saved presets for faster RO entry · {settings.presets.length} total</p>
          </div>
          <button onClick={() => openPresetEditor()} className="h-8 px-2.5 rounded-md border border-primary/25 text-primary text-[11px] font-semibold flex items-center gap-1 tap-target active:opacity-70 transition-opacity">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <div className="space-y-1 bg-card border border-border/50 rounded-lg p-1.5">
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
      </section>

      {/* Advisors */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground/75 uppercase tracking-wide">Advisors</h3>
            <p className="text-[10px] text-muted-foreground/55 mt-0.5">Active advisor list used across your workflow · {settings.advisors.length} total</p>
          </div>
          <button onClick={() => openAdvisorEditor()} className="h-8 px-2.5 rounded-md border border-primary/25 text-primary text-[11px] font-semibold flex items-center gap-1 tap-target active:opacity-70 transition-opacity">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <div className="space-y-1 bg-card border border-border/50 rounded-lg p-1.5">
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
      </section>

      {/* Scan Templates - Pro only */}
      {isPro && <TemplatesSection />}

      {/* Data */}
      <SettingsGroup title="Data & Backup">
        <SettingsRow
          label="Download Backup"
          description="Export all repair orders as JSON for backup."
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
        <div className="w-full border-t border-border/50 px-4 py-3.5 bg-destructive/[0.03]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-destructive/75 mb-2">Danger Zone</p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[13px] font-medium text-destructive">Clear All ROs</span>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                {ros.length} RO{ros.length !== 1 ? 's' : ''} will be deleted
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllClick}
              disabled={ros.length === 0}
              className="h-8 text-[12px] border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </SettingsGroup>
    </>
  );

  return (
    <div className={cn("flex flex-col h-full overflow-y-auto", !isDesktop && "pb-32", isDesktop && "bg-gradient-to-b from-background via-background to-muted/20")}>
      <div className={cn("panel-header border-b border-border/40 bg-background/90 backdrop-blur", isDesktop ? "px-5 pt-4 pb-3" : "px-4 pt-4 pb-3")}>
        <div className={cn("mx-auto w-full flex items-center justify-between gap-3", isDesktop ? "max-w-5xl" : "max-w-xl")}>
          <div>
            <h1 className={cn("font-bold tracking-tight", isDesktop ? "text-[18px]" : "text-[17px]")}>{settingsView === 'settings' ? 'Settings' : 'Profile'}</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {settingsView === 'settings'
                ? 'Configure RO Navigator behavior, totals, and workflow tools.'
                : 'Manage your account identity, subscription, and sign-out actions.'}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-border/70 bg-muted/30 p-1 shadow-[inset_0_1px_0_hsl(var(--background)/0.8)]">
            <div className="flex items-center gap-1">
              {([
                { value: 'settings', label: 'Settings' },
                { value: 'profile', label: 'Profile' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettingsView(option.value)}
                  className={cn(
                    "h-8 px-3.5 rounded-lg text-[11px] font-semibold transition-all",
                    settingsView === option.value
                      ? "bg-background text-foreground shadow-[0_1px_3px_hsl(var(--foreground)/0.08)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/70",
                  )}
                  aria-pressed={settingsView === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={cn("mx-auto w-full space-y-8", isDesktop ? "max-w-5xl p-6" : "max-w-xl p-4")}>
        {settingsView === 'settings' ? (
          <>
            <SettingsSection
              title="Display & Workflow"
              description="Control visual preferences and core RO workflow behavior."
            >
              <SettingsGroup title="Display">
                <SettingsRow label="Dark Mode" toggle toggleValue={darkMode} onToggle={toggleDarkMode} />
                <SettingsRow
                  label="Hide Hour Totals"
                  description="Shows — instead of totals"
                  toggle
                  toggleValue={userSettings.hideTotals}
                  onToggle={(v) => updateUserSetting('hideTotals', v)}
                />
              </SettingsGroup>

              <SettingsGroup title="RO Behavior">
                <SettingsRow
                  label="Vehicle on Lines"
                  description="Year/make/model on each line"
                  toggle
                  toggleValue={userSettings.showVehicleChips}
                  onToggle={(v) => updateUserSetting('showVehicleChips', v)}
                />
                <SettingsRow
                  label="Keyword Auto-Fill"
                  description="Match job keywords to preset hours"
                  toggle
                  toggleValue={userSettings.keywordAutofill}
                  onToggle={(v) => updateUserSetting('keywordAutofill', v)}
                />
                <SettingsRow
                  label="Scan Confidence"
                  description={isPro ? 'Show match % on scanned ROs' : 'Pro only'}
                  toggle
                  toggleValue={userSettings.showScanConfidence}
                  onToggle={(v) => updateUserSetting('showScanConfidence', v)}
                  disabled={!isPro}
                />
              </SettingsGroup>
            </SettingsSection>

            <SettingsSection
              title="Goals, Earnings & Pay Period"
              description="Set targets and pay-period rules that drive your summary totals."
            >
              <div className="space-y-1">
                <div className="px-0.5 flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-primary/80" />
                  <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">Goals & Earnings</h3>
                </div>
                <div className="bg-card border border-border/40 rounded-[var(--radius)] overflow-hidden">
                  <div className="px-4 py-3.5 space-y-3">
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
                      className={cn("gap-1.5", isDesktop ? "h-7 text-[11px] px-3" : "h-8 text-[12px]")}
                    >
                      {goalSaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {goalSaveStatus === 'saving' ? 'Saving…' : goalSaveStatus === 'saved' ? 'Saved' : 'Save Goals'}
                    </Button>
                  </div>
                </div>
              </div>

              <PayPeriodRangeSection userSettings={userSettings} updateUserSetting={updateUserSetting} />
            </SettingsSection>

            <SettingsSection
              title="Management"
              description="Maintain presets, advisors, templates, and data controls in one place."
            >
              <ManageContent />
            </SettingsSection>

            <SettingsSection
              title="Help & Version"
              description="Get support quickly without leaving your settings workflow."
            >
              <SettingsGroup title="Support">
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
                    <span className="text-[13px] font-medium">Contact Support</span>
                    <p className="text-[11px] text-muted-foreground/50">support@ronavigator.com</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </button>
              </SettingsGroup>
            </SettingsSection>
          </>
        ) : (
          <>
            <SettingsSection
              title="Account Overview"
              description="Your identity, subscription status, and account health."
            >
              <div className="bg-card border border-border/60 rounded-[var(--radius)] p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground text-sm font-bold select-none bg-primary shadow-[var(--shadow-sm)]">
                    {avatarInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-tight truncate">
                      {syncedSettings.displayName || 'Set your name'}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{user?.email || 'No email'}</p>
                    <p className="text-[11px] text-muted-foreground/65 truncate mt-0.5">{syncedSettings.shopName || 'Set shop name'}</p>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-bold',
                    isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/60',
                  )}>
                    {isPro ? 'PRO' : 'FREE'}
                  </span>
                </div>

                {isNearExpiry && daysUntilEnd !== null && (
                  <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-md px-3 py-2">
                    <Star className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                      Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong>
                    </p>
                  </div>
                )}

                {hasBillingIssue && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                    Billing issue detected. Open subscription to update payment details.
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={() => { if (isPro) openPortal(); else setShowUpgradeDialog(true); }}
                  >
                    {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
                  </Button>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Profile Details"
              description="Update your visible identity details."
            >
              <div className="grid grid-cols-1 gap-3">
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
            </SettingsSection>

            <SettingsSection
              title="Account Actions"
              description="Session controls and admin actions."
            >
              <SettingsGroup title="Session">
                {isAdmin && (
                  <SettingsRow
                    label="Admin"
                    description="Open admin controls"
                    icon={Shield}
                    onClick={() => navigate('/admin')}
                  />
                )}
                <SettingsRow
                  label="Sign Out"
                  description="End your current RO Navigator session"
                  icon={LogOut}
                  onClick={signOut}
                />
              </SettingsGroup>
            </SettingsSection>
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
    </div>
  );
}
