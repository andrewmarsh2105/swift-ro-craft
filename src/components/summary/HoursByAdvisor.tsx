import { useState } from 'react';
import { maskHours } from '@/lib/maskHours';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';

interface AdvisorData {
  advisor: string;
  totalHours: number;
  warrantyHours: number;
  customerPayHours: number;
  internalHours: number;
  roCount: number;
}

interface HoursByAdvisorProps {
  byAdvisor: AdvisorData[];
  hideTotals: boolean;
}

export function HoursByAdvisor({ byAdvisor, hideTotals }: HoursByAdvisorProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleAdvisors = showAll ? byAdvisor : byAdvisor.slice(0, 5);
  const hasMore = byAdvisor.length > 5;
  const maxHours = Math.max(...byAdvisor.map(a => a.totalHours), 1);

  return (
    <div className="border border-border/40 bg-card overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
      <div className="px-4 pt-2.5 pb-1.5">
        <span className="data-header">Hours by Advisor</span>
      </div>
      {byAdvisor.length === 0 ? (
        <div className="px-4 pb-3 text-xs text-muted-foreground">No data for this range</div>
      ) : (
        <>
          <Table>
            <TableBody>
              {visibleAdvisors.map((adv) => (
                <TableRow key={adv.advisor} className="border-border/30">
                  <TableCell className="py-2 pl-4">
                    <div className="text-sm font-semibold">{adv.advisor}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${Math.max(8, (adv.totalHours / maxHours) * 100)}%` }}
                      />
                    </div>
                    <div className="flex gap-1.5 mt-0.5">
                      {!hideTotals && adv.warrantyHours > 0 && <span className="text-[10px] text-muted-foreground/60">W:{adv.warrantyHours.toFixed(1)}</span>}
                      {!hideTotals && adv.customerPayHours > 0 && <span className="text-[10px] text-muted-foreground/60">CP:{adv.customerPayHours.toFixed(1)}</span>}
                      {!hideTotals && adv.internalHours > 0 && <span className="text-[10px] text-muted-foreground/60">I:{adv.internalHours.toFixed(1)}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <span className="text-[10px] text-muted-foreground/60">{adv.roCount} ROs</span>
                  </TableCell>
                  <TableCell className="py-2 pr-4 text-right">
                    <span className="text-sm font-bold tabular-nums">{maskHours(adv.totalHours, hideTotals)}h</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-[11px] font-semibold text-primary hover:bg-primary/5 transition-colors border-t border-border/40"
            >
              {showAll ? 'Show less' : `View all ${byAdvisor.length} advisors`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
