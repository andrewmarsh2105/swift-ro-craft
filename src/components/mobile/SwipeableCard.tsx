import { ReactNode, useState, useRef } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Pencil, Copy, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SwipeableCardProps {
  children: ReactNode;
  roNumber?: string;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableCard({ 
  children, 
  roNumber,
  onEdit, 
  onDuplicate, 
  onDelete,
  onViewDetails,
  className 
}: SwipeableCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform for action reveals
  const leftActionOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rightActionOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) {
      // Swipe right - Duplicate
      setIsRevealed('right');
    } else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) {
      // Swipe left - Show delete/edit actions
      setIsRevealed('left');
    } else {
      setIsRevealed(null);
    }
    
    // Reset position
    x.set(0);
  };

  const handleActionClick = (action: 'edit' | 'delete' | 'duplicate') => {
    setIsRevealed(null);
    if (action === 'edit') onEdit?.();
    if (action === 'delete') setShowDeleteConfirm(true);
    if (action === 'duplicate') onDuplicate?.();
  };

  const handleConfirmDelete = () => {
    onDelete?.();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-xl" ref={containerRef}>
        {/* Left action - Duplicate (swipe right reveals this) */}
        <motion.div 
          className="swipe-action-duplicate absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-blue-500"
          style={{ opacity: leftActionOpacity }}
        >
          <Copy className="h-6 w-6 text-white" />
        </motion.div>

        {/* Right actions - Delete & Edit (swipe left reveals these) */}
        <motion.div 
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ opacity: rightActionOpacity }}
        >
          <button
            onClick={() => handleActionClick('edit')}
            className="w-16 flex items-center justify-center bg-primary"
          >
            <Pencil className="h-5 w-5 text-primary-foreground" />
          </button>
          <button
            onClick={() => handleActionClick('delete')}
            className="w-16 flex items-center justify-center bg-destructive"
          >
            <Trash2 className="h-5 w-5 text-destructive-foreground" />
          </button>
        </motion.div>

        {/* Revealed actions overlay */}
        <AnimatePresence>
          {isRevealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-stretch rounded-xl overflow-hidden"
            >
              {isRevealed === 'left' && (
                <>
                  <button
                    onClick={() => setIsRevealed(null)}
                    className="flex-1 bg-muted flex items-center justify-center"
                  >
                    <span className="text-sm font-medium text-muted-foreground">Cancel</span>
                  </button>
                  <button
                    onClick={() => handleActionClick('edit')}
                    className="w-20 bg-primary flex items-center justify-center tap-target"
                  >
                    <Pencil className="h-5 w-5 text-primary-foreground" />
                  </button>
                  <button
                    onClick={() => handleActionClick('delete')}
                    className="w-20 bg-destructive flex items-center justify-center tap-target"
                  >
                    <Trash2 className="h-5 w-5 text-destructive-foreground" />
                  </button>
                </>
              )}
              {isRevealed === 'right' && (
                <>
                  <button
                    onClick={() => handleActionClick('duplicate')}
                    className="w-20 bg-blue-500 flex items-center justify-center tap-target"
                  >
                    <Copy className="h-5 w-5 text-white" />
                  </button>
                  <button
                    onClick={() => setIsRevealed(null)}
                    className="flex-1 bg-muted flex items-center justify-center"
                  >
                    <span className="text-sm font-medium text-muted-foreground">Cancel</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main card */}
        <motion.div
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -100, right: 100 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 0.98 }}
          className={cn('card-mobile p-4 relative z-10 cursor-grab active:cursor-grabbing', className)}
        >
          <div className="flex items-start gap-2">
            <div 
              className="flex-1 touch-none"
              onClick={onViewDetails}
            >
              {children}
            </div>
            
            {/* 3-dot menu - always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-2 -mr-2 -mt-1 rounded-lg tap-target touch-feedback flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit} className="tap-target">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate} className="tap-target">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="tap-target text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete RO {roNumber ? `#${roNumber}` : ''}?</DialogTitle>
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
