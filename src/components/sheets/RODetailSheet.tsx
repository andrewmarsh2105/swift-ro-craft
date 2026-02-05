import { useState } from 'react';
import { Pencil, Copy, Trash2, Calendar, User, Clock, Wrench, ChevronDown, ChevronUp, List } from 'lucide-react';
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
  const [showLines, setShowLines] = useState(true);

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

  const hasLines = ro.lines && ro.lines.length > 0;
  const linesTotalHours = hasLines 
    ? ro.lines.reduce((sum, line) => sum + line.hoursPaid, 0) 
    : ro.paidHours;

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
                  {linesTotalHours.toFixed(1)}h
                </div>
                <StatusPill type={ro.laborType} size="lg" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {hasLines ? (
                  <>
                    <List className="h-4 w-4" />
                    <span>{ro.lines.length} lines</span>
                  </>
                ) : (
                  <span>Simple entry</span>
                )}
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
                label="Total Hours"
                value={`${linesTotalHours.toFixed(1)} hours`}
              />
            </div>

            {/* Lines Section */}
            {hasLines && (
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowLines(!showLines)}
                  className="w-full p-4 flex items-center justify-between touch-feedback bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <List className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">Line Items</span>
                    <span className="text-sm text-muted-foreground">({ro.lines.length})</span>
                  </div>
                  {showLines ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                
                <AnimatePresence initial={false}>
                  {showLines && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-border">
                        {ro.lines.map((line) => (
                          <div key={line.id} className="p-4 space-y-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                    Line {line.lineNo}
                                  </span>
                                  {line.laborType && (
                                    <StatusPill type={line.laborType} size="sm" />
                                  )}
                                </div>
                                <p className="font-medium text-foreground">
                                  {line.description || 'No description'}
                                </p>
                              </div>
                              <div className="text-lg font-bold text-primary flex-shrink-0">
                                {line.hoursPaid.toFixed(1)}h
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Lines Total */}
                      <div className="p-4 bg-primary/5 border-t border-border flex items-center justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-xl font-bold text-primary">
                          {linesTotalHours.toFixed(1)}h
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Work Performed (for simple mode or additional info) */}
            {(!hasLines || ro.workPerformed) && (
              <DetailRow 
                icon={<Wrench className="h-5 w-5" />}
                label="Work Performed"
                value={ro.workPerformed || 'No description'}
                multiline
              />
            )}

            {/* Notes */}
            {ro.notes && (
              <div className="p-4 bg-secondary/50 rounded-xl">
                <div className="text-sm text-muted-foreground mb-1">Notes</div>
                <p className="text-foreground whitespace-pre-wrap">{ro.notes}</p>
              </div>
            )}

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
