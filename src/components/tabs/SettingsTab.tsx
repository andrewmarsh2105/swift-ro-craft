import { useState, useEffect, useRef } from 'react';
import { useFlagContext } from '@/contexts/FlagContext';
import { Plus, Trash2, ChevronDown, ChevronUp, Crown, ChevronRight, Star, Mail, Check, Loader2, User, Building2, DollarSign, Target, Shield, LogOut } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { useRO } from '@/contexts/ROContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useNavigate } from 'react-router-dom';
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
type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';

export function SettingsTab() {
  const { settings, updateSettings, updatePresets, updateAdvisors, clearAllROs, ros } = useRO();
  const { user, signOut } = useAuth();
  const { userSettings, updateUserSetting, userSettingsLoaded } = useFlagContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
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

  const handleAccountSettingSave = async (key: 'displayName' | 'shopName', value: string) => {
    const result = await updateSetting(key, value);
    return result;
  };

  // Desktop inline save for name/shop
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
      <div className="space-y-1">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">Quick Presets</h3>
          <button onClick={() => openPresetEditor()} className="p-1.5 tap-target text-primary active:opacity-70 transition-opacity">
            <Plus className="h-4 w-4" />
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
      <div className="space-y-1">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">Advisors</h3>
          <button onClick={() => openAdvisorEditor()} className="p-1.5 tap-target text-primary active:opacity-70 transition-opacity">
            <Plus className="h-4 w-4" />
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
          label="Download Backup"
          description="Export all ROs as JSON"
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
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[13px] font-medium text-destructive">Clear All ROs</span>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              {ros.length} RO{ros.length !== 1 ? 's' : ''} will be deleted
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAllClick}
            disabled={ros.length === 0}
            className="h-8 text-[12px]"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </SettingsGroup>
    </>
  );

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="panel-header px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <h1 className="text-[15px] font-bold tracking-tight">Settings</h1>
            <SegmentedControl
              options={[
                { value: 'settings', label: 'Settings' },
                { value: 'manage', label: 'Manage' },
              ]}
              value={settingsView}
              onChange={(v) => setSettingsView(v as 'settings' | 'manage')}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 max-w-2xl mx-auto w-full">
            {settingsView === 'settings' ? (
              <div className="space-y-4">
                {/* ═══ Account & Identity — top hero section ═══ */}
                <div
                  className="bg-card border border-border/40 overflow-hidden"
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  {/* Identity row */}
                  <div className="px-4 pt-3 pb-2.5 flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground text-sm font-bold select-none bg-primary">
                      {avatarInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold leading-tight truncate">
                        {syncedSettings.displayName || <span className="text-muted-foreground font-normal text-[13px]">Set your name</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{user?.email}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn(
                        'px-2.5 py-1 rounded-md text-[10px] font-bold',
                        isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/60'
                      )}>
                        {isPro ? 'PRO' : 'FREE'}
                      </span>
                      <button
                        onClick={() => {
                          if (isPro) openPortal();
                          else setShowUpgradeDialog(true);
                        }}
                        className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        {isPro ? 'Manage' : 'Upgrade'}
                      </button>
                    </div>
                  </div>

                  {/* Warnings */}
                  {isNearExpiry && daysUntilEnd !== null && (
                    <div className="mx-5 mb-3 flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-md px-3 py-2">
                      <Star className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                        Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong>
                      </p>
                    </div>
                  )}

                  {/* Inline profile fields */}
                  <div className="border-t border-border/30 px-4 py-3">
                    <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  {/* Quick actions row */}
                  <div className="border-t border-border/30 px-4 py-2 flex items-center gap-3">
                    {isAdmin && (
                      <button
                        onClick={() => navigate('/admin')}
                        className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
                      >
                        <Shield className="h-3 w-3" /> Admin
                      </button>
                    )}
                    <button
                      onClick={signOut}
                      className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5 ml-auto"
                    >
                      <LogOut className="h-3 w-3" /> Sign Out
                    </button>
                  </div>
                </div>

                {/* ═══ Two-column grid for settings ═══ */}
                <div className="grid grid-cols-2 gap-3 items-start">
                  {/* Left column: Display + Behavior */}
                  <div className="space-y-4">
                    <SettingsGroup title="Display">
                      <SettingsRow
                        label="Dark Mode"
                        toggle
                        toggleValue={darkMode}
                        onToggle={toggleDarkMode}
                      />
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
                  </div>

                  {/* Right column: Goals + Pay Period + Help */}
                  <div className="space-y-4">
                    {/* Goals — refined card */}
                    <div className="space-y-1">
                      <div className="px-0.5 flex items-baseline gap-2">
                        <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">Goals & Earnings</h3>
                      </div>
                      <div
                        className="bg-card border border-border/40 overflow-hidden"
                        style={{ borderRadius: 'var(--radius)' }}
                      >
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
                        {/* Save bar — calmer, integrated */}
                        <div className="border-t border-border/40 px-4 py-2 flex items-center justify-between">
                          <GoalSaveStatusDisplay status={goalSaveStatus} />
                          <Button
                            size="sm"
                            variant={goalsDirty ? 'default' : 'ghost'}
                            onClick={handleSaveGoals}
                            disabled={!goalsDirty || goalSaveStatus === 'saving'}
                            className="h-7 text-[11px] gap-1.5 px-3"
                          >
                            {goalSaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                            {goalSaveStatus === 'saving' ? 'Saving…' : goalSaveStatus === 'saved' ? 'Saved' : 'Save Goals'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <PayPeriodRangeSection
                      userSettings={userSettings}
                      updateUserSetting={updateUserSetting}
                    />

                    {/* Help */}
                    <SettingsGroup title="Help">
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
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ManageContent />
              </div>
            )}
          </div>
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

  // ── Mobile layout (preserved) ──
  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32">
      {/* Header */}
      <div className="panel-header px-4 pt-4 pb-3 space-y-3">
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        <SegmentedControl
          options={[
            { value: 'settings', label: 'Settings' },
            { value: 'manage', label: 'Manage' },
          ]}
          value={settingsView}
          onChange={(v) => setSettingsView(v as 'settings' | 'manage')}
        />
      </div>

      <div className="p-4 desktop-sections max-w-xl mx-auto w-full">
        {settingsView === 'settings' ? (
          <>
            {/* Profile Card — compact identity row */}
            <button
              onClick={() => setShowAccountSheet(true)}
              className={cn(
                'w-full text-left tap-target active:bg-muted/40 transition-colors',
                'bg-card border border-border/60 px-4 py-3',
              )}
              style={{ borderRadius: 'var(--radius)' }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground text-sm font-bold select-none bg-primary">
                  {avatarInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold leading-tight truncate">
                    {syncedSettings.displayName || <span className="text-muted-foreground font-normal text-[12px] italic">Set your name</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{user?.email}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-bold',
                    isPro ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/60'
                  )}>
                    {isPro ? 'PRO' : 'FREE'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </div>
              {isNearExpiry && daysUntilEnd !== null && (
                <div className="mt-2 flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-md px-3 py-2">
                  <Star className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Trial ends in <strong>{daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}</strong>
                  </p>
                </div>
              )}
            </button>

            {/* Display */}
            <SettingsGroup title="Display">
              <SettingsRow
                label="Dark Mode"
                toggle
                toggleValue={darkMode}
                onToggle={toggleDarkMode}
              />
              <SettingsRow
                label="Hide Hour Totals"
                description="Shows — instead of totals"
                toggle
                toggleValue={userSettings.hideTotals}
                onToggle={(v) => updateUserSetting('hideTotals', v)}
              />
            </SettingsGroup>

            {/* RO Behavior */}
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

            {/* Goals & Earnings */}
            <SettingsGroup title="Goals & Earnings">
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <GoalField
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
                  label="Flat rate"
                  value={localHourlyRate}
                  onChange={setLocalHourlyRate}
                  prefix="$"
                  suffix="/ hr"
                  placeholder="Not set"
                  min={0}
                  step={0.5}
                />
                {/* Save bar */}
                <div className="flex items-center justify-between pt-0.5">
                  <GoalSaveStatusDisplay status={goalSaveStatus} />
                  <Button
                    size="sm"
                    variant={goalsDirty ? 'default' : 'ghost'}
                    onClick={handleSaveGoals}
                    disabled={!goalsDirty || goalSaveStatus === 'saving'}
                    className="h-8 text-[12px] gap-1.5"
                  >
                    {goalSaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {goalSaveStatus === 'saving' ? 'Saving…' : goalSaveStatus === 'saved' ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>
            </SettingsGroup>

            {/* Pay Period */}
            <PayPeriodRangeSection
              userSettings={userSettings}
              updateUserSetting={updateUserSetting}
            />

            {/* Help */}
            <SettingsGroup title="Help">
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
          </>
        ) : (
          <ManageContent />
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

/* ── Desktop inline field with auto-save ── */
function DesktopInlineField({
  icon,
  label,
  value,
  onChange,
  onBlur,
  onSave,
  status,
  isDirty,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onSave: () => void;
  status: FieldStatus;
  isDirty: boolean;
  placeholder: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/50">{icon}</span>
          <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</label>
        </div>
        <DesktopFieldFeedback status={status} isDirty={isDirty} onSave={onSave} />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSave(); (e.target as HTMLInputElement).blur(); } }}
        placeholder={placeholder}
        className={cn(
          'w-full h-8 px-3 text-[13px] bg-muted/30 rounded-md border transition-all',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
          isDirty ? 'border-primary/30' : 'border-transparent',
          status === 'error' && 'border-destructive/40 ring-1 ring-destructive/20',
        )}
      />
    </div>
  );
}

function DesktopFieldFeedback({ status, isDirty, onSave }: { status: FieldStatus; isDirty: boolean; onSave: () => void }) {
  if (status === 'saving') {
    return <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving</span>;
  }
  if (status === 'saved') {
    return <span className="text-[10px] text-green-600/80 flex items-center gap-1 font-medium"><Check className="h-2.5 w-2.5" /> Saved</span>;
  }
  if (status === 'error') {
    return <button onClick={onSave} className="text-[10px] text-destructive font-semibold">Retry</button>;
  }
  if (isDirty) {
    return <span className="text-[10px] text-primary/40">Unsaved</span>;
  }
  return null;
}

/* ── Goal field ── */
function GoalField({
  icon,
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  min,
  max,
  step,
}: {
  icon?: React.ReactNode;
  label: string;
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
      <div className="flex items-center gap-1.5">
        {icon}
        <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</label>
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground/50 pointer-events-none">{prefix}</span>
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
            'w-full h-8 text-[13px] bg-muted/30 rounded-md border border-transparent tabular-nums transition-all',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
            prefix ? 'pl-7 pr-10' : 'px-3 pr-10',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

/* ── Goal save status ── */
function GoalSaveStatusDisplay({ status }: { status: GoalSaveStatus }) {
  if (status === 'saved') {
    return (
      <span className="text-[11px] text-green-600/80 flex items-center gap-1 font-medium">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (status === 'error') {
    return <span className="text-[11px] text-destructive font-medium">Save failed — try again</span>;
  }
  return <div />;
}
