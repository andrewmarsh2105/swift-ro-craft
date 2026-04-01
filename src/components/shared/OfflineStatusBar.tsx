import { WifiOff, CloudOff, RefreshCw, AlertTriangle, Loader2, ServerCrash } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';
import { useROSafe } from '@/contexts/ROContext';
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

/** Human-readable age of a cached snapshot, e.g. "12m ago" or "2h ago". */
function formatCacheAge(savedAt: string): string {
  const ms = Date.now() - new Date(savedAt).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function OfflineStatusBar() {
  const { isOnline, pendingCount, syncing, conflicts, resolveConflict, processQueue } = useOffline();
  const roStore = useROSafe();
  const dataSource = roStore?.dataSource ?? 'loading';
  const cachedAt = roStore?.cachedAt ?? null;
  const fetchError = roStore?.fetchError ?? false;
  const fetchErrorMessage = roStore?.fetchErrorMessage ?? null;

  const [conflictOpen, setConflictOpen] = useState(false);

  // Conditions that require the bar to be visible.
  const showOfflineBanner = !isOnline;
  const showServerErrorBanner = isOnline && fetchError && dataSource !== 'live';
  const showSyncing = isOnline && syncing;
  const showConflicts = isOnline && !syncing && conflicts.length > 0;
  const showPending = isOnline && !syncing && conflicts.length === 0 && pendingCount > 0;

  if (!showOfflineBanner && !showServerErrorBanner && !showSyncing && !showConflicts && !showPending) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors',
          showOfflineBanner
            ? 'bg-destructive/10 text-destructive border-b border-destructive/20'
            : showServerErrorBanner
              ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-b border-orange-500/20'
              : showSyncing
                ? 'bg-primary/10 text-primary border-b border-primary/20'
                : showConflicts
                  ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-b border-orange-500/20'
                  : 'bg-muted text-muted-foreground border-b border-border',
        )}
      >
        {showOfflineBanner ? (
          <>
            <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
            {dataSource === 'cache' && cachedAt ? (
              <span>
                Offline
                <span className="opacity-70"> · saved data from {formatCacheAge(cachedAt)}</span>
              </span>
            ) : dataSource === 'live' ? (
              // Went offline after a successful fetch — data is still accurate.
              <span>Offline</span>
            ) : (
              // Offline on first open with no cache.
              <span>Offline · no saved data available</span>
            )}
            {pendingCount > 0 && (
              <span className="ml-auto opacity-75 tabular-nums">
                {pendingCount} unsaved {pendingCount === 1 ? 'change' : 'changes'}
              </span>
            )}
          </>
        ) : showServerErrorBanner ? (
          <>
            <ServerCrash className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {fetchErrorMessage?.includes('42P01')
                ? 'Database tables missing — migrations not deployed to this project'
                : fetchErrorMessage?.includes('JWT') || fetchErrorMessage?.includes('401') || fetchErrorMessage?.includes('apikey')
                  ? 'Auth error — Supabase API key may be wrong for this project'
                  : cachedAt
                    ? `Can't reach server · showing saved data from ${formatCacheAge(cachedAt)}`
                    : `Can't reach server`}
            </span>
            <button
              onClick={() => processQueue()}
              className="ml-auto p-0.5 rounded hover:bg-orange-500/10 quiet-transition"
              title="Retry connection"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </>
        ) : showSyncing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
            <span>Syncing {pendingCount > 0 ? `${pendingCount} change${pendingCount > 1 ? 's' : ''}` : ''}…</span>
          </>
        ) : showConflicts ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {conflicts.length} {conflicts.length === 1 ? 'change needs' : 'changes need'} attention
            </span>
            <button
              onClick={() => setConflictOpen(true)}
              className="ml-auto underline text-xs hover:opacity-80"
            >
              Resolve
            </button>
          </>
        ) : showPending ? (
          <>
            <CloudOff className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} waiting to sync
            </span>
            <button
              onClick={() => processQueue()}
              className="ml-auto p-0.5 rounded hover:bg-muted quiet-transition"
              title="Sync now"
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
              Some changes couldn't be synced automatically. Choose what to keep for each one.
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
                    Keep my change
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveConflict(conflict, 'server')}
                    className="text-xs text-destructive"
                  >
                    Discard
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
