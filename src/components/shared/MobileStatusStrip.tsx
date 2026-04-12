import { Clock, AlertCircle, Flag, WifiOff, Loader2 } from 'lucide-react';
import { maskHours } from '@/lib/maskHours';
import { cn } from '@/lib/utils';

interface MobileStatusStripProps {
  periodHours: number;
  openCount: number;
  flaggedCount: number;
  hideTotals: boolean;
  isOffline?: boolean;
  isSyncing?: boolean;
  pendingCount?: number;
  className?: string;
}

/**
 * Compact, high-trust KPI strip for the mobile ROs tab.
 * Answers "Where am I in this pay period?" at a glance.
 */
export function MobileStatusStrip({
  periodHours,
  openCount,
  flaggedCount,
  hideTotals,
  isOffline = false,
  isSyncing = false,
  pendingCount = 0,
  className,
}: MobileStatusStripProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-1.5 bg-muted/30 border-b border-border/40',
      className,
    )}>
      {/* Period hours — primary metric */}
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3 text-primary/60 flex-shrink-0" />
        <span className="text-[12px] font-bold tabular-nums text-primary font-mono leading-none">
          {maskHours(periodHours, hideTotals)}h
        </span>
      </div>

      <div className="h-3 w-px bg-border/50" />

      {/* Open/unpaid count */}
      <div className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3 text-amber-500/70 flex-shrink-0" />
        <span className={cn(
          'text-[11px] font-semibold tabular-nums leading-none',
          openCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/60',
        )}>
          {openCount}
        </span>
        <span className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground/50 font-medium">open</span>
      </div>

      {/* Flags count */}
      {flaggedCount > 0 && (
        <>
          <div className="h-3 w-px bg-border/50" />
          <div className="flex items-center gap-1">
            <Flag className="h-3 w-3 text-orange-500/70 flex-shrink-0" />
            <span className="text-[11px] font-semibold tabular-nums text-orange-600 dark:text-orange-400 leading-none">
              {flaggedCount}
            </span>
          </div>
        </>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* Offline / sync indicator */}
      {isOffline && (
        <div className="flex items-center gap-1 text-muted-foreground/60">
          <WifiOff className="h-3 w-3" />
          {pendingCount > 0 && (
            <span className="text-[9px] font-semibold tabular-nums">{pendingCount}</span>
          )}
        </div>
      )}
      {!isOffline && isSyncing && (
        <Loader2 className="h-3 w-3 text-primary/50 animate-spin" />
      )}
    </div>
  );
}
