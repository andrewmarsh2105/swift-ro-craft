import { useState } from 'react';
import { AlertTriangle, ArrowRight, Flag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddFlagDialog } from './AddFlagDialog';
import { cn } from '@/lib/utils';
import type { ReviewIssue } from '@/lib/reviewRules';
import type { FlagType } from '@/types/flags';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

interface ReviewIndicatorProps {
  issues: ReviewIssue[];
  onConvertToFlag: (issue: ReviewIssue, flagType: FlagType, note?: string) => void;
  onGoToLine?: (lineId: string) => void;
  onGoToDuplicateRO?: (roId: string) => void;
  size?: 'sm' | 'md';
}

export function ReviewIndicator({ issues, onConvertToFlag, onGoToLine, onGoToDuplicateRO, size = 'sm' }: ReviewIndicatorProps) {
  const [open, setOpen] = useState(false);
  const [convertingIssue, setConvertingIssue] = useState<ReviewIssue | null>(null);
  const isMobile = useIsMobile();

  if (issues.length === 0) return null;

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const issueList = (
    <div className="space-y-2 p-1">
      {issues.map((issue, i) => (
        <div
          key={`${issue.code}-${issue.lineId || i}`}
          className={cn(
            'px-3 py-3 rounded-xl border',
            issue.severity === 'error'
              ? 'bg-destructive/10 border-destructive/30'
              : 'bg-yellow-500/10 border-yellow-500/30'
          )}
        >
          <p className={cn(
            'text-sm font-semibold mb-0.5',
            issue.severity === 'error' ? 'text-destructive' : 'text-yellow-600'
          )}>
            {issue.title}
          </p>
          <p className="text-xs text-muted-foreground mb-2">{issue.detail}</p>
          <div className="flex gap-1.5 flex-wrap">
            {issue.suggestedAction === 'go_to_line' && issue.lineId && onGoToLine && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onGoToLine(issue.lineId!);
                  setOpen(false);
                }}
                className="h-7 text-[11px]"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Go to line {issue.lineNo}
              </Button>
            )}
            {issue.code === 'duplicate_ro' && issue.duplicateRoIds && onGoToDuplicateRO ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onGoToDuplicateRO(issue.duplicateRoIds![0]);
                  setOpen(false);
                }}
                className="h-7 text-[11px] text-blue-600 border-blue-500/40"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Go to duplicate RO
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConvertingIssue(issue)}
                className="h-7 text-[11px] text-orange-600 border-orange-500/40"
              >
                <Flag className="h-3 w-3 mr-1" />
                Convert to flag
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const content = isMobile ? (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Needs Review
          </DrawerTitle>
          <DrawerDescription>
            {issues.length} issue{issues.length !== 1 ? 's' : ''} found on this RO.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
          {issueList}
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Needs Review
          </DialogTitle>
          <DialogDescription>
            {issues.length} issue{issues.length !== 1 ? 's' : ''} found on this RO.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto">
          {issueList}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full bg-yellow-500/12 px-1.5 py-1 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/20 transition-colors"
        title={`${issues.length} review issue${issues.length !== 1 ? 's' : ''}`}
      >
        <AlertTriangle className={iconSize} />
      </button>

      {content}

      {convertingIssue && (
        <AddFlagDialog
          open={!!convertingIssue}
          onClose={() => setConvertingIssue(null)}
          onSubmit={(flagType, note) => {
            onConvertToFlag(convertingIssue, flagType, note);
            setConvertingIssue(null);
          }}
          title="Convert to Flag"
        />
      )}
    </>
  );
}
