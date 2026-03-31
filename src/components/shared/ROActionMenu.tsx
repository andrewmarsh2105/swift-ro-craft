import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, Flag, CheckCircle2, LockOpen, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ROActionMenuProps {
  roNumber: string;
  isPaid: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onFlag?: () => void;
  onTogglePaid?: () => void;
  isTogglePaidPending?: boolean;
  existingRONumbers?: string[];
  className?: string;
}

export function ROActionMenu({ roNumber, isPaid, onEdit, onDelete, onFlag, onTogglePaid, isTogglePaidPending = false, existingRONumbers = [], className }: ROActionMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  const handleDeleteClick = () => {
    setOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleStatusClick = () => {
    setOpen(false);
    setShowStatusConfirm(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!onTogglePaid || isTogglePaidPending || isConfirmingStatus) return;
    setIsConfirmingStatus(true);
    try {
      await Promise.resolve(onTogglePaid());
      setShowStatusConfirm(false);
    } finally {
      setIsConfirmingStatus(false);
    }
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const triggerButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpen(true);
      }}
      className={cn(
        'p-2 rounded-lg transition-colors flex-shrink-0',
        'text-muted-foreground hover:text-foreground hover:bg-muted',
        className
      )}
      aria-label="RO actions"
    >
      <MoreVertical className="h-5 w-5" />
    </button>
  );

  const menuItems = (
    <>
      {/* Edit */}
      <button
        onClick={() => handleAction(onEdit)}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors rounded-lg"
      >
        <Pencil className="h-4 w-4 text-muted-foreground" />
        Edit
      </button>

      {/* Flag */}
      {onFlag && (
        <button
          onClick={() => handleAction(onFlag)}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors rounded-lg"
        >
          <Flag className="h-4 w-4 text-orange-500" />
          Flag
        </button>
      )}

      {/* Open / Paid toggle */}
      {onTogglePaid && (
        <button
          onClick={handleStatusClick}
          disabled={isTogglePaidPending}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
            isTogglePaidPending
              ? "text-muted-foreground cursor-not-allowed"
              : "text-foreground hover:bg-muted",
          )}
        >
          {isTogglePaidPending ? (
            <>
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              Saving status…
            </>
          ) : isPaid ? (
            <>
              <LockOpen className="h-4 w-4 text-amber-500" />
              Mark as Open…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Mark as Paid…
            </>
          )}
        </button>
      )}

      {/* Separator */}
      <div className="my-1 h-px bg-border" />

      {/* Delete */}
      <button
        onClick={handleDeleteClick}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors rounded-lg"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </>
  );

  return (
    <>
      {isMobile ? (
        <>
          {triggerButton}
          <BottomSheet isOpen={open} onClose={() => setOpen(false)}>
            <div className="px-4 pt-1 pb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                RO #{roNumber}
              </p>
            </div>
            <div className="px-2 pb-6">
              {menuItems}
            </div>
          </BottomSheet>
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={4}
            className="w-48 p-1.5 rounded-xl shadow-lg border border-border bg-popover z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              RO #{roNumber}
            </p>
            {menuItems}
          </PopoverContent>
        </Popover>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete RO #{roNumber}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. This will permanently delete the repair order and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paid/Open confirmation — mobile uses sheet, desktop uses dialog */}
      {isMobile ? (
        <BottomSheet isOpen={showStatusConfirm} onClose={() => !isConfirmingStatus && setShowStatusConfirm(false)} title={isPaid ? 'Mark RO Open?' : 'Mark RO Paid?'}>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {isPaid
                ? 'This RO will move back to Open and show in open counts again.'
                : 'This RO will be marked Paid and included in paid totals/exports.'}
            </p>
            <p className="text-xs text-muted-foreground/80">You can change this again anytime from RO actions.</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowStatusConfirm(false)}
                disabled={isConfirmingStatus}
              >
                Keep as {isPaid ? 'Paid' : 'Open'}
              </Button>
              <Button
                onClick={handleConfirmStatusChange}
                disabled={isTogglePaidPending || isConfirmingStatus}
              >
                {(isTogglePaidPending || isConfirmingStatus) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  isPaid ? 'Mark Open' : 'Mark Paid'
                )}
              </Button>
            </div>
          </div>
        </BottomSheet>
      ) : (
        <Dialog open={showStatusConfirm} onOpenChange={(next) => !isConfirmingStatus && setShowStatusConfirm(next)}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>{isPaid ? 'Move RO back to Open?' : 'Mark RO as Paid?'}</DialogTitle>
              <DialogDescription>
                {isPaid
                  ? 'This restores the RO to Open status so it appears in open totals and workflows.'
                  : 'This marks the RO as Paid so it counts toward paid totals and exports.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-3 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStatusConfirm(false)}
                disabled={isConfirmingStatus}
                className="flex-1"
              >
                Keep as {isPaid ? 'Paid' : 'Open'}
              </Button>
              <Button
                onClick={handleConfirmStatusChange}
                disabled={isTogglePaidPending || isConfirmingStatus}
                className="flex-1"
              >
                {(isTogglePaidPending || isConfirmingStatus) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  isPaid ? 'Mark Open' : 'Mark Paid'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </>
  );
}
