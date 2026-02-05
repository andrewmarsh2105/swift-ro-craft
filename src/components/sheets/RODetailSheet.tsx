import { useState } from 'react';
import { X, Pencil, Copy, Trash2, Calendar, User, Clock, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { StatusPill } from '@/components/mobile/StatusPill';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RepairOrder } from '@/types/ro';

interface RODetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ro: RepairOrder | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function RODetailSheet({ 
  isOpen, 
  onClose, 
  ro, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: RODetailSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!ro) return null;

  const formattedDate = new Date(ro.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <BottomSheet 
        isOpen={isOpen} 
        onClose={onClose} 
        title={`RO #${ro.roNumber}`}
        fullHeight
      >
        <div className="flex flex-col h-full">
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-primary">
                  {ro.paidHours.toFixed(1)}h
                </div>
                <StatusPill type={ro.laborType} size="lg" />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <DetailRow 
                icon={<Calendar className="h-5 w-5" />}
                label="Date"
                value={formattedDate}
              />
              <DetailRow 
                icon={<User className="h-5 w-5" />}
                label="Advisor"
                value={ro.advisor}
              />
              <DetailRow 
                icon={<Clock className="h-5 w-5" />}
                label="Paid Hours"
                value={`${ro.paidHours} hours`}
              />
              <DetailRow 
                icon={<Wrench className="h-5 w-5" />}
                label="Work Performed"
                value={ro.workPerformed || 'No description'}
                multiline
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onEdit}
                className="flex-1 tap-target"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={onDuplicate}
                className="flex-1 tap-target"
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </div>
          </div>

          {/* Delete button - fixed at bottom */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-border bg-background safe-area-bottom">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full tap-target"
              size="lg"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Delete RO
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete RO #{ro.roNumber}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the repair order and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 tap-target"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-1 tap-target"
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

function DetailRow({ 
  icon, 
  label, 
  value, 
  multiline = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 p-2 bg-secondary rounded-lg text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`font-medium ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}
