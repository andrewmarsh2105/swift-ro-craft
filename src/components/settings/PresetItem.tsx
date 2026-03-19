import { Pencil, Trash2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Preset } from '@/types/ro';

interface PresetItemProps {
  preset: Preset;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export function PresetItem({ preset, onEdit, onDelete, onToggleFavorite }: PresetItemProps) {
  const typeLabel = {
    'warranty': 'W',
    'customer-pay': 'CP',
    'internal': 'Int',
  }[preset.laborType];

  return (
    <div className="bg-card px-3 py-2 rounded-lg flex items-center gap-3 overflow-hidden border border-border/70 shadow-[var(--shadow-sm)]">
      <button onClick={onToggleFavorite} className="p-1.5 tap-target touch-feedback flex-shrink-0">
        <Star className={cn('h-4 w-4', preset.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground')} />
      </button>
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
