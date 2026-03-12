import { useEffect, useRef } from 'react';
import { X, Copy, Check, BookmarkPlus } from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LineTextModalProps {
  open: boolean;
  onClose: () => void;
  lineNo: number;
  description: string;
  onEdit?: () => void;
  onSaveAsPreset?: () => void;
}

export function LineTextModal({ open, onClose, lineNo, description, onEdit, onSaveAsPreset }: LineTextModalProps) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = description;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = () => {
    onClose();
    onEdit?.();
  };

  const content = (
    <div className="flex flex-col gap-4">
      <p className={cn(
        'text-foreground leading-relaxed whitespace-pre-wrap break-words',
        isMobile ? 'text-base' : 'text-sm'
      )}>
        {description || <span className="text-muted-foreground italic">No description</span>}
      </p>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-border bg-muted/50 hover:bg-muted text-sm font-medium transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </button>

        {onSaveAsPreset && (
          <button
            onClick={() => { onSaveAsPreset(); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-border bg-muted/50 hover:bg-muted text-sm font-medium transition-colors"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save Preset
          </button>
        )}

        {onEdit && (
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Edit
          </button>
        )}

        <button
          onClick={onClose}
          className={cn(
            'flex items-center justify-center h-11 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors',
            (onEdit || onSaveAsPreset) ? 'px-4' : 'flex-1'
          )}
        >
          Close
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    // Bottom sheet style for mobile — rendered via portal above save bar
    if (!open) return null;

    // Save bar is ~120px tall; we add that as extra bottom padding so content
    // is always visible and nothing is hidden behind it.
    const SAVE_BAR_HEIGHT = 120;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          style={{ zIndex: 9998 }}
          onClick={onClose}
        />
        {/* Sheet — z-index above save bar (z-50 = 50, save bar z-50) */}
        <div
          className="fixed left-0 right-0 bottom-0 bg-card rounded-t-2xl shadow-2xl flex flex-col"
          style={{
            zIndex: 9999,
            maxHeight: '80vh',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Fixed header */}
          <div className="px-4 pb-3 flex items-center justify-between flex-shrink-0">
            <h2 className="text-base font-semibold">Line L{lineNo}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div
            className="overflow-y-auto px-4"
            style={{
              paddingBottom: `calc(${SAVE_BAR_HEIGHT}px + env(safe-area-inset-bottom, 16px))`,
            }}
          >
            {content}
          </div>
        </div>
      </>
    );
  }

  // Desktop dialog
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Line L{lineNo}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
