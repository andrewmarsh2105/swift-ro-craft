import { BottomSheet } from '@/components/mobile/BottomSheet';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { cn } from '@/lib/utils';
import type { Preset, LaborType } from '@/types/ro';

interface PresetEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingPreset: Preset | null;
  presetName: string;
  setPresetName: (v: string) => void;
  presetLaborType: LaborType;
  setPresetLaborType: (v: LaborType) => void;
  presetHours: string;
  setPresetHours: (v: string) => void;
  presetTemplate: string;
  setPresetTemplate: (v: string) => void;
  onSave: () => void;
}

export function PresetEditorSheet({
  isOpen,
  onClose,
  editingPreset,
  presetName,
  setPresetName,
  presetLaborType,
  setPresetLaborType,
  presetHours,
  setPresetHours,
  presetTemplate,
  setPresetTemplate,
  onSave,
}: PresetEditorSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingPreset ? 'Edit Preset' : 'New Preset'}
    >
      <div className="p-4 space-y-6">
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

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-secondary rounded-xl font-medium tap-target touch-feedback"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
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
  );
}
