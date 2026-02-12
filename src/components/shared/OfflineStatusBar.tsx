import { WifiOff, CloudOff, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function OfflineStatusBar() {
  const { isOnline, pendingCount, syncing, conflicts, resolveConflict, processQueue } = useOffline();
  const [conflictOpen, setConflictOpen] = useState(false);

  // Nothing to show when online with no pending items
  if (isOnline && pendingCount === 0 && conflicts.length === 0 && !syncing) return null;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors',
          !isOnline
            ? 'bg-destructive/10 text-destructive border-b border-destructive/20'
            : syncing
              ? 'bg-primary/10 text-primary border-b border-primary/20'
              : conflicts.length > 0
                ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-b border-orange-500/20'
                : 'bg-muted text-muted-foreground border-b border-border'
        )}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Offline</span>
            {pendingCount > 0 && (
              <span className="ml-auto opacity-80">
                {pendingCount} pending
              </span>
            )}
          </>
        ) : syncing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
            <span>Syncing…</span>
          </>
        ) : conflicts.length > 0 ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{conflicts.length} need{conflicts.length > 1 ? '' : 's'} attention</span>
            <button
              onClick={() => setConflictOpen(true)}
              className="ml-auto underline text-xs hover:opacity-80"
            >
              Resolve
            </button>
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudOff className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{pendingCount} pending sync</span>
            <button
              onClick={() => processQueue()}
              className="ml-auto p-0.5 rounded hover:bg-muted"
              title="Retry sync"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </>
        ) : null}
      </div>

      {/* Conflict resolution dialog */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sync Conflicts</DialogTitle>
            <DialogDescription>
              Some changes couldn't be synced. Choose how to resolve each one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {conflicts.map((conflict) => (
              <div
                key={conflict.queuedAction.id}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium capitalize">
                    {conflict.queuedAction.type.replace(/([A-Z])/g, ' $1')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{conflict.error}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveConflict(conflict, 'local')}
                    className="text-xs"
                  >
                    Keep local
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveConflict(conflict, 'server')}
                    className="text-xs"
                  >
                    Discard local
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
