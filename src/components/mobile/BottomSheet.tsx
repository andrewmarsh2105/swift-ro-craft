import { ReactNode, useEffect, useId, useRef } from 'react';
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
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const sheet = sheetRef.current;
    if (!sheet) return;

    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusable[0];
    // On touch devices don't auto-focus inputs/textareas — it triggers the
    // iOS keyboard and viewport zoom before the user has seen the sheet.
    const isTouchDevice = 'ontouchstart' in window;
    const autoFocusWouldZoom =
      isTouchDevice &&
      (firstFocusable instanceof HTMLInputElement ||
        firstFocusable instanceof HTMLTextAreaElement);
    if (firstFocusable && !autoFocusWouldZoom) {
      firstFocusable.focus();
    } else {
      sheet.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const interactive = sheet.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!interactive.length) {
        event.preventDefault();
        return;
      }
      const first = interactive[0];
      const last = interactive[interactive.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
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
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl flex flex-col',
              fullScreen ? 'top-[env(safe-area-inset-top,0px)]' : fullHeight ? 'h-[95vh]' : 'max-h-[85vh]',
              className
            )}
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
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
                <h2 id={titleId} className="text-lg font-semibold text-center">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className={cn(
              'flex-1 min-h-0',
              fullScreen
                ? 'flex flex-col overflow-hidden'
                : 'overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]'
            )}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
