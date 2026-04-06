import { useMemo } from 'react';
import { useFlagContext } from '@/contexts/FlagContext';
import { maskHours } from '@/lib/maskHours';
import { cn } from '@/lib/utils';
import type { RepairOrder } from '@/types/ro';

/**
 * Compact KPI strip for the dashboard showing period totals at a glance.
 * Receives filteredROs from ROListPanel (via DesktopWorkspace) so it always
 * stays in sync with what the list panel is showing.
 */
export function DashboardKPIBar({ className, filteredROs }: { className?: string; filteredROs: RepairOrder[] }) {
  const { userSettings } = useFlagContext();
  const hideTotals = userSettings.hideTotals ?? false;

  const stats = useMemo(() => {
    let totalHours = 0;
    let warranty = 0;
    let customerPay = 0;
    let internal = 0;
    let totalROs = 0;

    for (const ro of filteredROs) {
      if (!ro.paidDate) continue;
      totalROs++;

      if (ro.lines?.length) {
        for (const line of ro.lines) {
          const h = line.hoursPaid || 0;
          totalHours += h;
          const lt = line.laborType || ro.laborType;
          if (lt === 'warranty') warranty += h;
          else if (lt === 'customer-pay') customerPay += h;
          else internal += h;
        }
      } else {
        totalHours += ro.paidHours || 0;
        if (ro.laborType === 'warranty') warranty += ro.paidHours || 0;
        else if (ro.laborType === 'customer-pay') customerPay += ro.paidHours || 0;
        else internal += ro.paidHours || 0;
      }
    }

    return { totalHours, totalROs, warranty, customerPay, internal };
  }, [filteredROs]);

  return (
    <div className={cn(
      'flex items-center gap-4 px-4 py-1.5 border-b border-border/40 bg-card/60 backdrop-blur-sm text-xs',
      className,
    )}>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">Period</span>
        <span className="font-bold tabular-nums text-primary data-mono text-sm">
          {maskHours(stats.totalHours, hideTotals)}h
        </span>
      </div>

      <div className="h-3 w-px bg-border/50" />

      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-warranty))]" />
          <span className="tabular-nums data-mono">{maskHours(stats.warranty, hideTotals)}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-customer-pay))]" />
          <span className="tabular-nums data-mono">{maskHours(stats.customerPay, hideTotals)}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--status-internal))]" />
          <span className="tabular-nums data-mono">{maskHours(stats.internal, hideTotals)}</span>
        </span>
      </div>
    </div>
  );
}
