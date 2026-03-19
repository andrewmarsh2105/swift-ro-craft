import { Pencil, Trash2, User } from 'lucide-react';
import type { Advisor } from '@/types/ro';

interface AdvisorItemProps {
  advisor: Advisor;
  onEdit: () => void;
  onDelete: () => void;
}

export function AdvisorItem({ advisor, onEdit, onDelete }: AdvisorItemProps) {
  return (
    <div className="bg-card px-3 py-2 rounded-lg flex items-center gap-3 border border-border/70 shadow-[var(--shadow-sm)]">
      <User className="h-5 w-5 text-primary/80" />
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
