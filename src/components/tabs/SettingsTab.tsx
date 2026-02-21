import { useState } from 'react';
import { useFlagContext } from '@/contexts/FlagContext';
import { Pencil, Plus, Trash2, Moon, Sun, ChevronRight, X, User, AlertTriangle, LogOut, FileText, Star, Crown } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTemplates } from '@/hooks/useTemplates';
import { motion } from 'framer-motion';
import { useRO } from '@/contexts/ROContext';
import { useAuth } from '@/contexts/AuthContext';
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

interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
}

function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4">
        {title}
      </h3>
      <div className="card-mobile divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

function SettingsRow({ label, value, onClick, toggle, toggleValue, onToggle }: SettingsRowProps) {
  return (
    <button
      onClick={toggle ? () => onToggle?.(!toggleValue) : onClick}
      className="w-full p-4 flex items-center justify-between tap-target touch-feedback"
    >
      <span className="font-medium">{label}</span>
      {toggle ? (
        <div
          className={cn(
            'w-12 h-7 rounded-full relative transition-colors',
            toggleValue ? 'bg-primary' : 'bg-muted'
          )}
        >
          <div
            className={cn(
              'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform',
              toggleValue ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          {value && <span className="text-sm">{value}</span>}
          <ChevronRight className="h-5 w-5" />
        </div>
      )}
    </button>
  );
}

interface PresetItemProps {
  preset: Preset;
  onEdit: () => void;
  onDelete: () => void;
}

function PresetItem({ preset, onEdit, onDelete }: PresetItemProps) {
  const typeLabel = {
    'warranty': 'W',
    'customer-pay': 'CP',
    'internal': 'Int',
  }[preset.laborType];

  return (
    <div className="bg-card px-3 py-2 rounded-lg flex items-center gap-3 overflow-hidden">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{preset.name}</div>
        <div className="text-xs text-muted-foreground">
          {typeLabel} • {preset.defaultHours ? `${preset.defaultHours}h` : 'No default'}
        </div>
      </div>
      <button onClick={onEdit} className="p-1.5 tap-target touch-feedback flex-shrink-0">
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </button>
      <button onClick={onDelete} className="p-1.5 tap-target touch-feedback text-destructive flex-shrink-0">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

interface AdvisorItemProps {
  advisor: Advisor;
  onEdit: () => void;
  onDelete: () => void;
}

function AdvisorItem({ advisor, onEdit, onDelete }: AdvisorItemProps) {
  return (
    <div className="bg-card px-3 py-2 rounded-lg flex items-center gap-3">
      <User className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{advisor.name}</div>
      </div>
      <button onClick={onEdit} className="p-1.5 tap-target touch-feedback">
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </button>
      <button onClick={onDelete} className="p-1.5 tap-target touch-feedback text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

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
    let fieldMap: Record<string, any> | undefined;
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

  const handleEdit = (t: { id: string; name: string; fieldMapJson?: Record<string, any> | null }) => {
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

export function SettingsTab() {
  const { settings, updateSettings, updatePresets, updateAdvisors, clearAllROs, ros } = useRO();
  const { user, signOut } = useAuth();
  const { userSettings, updateUserSetting } = useFlagContext();
  const { isPro, subscriptionEnd, startCheckout, openPortal } = useSubscription();
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [showAdvisorEditor, setShowAdvisorEditor] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);

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
    const newPreset: Preset = {
      id: editingPreset?.id || Date.now().toString(),
      name: presetName,
      laborType: presetLaborType,
      defaultHours: presetHours ? parseFloat(presetHours) : undefined,
      workTemplate: presetTemplate || undefined,
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
    const newAdvisor: Advisor = {
      id: editingAdvisor?.id || Date.now().toString(),
      name: advisorName,
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

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Plan */}
        <SettingsGroup title="Plan">
          {isPro ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <span className="font-semibold">Pro Plan</span>
              </div>
              {subscriptionEnd && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(subscriptionEnd).toLocaleDateString()}
                </p>
              )}
              <button
                onClick={openPortal}
                className="text-sm text-primary font-medium hover:underline"
              >
                Manage Subscription
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Free Plan</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upgrade to Pro for unlimited ROs, OCR scanning, spreadsheet view, and multi-period reporting.
              </p>
              <button
                onClick={startCheckout}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
              >
                Upgrade to Pro — $9.99/mo
              </button>
            </div>
          )}
        </SettingsGroup>

        {/* Appearance */}
        <SettingsGroup title="Appearance">
          <SettingsRow
            label="Dark Mode"
            toggle
            toggleValue={darkMode}
            onToggle={toggleDarkMode}
          />
          <SettingsRow
            label="Show Scan Confidence"
            toggle
            toggleValue={userSettings.showScanConfidence}
            onToggle={(v) => updateUserSetting('showScanConfidence', v)}
          />
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
        </SettingsGroup>

        {/* Summary Range */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4">
            Summary Range
          </h3>
          <div className="card-mobile p-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">Default period for Summary &amp; Main page</p>
              <SegmentedControl
                options={[
                  { value: 'week', label: '1 Week' },
                  { value: 'two_weeks', label: '2 Weeks' },
                ]}
                value={userSettings.defaultSummaryRange || 'week'}
                onChange={(v) => updateUserSetting('defaultSummaryRange', v)}
              />
            </div>
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


        {/* Presets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Quick Presets
            </h3>
            <button
              onClick={() => openPresetEditor()}
              className="p-2 tap-target touch-feedback text-primary"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-1">
            {settings.presets.map((preset) => (
              <PresetItem
                key={preset.id}
                preset={preset}
                onEdit={() => openPresetEditor(preset)}
                onDelete={() => deletePreset(preset.id)}
              />
            ))}
          </div>
        </div>

        {/* Advisors */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Advisors
            </h3>
            <button
              onClick={() => openAdvisorEditor()}
              className="p-2 tap-target touch-feedback text-primary"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-1">
            {settings.advisors.map((advisor) => (
              <AdvisorItem
                key={advisor.id}
                advisor={advisor}
                onEdit={() => openAdvisorEditor(advisor)}
                onDelete={() => deleteAdvisor(advisor.id)}
              />
            ))}
          </div>
        </div>

        {/* Scan Templates - Pro only */}
        {isPro && <TemplatesSection />}

        {/* Data Management */}
        <SettingsGroup title="Data">
          <SettingsRow
            label="Export All Data"
            onClick={() => {}}
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

        {/* About */}
        <SettingsGroup title="About">
          <SettingsRow
            label="Version"
            value="1.0.0"
            onClick={() => {}}
          />
        </SettingsGroup>

        {/* Account */}
        <SettingsGroup title="Account">
          {user && (
            <div className="p-4 text-sm text-muted-foreground truncate">
              {user.email}
            </div>
          )}
          <button
            onClick={signOut}
            className="w-full p-4 flex items-center gap-3 tap-target touch-feedback text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </SettingsGroup>
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
    </div>
  );
}
