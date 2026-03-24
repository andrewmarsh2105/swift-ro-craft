import { BottomSheet } from '@/components/mobile/BottomSheet';
import { cn } from '@/lib/utils';
import type { Advisor } from '@/types/ro';

interface AdvisorEditorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingAdvisor: Advisor | null;
  advisorName: string;
  setAdvisorName: (v: string) => void;
  onSave: () => void;
}

export function AdvisorEditorSheet({
  isOpen,
  onClose,
  editingAdvisor,
  advisorName,
  setAdvisorName,
  onSave,
}: AdvisorEditorSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingAdvisor ? 'Edit Advisor' : 'New Advisor'}
    >
      <div className="p-4 space-y-6">
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

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-secondary rounded-xl font-medium tap-target touch-feedback"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
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
  );
}
