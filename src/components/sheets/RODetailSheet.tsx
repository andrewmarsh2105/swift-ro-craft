import { useState, useEffect } from 'react';
import { Pencil, Copy, Trash2, Calendar, User, Clock, Wrench, ChevronDown, ChevronUp, List, FileText, Settings2, AlertTriangle } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { RepairOrder } from '@/types/ro';

interface RODetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ro: RepairOrder | null;
  onEdit: () => void;
  onDuplicate: (newRONumber: string) => void;
  onDelete: () => void;
  existingRONumbers?: string[];
}

export function RODetailSheet({ 
  isOpen, 
  onClose, 
  ro, 
  onEdit, 
  onDuplicate, 
  onDelete,
  existingRONumbers = [],
}: RODetailSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [dupRONumber, setDupRONumber] = useState('');
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  useEffect(() => {
    if (showDuplicateDialog) {
      setDupRONumber('');
      setDupWarning(null);
    }
  }, [showDuplicateDialog]);

  const handleDuplicateConfirm = (force: boolean = false) => {
    const trimmed = dupRONumber.trim();
    if (!trimmed) return;
    if (!force && existingRONumbers.includes(trimmed)) {
      setDupWarning(`RO #${trimmed} already exists.`);
      return;
    }
    setShowDuplicateDialog(false);
    onDuplicate(trimmed);
    onClose();
  };

  if (!ro) return null;

  const formattedDate = new Date(ro.date).toLocaleDateString('en-US', {
    month: 'short',
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
    ? ro.lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0) 
    : ro.paidHours;

  return (
    <>
      <BottomSheet 
        isOpen={isOpen} 
        onClose={onClose} 
        title=""
        fullHeight
      >
        <div className="flex flex-col h-full">
          {/* Minimal Sticky Header Strip */}
          <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
            {/* Primary row: RO #, Advisor, Date, Total Hours */}
            <div className="flex items-center gap-3">
              {/* RO # */}
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-lg">#{ro.roNumber}</span>
              </div>
              
              {/* Advisor */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{ro.advisor}</span>
              </div>
              
              {/* Date */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
              
              <div className="flex-1" />
              
              {/* Total Hours - Prominent */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary rounded-lg">
                <Clock className="h-4 w-4 text-primary-foreground" />
                <span className="text-lg font-bold text-primary-foreground">{linesTotalHours.toFixed(1)}h</span>
              </div>
            </div>

            {/* Collapsible More Details */}
            <Collapsible open={showMoreDetails} onOpenChange={setShowMoreDetails}>
              <CollapsibleTrigger asChild>
                <button className="w-full mt-2 py-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Settings2 className="h-3 w-3" />
                  {showMoreDetails ? 'Hide' : 'More'} details
                  {showMoreDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-2 space-y-2 border-t border-border/50 mt-2">
                  {ro.customerName && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">Customer</span>
                      <span className="text-sm">{ro.customerName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">Labor Type</span>
                    <StatusPill type={ro.laborType} size="sm" />
                  </div>
                  {ro.notes && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground w-20">Notes</span>
                      <p className="text-sm flex-1">{ro.notes}</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Lines Section */}
            {hasLines && (
              <div className="border-b border-border">
                <button
                  onClick={() => setShowLines(!showLines)}
                  className="w-full px-4 py-3 flex items-center justify-between touch-feedback bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Line Items</span>
                    <span className="text-xs text-muted-foreground">({ro.lines.length})</span>
                  </div>
                  {showLines ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
                      <div className="divide-y divide-border/50">
                        {ro.lines.map((line) => (
                          <div key={line.id} className="px-4 py-2.5 bg-background">
                            {/* Row 1: Line # + Description */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                L{line.lineNo}
                              </span>
                              <span className="flex-1 text-sm font-medium truncate">
                                {line.description || 'No description'}
                              </span>
                              <span className="text-sm font-bold text-primary flex-shrink-0">
                                {line.hoursPaid.toFixed(1)}h
                              </span>
                            </div>
                            {/* Row 2: Labor Type */}
                            {line.laborType && (
                              <div className="pl-7">
                                <StatusPill type={line.laborType} size="sm" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Lines Total */}
                      <div className="px-4 py-2.5 bg-primary/5 border-t border-border flex items-center justify-between">
                        <span className="font-semibold text-sm">Total</span>
                        <span className="text-lg font-bold text-primary">
                          {linesTotalHours.toFixed(1)}h
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Work Performed (for simple mode or additional info) */}
            {(!hasLines && ro.workPerformed) && (
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-start gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">Work Performed</div>
                    <p className="text-sm whitespace-pre-wrap">{ro.workPerformed}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="px-4 py-4 space-y-3">
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
                  onClick={() => setShowDuplicateDialog(true)}
                  className="flex-1 tap-target"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
              </div>
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

      {/* Duplicate RO dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Duplicate RO #{ro.roNumber}</DialogTitle>
            <DialogDescription>
              Enter a new RO number for the duplicate. Advisor and line items will be copied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <input
              type="text"
              inputMode="numeric"
              value={dupRONumber}
              onChange={(e) => {
                setDupRONumber(e.target.value);
                setDupWarning(null);
              }}
              placeholder="New RO #"
              className="w-full h-10 px-3 bg-muted rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && dupRONumber.trim()) {
                  handleDuplicateConfirm();
                }
              }}
            />
            {dupWarning && (
              <div className="flex items-start gap-2 p-2.5 bg-warning/10 border border-warning/30 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-warning font-medium">{dupWarning}</p>
                  <button
                    onClick={() => handleDuplicateConfirm(true)}
                    className="text-xs text-primary underline mt-1"
                  >
                    Continue anyway
                  </button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDuplicateDialog(false)}
              className="flex-1 tap-target"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleDuplicateConfirm()}
              disabled={!dupRONumber.trim()}
              className="flex-1 tap-target"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
