import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { RepairOrder } from '@/types/ro';

interface SpreadsheetViewProps {
  ros: RepairOrder[];
  onSelectRO: (ro: RepairOrder) => void;
}

interface FlatRow {
  ro: RepairOrder;
  lineIndex: number; // -1 = simple mode (no lines)
  isFirstOfGroup: boolean;
  groupSize: number;
  groupIndex: number; // even/odd for zebra
}

export function SpreadsheetView({ ros, onSelectRO }: SpreadsheetViewProps) {
  const { rows, totalHours, totalLines } = useMemo(() => {
    const flat: FlatRow[] = [];
    let groupIdx = 0;
    let hours = 0;
    let lines = 0;

    for (const ro of ros) {
      const hasLines = ro.lines && ro.lines.length > 0;
      if (hasLines) {
        const size = ro.lines.length;
        ro.lines.forEach((_, i) => {
          const line = ro.lines[i];
          if (!line.isTbd) hours += line.hoursPaid;
          lines++;
          flat.push({
            ro,
            lineIndex: i,
            isFirstOfGroup: i === 0,
            groupSize: size,
            groupIndex: groupIdx,
          });
        });
      } else {
        hours += ro.paidHours;
        lines++;
        flat.push({
          ro,
          lineIndex: -1,
          isFirstOfGroup: true,
          groupSize: 1,
          groupIndex: groupIdx,
        });
      }
      groupIdx++;
    }

    return { rows: flat, totalHours: hours, totalLines: lines };
  }, [ros]);

  if (ros.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-medium">No ROs to display</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card border-b-2 border-border">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">RO #</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Date</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Advisor</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap w-12">Line</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Description</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap w-16">Type</th>
              <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap w-16">Hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isEvenGroup = row.groupIndex % 2 === 0;
              const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
              const laborType = line?.laborType ?? row.ro.laborType;
              const hoursPaid = line ? line.hoursPaid : row.ro.paidHours;
              const isTbd = line?.isTbd ?? false;
              const description = line ? line.description : row.ro.workPerformed;
              const lineNo = line ? line.lineNo : 1;

              const formattedDate = new Date(row.ro.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              const typeLabel = laborType === 'warranty' ? 'W' : laborType === 'customer-pay' ? 'CP' : 'INT';
              const typeClass = laborType === 'warranty'
                ? 'text-[hsl(var(--status-warranty))]'
                : laborType === 'customer-pay'
                  ? 'text-[hsl(var(--status-customer-pay))]'
                  : 'text-[hsl(var(--status-internal))]';

              return (
                <tr
                  key={`${row.ro.id}-${row.lineIndex}`}
                  className={cn(
                    'cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/50',
                    isEvenGroup ? 'bg-card' : 'bg-muted/30'
                  )}
                  onClick={() => onSelectRO(row.ro)}
                >
                  {row.isFirstOfGroup ? (
                    <>
                      <td
                        className="px-3 py-2 font-bold text-foreground whitespace-nowrap align-top"
                        rowSpan={row.groupSize}
                      >
                        #{row.ro.roNumber}
                      </td>
                      <td
                        className="px-3 py-2 text-muted-foreground whitespace-nowrap align-top"
                        rowSpan={row.groupSize}
                      >
                        {formattedDate}
                      </td>
                      <td
                        className="px-3 py-2 text-muted-foreground whitespace-nowrap align-top"
                        rowSpan={row.groupSize}
                      >
                        {row.ro.advisor}
                      </td>
                    </>
                  ) : null}
                  <td className="px-3 py-2 text-center text-muted-foreground tabular-nums">{lineNo}</td>
                  <td className="px-3 py-2 text-foreground truncate max-w-[300px]">
                    {description || <span className="text-muted-foreground italic">—</span>}
                  </td>
                  <td className={cn('px-3 py-2 text-center font-semibold text-xs', typeClass)}>
                    {typeLabel}
                  </td>
                  <td className={cn(
                    'px-3 py-2 text-right tabular-nums font-medium',
                    isTbd ? 'line-through text-amber-500' : 'text-foreground'
                  )}>
                    {hoursPaid.toFixed(1)}
                    {isTbd && <span className="ml-1 text-[10px] font-semibold text-amber-500">TBD</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="flex-shrink-0 border-t-2 border-border bg-card px-4 py-2.5 flex items-center justify-between text-sm">
        <div className="flex gap-4 text-muted-foreground">
          <span><strong className="text-foreground">{ros.length}</strong> ROs</span>
          <span><strong className="text-foreground">{totalLines}</strong> lines</span>
        </div>
        <div className="font-bold text-foreground tabular-nums">
          {totalHours.toFixed(1)}h total
        </div>
      </div>
    </div>
  );
}
