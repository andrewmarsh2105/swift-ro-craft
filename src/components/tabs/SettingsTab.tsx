import { useState } from 'react';
import { GripVertical, Pencil, Plus, Trash2, Moon, Sun, ChevronRight, X, User } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { useRO } from '@/contexts/ROContext';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
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
    <Reorder.Item
      value={preset}
      className="bg-card p-4 rounded-xl flex items-center gap-3 touch-none"
    >
      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{preset.name}</div>
        <div className="text-sm text-muted-foreground">
          {typeLabel} • {preset.defaultHours ? `${preset.defaultHours}h` : 'No default'}
        </div>
      </div>
      <button onClick={onEdit} className="p-2 tap-target touch-feedback">
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </button>
      <button onClick={onDelete} className="p-2 tap-target touch-feedback text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}

interface AdvisorItemProps {
  advisor: Advisor;
  onEdit: () => void;
  onDelete: () => void;
}

function AdvisorItem({ advisor, onEdit, onDelete }: AdvisorItemProps) {
  return (
    <Reorder.Item
      value={advisor}
      className="bg-card p-4 rounded-xl flex items-center gap-3 touch-none"
    >
      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
      <User className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{advisor.name}</div>
      </div>
      <button onClick={onEdit} className="p-2 tap-target touch-feedback">
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </button>
      <button onClick={onDelete} className="p-2 tap-target touch-feedback text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}

export function SettingsTab() {
  const { settings, updateSettings, updatePresets, updateAdvisors } = useRO();
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [showAdvisorEditor, setShowAdvisorEditor] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [darkMode, setDarkMode] = useState(false);

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

  const handleReorder = (newOrder: Preset[]) => {
    updatePresets(newOrder);
  };

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

  const handleAdvisorReorder = (newOrder: Advisor[]) => {
    updateAdvisors(newOrder);
  };

  const toggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Appearance */}
        <SettingsGroup title="Appearance">
          <SettingsRow
            label="Dark Mode"
            toggle
            toggleValue={darkMode}
            onToggle={toggleDarkMode}
          />
        </SettingsGroup>

        {/* Default Values */}
        <SettingsGroup title="Defaults">
          <SettingsRow
            label="Default Advisor"
            value={settings.defaultAdvisor || 'None'}
            onClick={() => {}}
          />
        </SettingsGroup>

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

          <Reorder.Group
            axis="y"
            values={settings.presets}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {settings.presets.map((preset) => (
              <PresetItem
                key={preset.id}
                preset={preset}
                onEdit={() => openPresetEditor(preset)}
                onDelete={() => deletePreset(preset.id)}
              />
            ))}
          </Reorder.Group>
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

          <Reorder.Group
            axis="y"
            values={settings.advisors}
            onReorder={handleAdvisorReorder}
            className="space-y-2"
          >
            {settings.advisors.map((advisor) => (
              <AdvisorItem
                key={advisor.id}
                advisor={advisor}
                onEdit={() => openAdvisorEditor(advisor)}
                onDelete={() => deleteAdvisor(advisor.id)}
              />
            ))}
          </Reorder.Group>
        </div>
        <SettingsGroup title="Data">
          <SettingsRow
            label="Export All Data"
            onClick={() => {}}
          />
          <SettingsRow
            label="Clear All ROs"
            onClick={() => {}}
          />
        </SettingsGroup>

        {/* About */}
        <SettingsGroup title="About">
          <SettingsRow
            label="Version"
            value="1.0.0"
            onClick={() => {}}
          />
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
              type="number"
              inputMode="decimal"
              value={presetHours}
              onChange={(e) => setPresetHours(e.target.value)}
              placeholder="0.0"
              step="0.1"
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
    </div>
  );
}
