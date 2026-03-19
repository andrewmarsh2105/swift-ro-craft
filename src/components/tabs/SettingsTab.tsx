import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlagContext } from '@/contexts/FlagContext';
import { Pencil, Plus, Trash2, Moon, Sun, ChevronRight, ChevronDown, ChevronUp, X, User, AlertTriangle, LogOut, FileText, Star, Crown, Shield, Mail, InfinityIcon, Camera, BarChart3, FileSpreadsheet, Check } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { useTemplates } from '@/hooks/useTemplates';
import { motion } from 'framer-motion';
import { useRO } from '@/contexts/ROContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { ACCENT_COLORS } from '@/hooks/useUserSettings';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Preset, LaborType, Advisor } from '@/types/ro';
import { cn } from '@/lib/utils';
import { SettingsGroup } from '@/components/settings/SettingsGroup';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { PresetItem } from '@/components/settings/PresetItem';
import { AdvisorItem } from '@/components/settings/AdvisorItem';

function TemplatesSection() {
  const { templates, loading, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { userSettings, updateUserSetting } = useFlagContext();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateHints, setTemplateHints] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const defaultTemplateId = userSettings.defaultTemplateId || null;

  const handleSave = async () => {
    if (!templateName.trim()) return;
    // Parse hints into a field map object
    let fieldMap: Record<string, unknown> | undefined;
    if (templateHints.trim()) {
      try {
        fieldMap = JSON.parse(templateHints.trim());
      } catch {
        // Treat as plain-text extraction hints
        fieldMap = { extractionHints: templateHints.trim() };
      }
    }

    if (editingId) {
      await updateTemplate(editingId, { name: templateName.trim(), fieldMap: fieldMap || null });
    } else {
      await addTemplate(templateName.trim(), fieldMap);
    }
    setShowEditor(false);
    setEditingId(null);
    setTemplateName('');
    setTemplateHints('');
  };

  const handleEdit = (t: { id: string; name: string; fieldMapJson?: Record<string, unknown> | null }) => {
    setEditingId(t.id);
    setTemplateName(t.name);
    setTemplateHints(
      t.fieldMapJson
        ? (typeof t.fieldMapJson === 'object' && t.fieldMapJson.extractionHints
          ? t.fieldMapJson.extractionHints
          : JSON.stringify(t.fieldMapJson, null, 2))
        : ''
    );
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    setShowDeleteConfirm(null);
    if (defaultTemplateId === id) {
      updateUserSetting('defaultTemplateId', null);
    }
  };

  const handleSetDefault = (id: string) => {
    updateUserSetting('defaultTemplateId', defaultTemplateId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Scan Templates
        </h3>
        <button
          onClick={() => {
            setEditingId(null);
            setTemplateName('');
            setTemplateHints('');
            setShowEditor(true);
          }}
          className="p-2 tap-target touch-feedback text-primary"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <p className="px-4 text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="px-4 text-sm text-muted-foreground">No templates yet. Create one to guide scan extraction.</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-card p-4 rounded-xl flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {t.name}
                  {defaultTemplateId === t.id && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-semibold">DEFAULT</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.fieldMapJson ? 'Has extraction hints' : 'No hints'} · Updated {new Date(t.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => handleSetDefault(t.id)} className="p-2 tap-target touch-feedback">
                <Star className={cn('h-4 w-4', defaultTemplateId === t.id ? 'text-primary fill-primary' : 'text-muted-foreground')} />
              </button>
              <button onClick={() => handleEdit(t)} className="p-2 tap-target touch-feedback">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => setShowDeleteConfirm(t.id)} className="p-2 tap-target touch-feedback text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor Sheet */}
      <BottomSheet
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        title={editingId ? 'Edit Template' : 'New Template'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g., Standard RO Layout"
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Extraction Hints <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={templateHints}
              onChange={e => setTemplateHints(e.target.value)}
              placeholder={"Describe where fields are on this RO format, e.g.:\n• RO number is top-right\n• Advisor name is below customer info\n• Lines start after \"Labor Operations\""}
              rows={4}
              className="w-full p-4 bg-secondary rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              These hints help the scanner focus on the right areas of your specific RO format.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditor(false)}
              className="flex-1 py-4 bg-secondary rounded-xl font-medium tap-target touch-feedback"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!templateName.trim()}
              className={cn(
                'flex-1 py-4 rounded-xl font-semibold tap-target touch-feedback',
                templateName.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              Save
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Delete Confirm */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)} className="flex-1">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayPeriodRangeSection({ userSettings, updateUserSetting }: {
  userSettings: {
    payPeriodType?: 'week' | 'two_weeks' | 'custom';
    payPeriodEndDates?: number[] | null;
  };
  updateUserSetting: (key: string, value: unknown) => void;
}) {
  const payPeriodType = userSettings.payPeriodType || 'week';
  const payPeriodEndDates: number[] = userSettings.payPeriodEndDates || [];
  const [newDay, setNewDay] = useState('');

  const handleAddEndDate = () => {
    const day = parseInt(newDay);
    if (isNaN(day) || day < 1 || day > 31) return;
    if (payPeriodEndDates.includes(day)) return;
    const updated = [...payPeriodEndDates, day].sort((a, b) => a - b);
    updateUserSetting('payPeriodEndDates', updated);
    setNewDay('');
  };

  const handleRemoveEndDate = (day: number) => {
    const updated = payPeriodEndDates.filter((d: number) => d !== day);
    updateUserSetting('payPeriodEndDates', updated.length > 0 ? updated : null);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4">
        Pay Period Range
      </h3>
      <div className="card-mobile p-4 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">Default period for Summary &amp; Main page</p>
          <SegmentedControl
            options={[
              { value: 'week', label: '1 Week' },
              { value: 'two_weeks', label: '2 Weeks' },
              { value: 'custom', label: 'Custom' },
            ]}
            value={payPeriodType}
            onChange={(v) => updateUserSetting('payPeriodType', v)}
          />
        </div>

        {payPeriodType === 'custom' && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Set the day(s) of the month your pay period ends on (e.g., 15 and 28).
              {payPeriodEndDates.length < 2 && (
                <span className="block mt-1 text-xs text-muted-foreground/70">
                  Add at least 2 dates to define your pay cycle.
                </span>
              )}
            </p>

            {/* Current end dates */}
            {payPeriodEndDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {payPeriodEndDates.map((day: number) => (
                  <div key={day} className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5">
                    <span className="text-sm font-semibold tabular-nums">{day}{getOrdinalSuffix(day)}</span>
                    <button
                      onClick={() => handleRemoveEndDate(day)}
                      className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new end date */}
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                max={31}
                value={newDay}
                onChange={e => setNewDay(e.target.value)}
                placeholder="Day (1-31)"
                className="flex-1 h-10 px-3 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleAddEndDate}
                disabled={!newDay || isNaN(parseInt(newDay)) || parseInt(newDay) < 1 || parseInt(newDay) > 31}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {payPeriodEndDates.length >= 2 && (
              <p className="text-xs text-muted-foreground">
                Periods: {payPeriodEndDates.map((day: number, i: number) => {
                  const nextDay = payPeriodEndDates[(i + 1) % payPeriodEndDates.length];
                  const startDay = day + 1 > 31 ? 1 : day + 1;
                  return `${startDay}${getOrdinalSuffix(startDay)} – ${nextDay}${getOrdinalSuffix(nextDay)}`;
                }).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground mb-3">Week starts on</p>
          <div className="flex gap-1.5">
            {(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const).map((day, index) => (
              <button
                key={day}
                onClick={() => updateUserSetting('weekStartDay', index)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  (userSettings.weekStartDay ?? 0) === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-muted'
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function SettingsTab() {
  const { settings, updateSettings, updatePresets, updateAdvisors, clearAllROs, ros } = useRO();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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
  const [localDisplayName, setLocalDisplayName] = useState(syncedSettings.displayName);
  const [localShopName, setLocalShopName] = useState(syncedSettings.shopName);
  const [localDailyGoal, setLocalDailyGoal] = useState(syncedSettings.hoursGoalDaily > 0 ? String(syncedSettings.hoursGoalDaily) : '');
  const [localWeeklyGoal, setLocalWeeklyGoal] = useState(syncedSettings.hoursGoalWeekly > 0 ? String(syncedSettings.hoursGoalWeekly) : '');
  const [localHourlyRate, setLocalHourlyRate] = useState(syncedSettings.hourlyRate > 0 ? String(syncedSettings.hourlyRate) : '');
  // Sync local state from DB only once per load cycle (when userSettingsLoaded transitions
  // false→true). Using a ref to guard against re-running when individual fields change due to
  // the user's own optimistic updates — that would overwrite in-progress typing in OTHER fields.
  const hasInitialSyncedRef = useRef(false);
  useEffect(() => {
    if (!userSettingsLoaded) {
      hasInitialSyncedRef.current = false;
      return;
    }
    if (hasInitialSyncedRef.current) return;
    hasInitialSyncedRef.current = true;
    setLocalDisplayName(syncedSettings.displayName);
    setLocalShopName(syncedSettings.shopName);
    setLocalDailyGoal(syncedSettings.hoursGoalDaily > 0 ? String(syncedSettings.hoursGoalDaily) : '');
    setLocalWeeklyGoal(syncedSettings.hoursGoalWeekly > 0 ? String(syncedSettings.hoursGoalWeekly) : '');
    setLocalHourlyRate(syncedSettings.hourlyRate > 0 ? String(syncedSettings.hourlyRate) : '');
  }, [userSettingsLoaded, syncedSettings.displayName, syncedSettings.shopName, syncedSettings.hoursGoalDaily, syncedSettings.hoursGoalWeekly, syncedSettings.hourlyRate]);

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

    // Duplicate name check (case-insensitive), skip self when editing
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

    // Duplicate name check (case-insensitive), skip self when editing
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
    // Re-apply accent color for the new theme
    const hsl = ACCENT_COLORS[syncedSettings.accentColor]?.[enabled ? 'dark' : 'light'];
    if (hsl) {
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
    }
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
  const accentLabel = (syncedSettings.accentColor || 'blue').charAt(0).toUpperCase() + (syncedSettings.accentColor || 'blue').slice(1);
  const dailyGoalLabel = syncedSettings.hoursGoalDaily > 0 ? `${syncedSettings.hoursGoalDaily}h` : 'Off';
  const weeklyGoalLabel = syncedSettings.hoursGoalWeekly > 0 ? `${syncedSettings.hoursGoalWeekly}h` : 'Off';
  const rateLabel = syncedSettings.hourlyRate > 0 ? `$${syncedSettings.hourlyRate}/hr` : 'Off';
  const avatarInitial = (syncedSettings.displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32 bg-accent/[0.14]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-border/80 space-y-3">
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
              className="card-mobile p-4 w-full text-left tap-target touch-feedback border border-border/80"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xl font-bold select-none"
                  style={{ backgroundColor: `hsl(${ACCENT_COLORS[syncedSettings.accentColor || 'blue'].light})` }}
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
              <div className="p-4 flex items-center justify-between gap-4">
                <span className="font-medium text-sm">Accent color</span>
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full flex-shrink-0"
                    style={{ background: `hsl(${ACCENT_COLORS[syncedSettings.accentColor || 'blue'].light})` }}
                  />
                  <select
                    value={syncedSettings.accentColor || 'blue'}
                    onChange={e => updateSetting('accentColor', e.target.value)}
                    className="h-9 pl-3 pr-7 text-sm bg-card rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    {(Object.keys(ACCENT_COLORS) as string[]).map(colorKey => (
                      <option key={colorKey} value={colorKey}>
                        {colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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

      {/* Preset Editor Sheet */}
      <BottomSheet
        isOpen={showPresetEditor}
        onClose={() => setShowPresetEditor(false)}
        title={editingPreset ? 'Edit Preset' : 'New Preset'}
      >
        <div className="p-4 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Preset Name
            </label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="e.g., Oil Change"
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Labor Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Labor Type
            </label>
            <SegmentedControl
              options={[
                { value: 'warranty' as LaborType, label: 'Warranty' },
                { value: 'customer-pay' as LaborType, label: 'Customer Pay' },
                { value: 'internal' as LaborType, label: 'Internal' },
              ]}
              value={presetLaborType}
              onChange={(v) => setPresetLaborType(v as LaborType)}
            />
          </div>

          {/* Default Hours */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Default Hours (optional)
            </label>
             <input
              type="text"
              inputMode="decimal"
              value={presetHours}
              onChange={(e) => {
                let val = e.target.value.replace(',', '.');
                val = val.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                setPresetHours(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val);
              }}
              placeholder="0.0"
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Work Template */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Work Template (optional)
            </label>
            <textarea
              value={presetTemplate}
              onChange={(e) => setPresetTemplate(e.target.value)}
              placeholder="Pre-filled work description..."
              rows={3}
              className="w-full p-4 bg-secondary rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPresetEditor(false)}
              className="flex-1 py-4 bg-secondary rounded-xl font-medium tap-target touch-feedback"
            >
              Cancel
            </button>
            <button
              onClick={savePreset}
              disabled={!presetName.trim()}
              className={cn(
                'flex-1 py-4 rounded-xl font-semibold tap-target touch-feedback',
                presetName.trim()
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              Save
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Advisor Editor Sheet */}
      <BottomSheet
        isOpen={showAdvisorEditor}
        onClose={() => setShowAdvisorEditor(false)}
        title={editingAdvisor ? 'Edit Advisor' : 'New Advisor'}
      >
        <div className="p-4 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Advisor Name
            </label>
            <input
              type="text"
              value={advisorName}
              onChange={(e) => setAdvisorName(e.target.value)}
              placeholder="e.g., Mike Johnson"
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAdvisorEditor(false)}
              className="flex-1 py-4 bg-secondary rounded-xl font-medium tap-target touch-feedback"
            >
              Cancel
            </button>
            <button
              onClick={saveAdvisor}
              disabled={!advisorName.trim()}
              className={cn(
                'flex-1 py-4 rounded-xl font-semibold tap-target touch-feedback',
                advisorName.trim()
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              Save
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Clear All ROs - Step 1: Type DELETE */}
      <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle>Clear All ROs?</DialogTitle>
            </div>
            <DialogDescription className="text-left">
              This will permanently delete all {ros.length} repair order{ros.length !== 1 ? 's' : ''} and cannot be undone.
              <br /><br />
              Type <span className="font-bold text-foreground">DELETE</span> to confirm:
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="w-full h-12 px-4 bg-secondary rounded-xl text-center font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-destructive"
            autoFocus
          />
          <DialogFooter className="flex-row gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowClearAllDialog(false)}
              className="flex-1 tap-target"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFirstConfirm}
              disabled={confirmText.toUpperCase() !== 'DELETE'}
              className="flex-1 tap-target"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All ROs - Step 2: Final Confirm */}
      <Dialog open={showFinalConfirm} onOpenChange={setShowFinalConfirm}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Final Confirmation</DialogTitle>
            <DialogDescription className="text-center">
              Are you absolutely sure you want to delete all ROs? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFinalConfirm(false)}
              className="flex-1 tap-target"
            >
              No, Keep ROs
            </Button>
            <Button
              variant="destructive"
              onClick={handleFinalConfirm}
              className="flex-1 tap-target"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Yes, Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProUpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />

      {/* Account Sheet */}
      <BottomSheet isOpen={showAccountSheet} onClose={() => setShowAccountSheet(false)} title="Account">
        <div className="p-4 space-y-6">
          {/* Avatar + email */}
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold select-none"
              style={{ backgroundColor: `hsl(${ACCENT_COLORS[syncedSettings.accentColor || 'blue'].light})` }}
            >
              {avatarInitial}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {syncedSettings.displayName || <span className="text-muted-foreground font-normal italic text-sm">No name set</span>}
              </div>
              <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
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
                  onBlur={e => updateSetting('displayName', e.target.value.trim())}
                  placeholder="e.g. Mike"
                  className="w-32 h-10 px-3 text-sm bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => updateSetting('displayName', localDisplayName.trim())}
                  className={cn(
                    'h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors',
                    localDisplayName.trim() !== syncedSettings.displayName
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
                  onBlur={e => updateSetting('shopName', e.target.value.trim())}
                  placeholder="e.g. Smith's Auto"
                  className="w-32 h-10 px-3 text-sm bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => updateSetting('shopName', localShopName.trim())}
                  className={cn(
                    'h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors',
                    localShopName.trim() !== syncedSettings.shopName
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
                setShowAccountSheet(false);
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
                onClick={() => { setShowAccountSheet(false); navigate('/admin'); }}
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
    </div>
  );
}
