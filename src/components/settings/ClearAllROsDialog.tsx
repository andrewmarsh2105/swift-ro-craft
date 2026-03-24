import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ClearAllROsDialogProps {
  roCount: number;
  // Step 1
  showStep1: boolean;
  onCloseStep1: () => void;
  confirmText: string;
  setConfirmText: (v: string) => void;
  onFirstConfirm: () => void;
  // Step 2
  showStep2: boolean;
  onCloseStep2: () => void;
  onFinalConfirm: () => void;
}

export function ClearAllROsDialog({
  roCount,
  showStep1,
  onCloseStep1,
  confirmText,
  setConfirmText,
  onFirstConfirm,
  showStep2,
  onCloseStep2,
  onFinalConfirm,
}: ClearAllROsDialogProps) {
  return (
    <>
      <Dialog open={showStep1} onOpenChange={onCloseStep1}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle>Clear All ROs?</DialogTitle>
            </div>
            <DialogDescription className="text-left">
              This will permanently delete all {roCount} repair order{roCount !== 1 ? 's' : ''} and cannot be undone.
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
              onClick={onCloseStep1}
              className="flex-1 tap-target"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onFirstConfirm}
              disabled={confirmText.toUpperCase() !== 'DELETE'}
              className="flex-1 tap-target"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStep2} onOpenChange={onCloseStep2}>
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
              onClick={onCloseStep2}
              className="flex-1 tap-target"
            >
              No, Keep ROs
            </Button>
            <Button
              variant="destructive"
              onClick={onFinalConfirm}
              className="flex-1 tap-target"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Yes, Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
