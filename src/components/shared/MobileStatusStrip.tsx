import { Clock, AlertCircle, Flag, WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { maskHours } from '@/lib/maskHours';
import { cn } from '@/lib/utils';

interface MobileStatusStripProps {
  periodHours: number;
  roCount: number;
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
 * Single horizontal bar answering "Where am I in this pay period?" at a glance.
 */
export function MobileStatusStrip({
  periodHours,
  roCount,
  openCount,
  flaggedCount,
  hideTotals,
  isOffline = false,
  isSyncing = false,
  pendingCount = 0,
  className,
}: MobileStatusStripProps) {
  const paidCount = roCount - openCount;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-[5px] bg-muted/25 border-b border-border/40',
      className,
    )}>
      {/* Period hours — primary metric */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Clock className="h-3 w-3 text-primary/70 flex-shrink-0" />
        <span className="text-[13px] font-extrabold tabular-nums text-primary font-mono leading-none">
          {maskHours(periodHours, hideTotals)}h
        </span>
      </div>

      <Separator />

      {/* Paid / Open counts */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="flex items-center gap-[3px]">
          <CheckCircle2 className="h-2.5 w-2.5 text-[hsl(var(--status-warranty))]/70" />
          <span className="text-[10px] font-bold tabular-nums text-muted-foreground/80 leading-none">{paidCount}</span>
        </span>
        <span className="flex items-center gap-[3px]">
          <AlertCircle className="h-2.5 w-2.5 text-amber-500/70" />
          <span className={cn(
            'text-[10px] font-bold tabular-nums leading-none',
            openCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/50',
          )}>
            {openCount}
          </span>
        </span>
      </div>

      {/* Flags count — only when nonzero */}
      {flaggedCount > 0 && (
        <>
          <Separator />
          <div className="flex items-center gap-[3px] flex-shrink-0">
            <Flag className="h-2.5 w-2.5 text-orange-500/70" />
            <span className="text-[10px] font-bold tabular-nums text-orange-600 dark:text-orange-400 leading-none">
              {flaggedCount}
            </span>
          </div>
        </>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* Offline / sync indicator */}
      {isOffline && (
        <div className="flex items-center gap-1 text-muted-foreground/60 flex-shrink-0">
          <WifiOff className="h-3 w-3" />
          {pendingCount > 0 && (
            <span className="text-[9px] font-bold tabular-nums">{pendingCount}</span>
          )}
        </div>
      )}
      {!isOffline && isSyncing && (
        <Loader2 className="h-3 w-3 text-primary/50 animate-spin flex-shrink-0" />
      )}
    </div>
  );
}

function Separator() {
  return <div className="h-3 w-px bg-border/50 flex-shrink-0" />;
}
