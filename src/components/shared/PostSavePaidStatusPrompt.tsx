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
}

export function PostSavePaidStatusPrompt({
  open,
  roNumber,
  isSaving = false,
  onChoose,
}: PostSavePaidStatusPromptProps) {
  const isMobile = useIsMobile();
  const title = roNumber ? `RO #${roNumber} saved` : 'RO saved';

  const buttons = (
    <div className="grid gap-2">
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
          Added to paid totals right away.
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
          Keep Open
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Won't count in paid totals until marked paid.
        </span>
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={open} onClose={() => {}} title={title}>
        <div className="px-4 pb-6 pt-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Pick a status to keep your totals accurate.
          </p>
          {buttons}
          <p className="text-xs text-muted-foreground">
            Choose one option to finish saving and close this RO.
          </p>
          {isSaving && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating…
            </div>
          )}
        </div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick a status to keep paid totals and open carryover accurate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">{buttons}</div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Choose one option to finish saving.
            </span>
            {isSaving && (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating…
              </span>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
