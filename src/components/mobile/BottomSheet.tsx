import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  fullScreen?: boolean;
  fullHeight?: boolean;
  className?: string;
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  title,
  fullScreen = false,
  fullHeight = false,
  className 
}: BottomSheetProps) {
  const dragControls = useDragControls();

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 100) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl flex flex-col',
              fullScreen ? 'top-[env(safe-area-inset-top,0px)]' : fullHeight ? 'h-[95vh]' : 'max-h-[85vh]',
              className
            )}
            style={{
              boxShadow: 'var(--shadow-sheet)',
            }}
          >
            {/* Handle */}
            <div 
              className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="bottom-sheet-handle" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-4 pb-3 border-b border-border flex-shrink-0">
                <h2 className="text-lg font-semibold text-center">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
