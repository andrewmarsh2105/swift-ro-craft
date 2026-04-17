import { useEffect, useMemo, useState } from 'react';
import { Loader2, Split } from 'lucide-react';
import type { ROLine } from '@/types/ro';
import type { SplitStatusChoice } from '@/lib/roSplit';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SplitRODialogProps {
  open: boolean;
  roNumber: string;
  lines: ROLine[];
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { selectedLineIds: string[]; statusChoice: SplitStatusChoice }) => void;
}

export function SplitRODialog({
  open,
  roNumber,
  lines,
  isSaving = false,
  onOpenChange,
  onConfirm,
}: SplitRODialogProps) {
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [statusChoice, setStatusChoice] = useState<SplitStatusChoice>('open');

  useEffect(() => {
    if (!open) {
      setSelectedLineIds([]);
      setStatusChoice('open');
      return;
    }
    const defaultIds = lines.slice(0, Math.max(1, Math.floor(lines.length / 2))).map((line) => line.id);
    setSelectedLineIds(defaultIds);
  }, [open, lines]);

  const selectedSet = useMemo(() => new Set(selectedLineIds), [selectedLineIds]);
  const selectedCount = selectedLineIds.length;
  const isValid = selectedCount > 0 && selectedCount < lines.length;

  const toggleLine = (lineId: string) => {
    setSelectedLineIds((prev) => {
      if (prev.includes(lineId)) return prev.filter((id) => id !== lineId);
      return [...prev, lineId];
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-4 w-4 text-primary" />
            Split RO #{roNumber}
          </DialogTitle>
          <DialogDescription>
            Choose which lines should move into version 2. Then choose whether version 2 should be saved as Open or Paid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/70 max-h-[280px] overflow-y-auto divide-y divide-border/60">
            {lines.map((line) => (
              <label
                key={line.id}
                className="flex items-start gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={selectedSet.has(line.id)}
                  onChange={() => toggleLine(line.id)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">Line {line.lineNo}: {line.description || 'No description'}</p>
                  <p className="text-xs text-muted-foreground">{line.hoursPaid || 0}h</p>
                </div>
              </label>
            ))}
          </div>

          <p className={cn('text-xs', isValid ? 'text-muted-foreground' : 'text-destructive')}>
            Selected for v2: {selectedCount} · Remaining on current RO: {lines.length - selectedCount}
          </p>

          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">Version 2 status</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatusChoice('open')}
                disabled={isSaving}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  statusChoice === 'open' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
                )}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setStatusChoice('paid')}
                disabled={isSaving}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  statusChoice === 'paid' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
                )}
              >
                Paid
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm({ selectedLineIds, statusChoice })}
            disabled={!isValid || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving split…
              </>
            ) : 'Split & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
