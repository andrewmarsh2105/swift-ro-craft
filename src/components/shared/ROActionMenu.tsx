import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, Flag } from 'lucide-react';
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
  onEdit: () => void;
  onDelete: () => void;
  onFlag?: () => void;
  existingRONumbers?: string[];
  className?: string;
}

export function ROActionMenu({ roNumber, onEdit, onDelete, onFlag, existingRONumbers = [], className }: ROActionMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  const handleDeleteClick = () => {
    setOpen(false);
    setShowDeleteConfirm(true);
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

    </>
  );
}
