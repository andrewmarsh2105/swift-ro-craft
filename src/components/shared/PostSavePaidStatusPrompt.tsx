import { Loader2, CircleDollarSign, FolderOpen } from 'lucide-react';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

export type PostSaveStatusChoice = 'paid' | 'open';

interface PostSavePaidStatusPromptProps {
  open: boolean;
  roNumber?: string;
  isSaving?: boolean;
  onChoose: (choice: PostSaveStatusChoice) => void;
  onDismiss: () => void;
}

export function PostSavePaidStatusPrompt({
  open,
  roNumber,
  isSaving = false,
  onChoose,
  onDismiss,
}: PostSavePaidStatusPromptProps) {
  const isMobile = useIsMobile();
  const title = roNumber ? `RO #${roNumber} saved` : 'RO saved';

  const content = (
    <>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">
          Choose the status now so totals, carryover, and filters stay accurate.
        </p>
      </div>

      <div className="grid gap-2 pt-3">
        <button
          type="button"
          onClick={() => onChoose('paid')}
          disabled={isSaving}
          className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-left transition-colors hover:bg-emerald-500/15 disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <CircleDollarSign className="h-4 w-4" />
            Mark Paid
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Counts in paid payroll totals immediately.
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChoose('open')}
          disabled={isSaving}
          className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-3 text-left transition-colors hover:bg-blue-500/15 disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <FolderOpen className="h-4 w-4" />
            Keep Open / Unpaid
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Excluded from paid totals until marked paid later.
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        disabled={isSaving}
        className="w-full pt-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
      >
        Decide later (leave open)
      </button>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={open} onClose={onDismiss} title="Choose RO status">
        <div className="px-4 pb-5 pt-2 space-y-2">
          {content}
          {isSaving && (
            <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating status…
            </div>
          )}
        </div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose RO status</DialogTitle>
          <DialogDescription>
            Set this now to keep paid totals and open carryover accurate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">{content}</div>

        <DialogFooter>
          {isSaving && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground mr-auto">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating status…
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
