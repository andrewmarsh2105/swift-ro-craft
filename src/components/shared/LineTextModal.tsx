import { useEffect, useRef } from 'react';
import { X, Copy, Check } from 'lucide-react';
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
}

export function LineTextModal({ open, onClose, lineNo, description, onEdit }: LineTextModalProps) {
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
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-border bg-muted/50 hover:bg-muted text-sm font-medium transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy text
            </>
          )}
        </button>

        {onEdit && (
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Edit
          </button>
        )}

        <button
          onClick={onClose}
          className={cn(
            'flex items-center justify-center h-10 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors',
            onEdit ? 'px-4' : 'flex-1'
          )}
        >
          Close
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    // Bottom sheet style for mobile
    if (!open) return null;
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Sheet */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="px-4 pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Line L{lineNo}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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
