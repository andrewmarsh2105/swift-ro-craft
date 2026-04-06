import { useMemo } from 'react';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { computeDateRangeBounds } from '@/lib/dateRangeFilter';
import { hasPaidDate } from '@/lib/paidDate';
import { effectiveDate } from '@/lib/roDisplay';
import { maskHours } from '@/lib/maskHours';
import { getDefaultPeriodFilter } from '@/lib/payPeriodRange';
import { useSharedDateRange } from '@/hooks/useSharedDateRange';
import { cn } from '@/lib/utils';

/**
 * Compact KPI strip for the dashboard showing period totals at a glance.
 * Designed to sit at the top of the desktop workspace or above the mobile RO list.
 */
export function DashboardKPIBar({ className }: { className?: string }) {
  const { ros } = useRO();
  const { userSettings } = useFlagContext();
  const hideTotals = userSettings.hideTotals ?? false;

  const defaultFilter = getDefaultPeriodFilter(userSettings);
  const { dateFilter } = useSharedDateRange('week', 'desktop-list', userSettings);

  const bounds = useMemo(() => computeDateRangeBounds({
    filter: dateFilter || defaultFilter,
    weekStartDay: userSettings.weekStartDay ?? 0,
    payPeriodType: userSettings.payPeriodType,
    payPeriodEndDates: (userSettings.payPeriodEndDates || []) as number[],
    hasCustomPayPeriod: !!(userSettings.payPeriodEndDates?.length),
  }), [dateFilter, defaultFilter, userSettings.weekStartDay, userSettings.payPeriodType, userSettings.payPeriodEndDates]);

  const stats = useMemo(() => {
    if (!bounds) return { totalHours: 0, totalROs: 0, warranty: 0, customerPay: 0, internal: 0 };
    const startKey = new Date(`${bounds.start}T00:00:00`).getTime();
    const endKey = new Date(`${bounds.end}T23:59:59`).getTime();

    let totalHours = 0;
    let warranty = 0;
    let customerPay = 0;
    let internal = 0;
    let totalROs = 0;

    for (const ro of ros) {
      if (!hasPaidDate(ro)) continue;
      const effDate = new Date(`${effectiveDate(ro)}T12:00:00`).getTime();
      if (effDate < startKey || effDate > endKey) continue;
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
  }, [ros, bounds]);

  if (!bounds) return null;

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

      <div className="h-3 w-px bg-border/50" />

      <span className="text-muted-foreground/60 tabular-nums">{stats.totalROs} ROs</span>
    </div>
  );
}
