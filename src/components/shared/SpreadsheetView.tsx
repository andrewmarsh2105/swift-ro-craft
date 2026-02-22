import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCSV } from '@/lib/exportUtils';
import type { RepairOrder } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';

interface SpreadsheetViewProps {
  ros: RepairOrder[];
  onSelectRO: (ro: RepairOrder) => void;
}

interface FlatRow {
  type: 'data';
  ro: RepairOrder;
  lineIndex: number;
  isFirstOfGroup: boolean;
  groupSize: number;
  groupIndex: number;
  roTotal: number;
}

interface DateSeparatorRow {
  type: 'date-separator';
  dateLabel: string;
  roCount: number;
  dayHours: number;
}

type TableRow = FlatRow | DateSeparatorRow;

const TOTAL_COLUMNS = 9;
const ROW_BATCH_SIZE = 100;

export function SpreadsheetView({ ros, onSelectRO }: SpreadsheetViewProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(ROW_BATCH_SIZE);

  const { rows, totalHours, totalLines, warrantyHours, cpHours, internalHours } = useMemo(() => {
    const allRows: TableRow[] = [];
    let hours = 0;
    let lines = 0;
    let wHours = 0;
    let cHours = 0;
    let iHours = 0;
    let groupIdx = 0;

    // Group ROs by date descending
    const byDate = new Map<string, RepairOrder[]>();
    const sorted = [...ros].sort((a, b) => {
      const aDate = a.paidDate || a.date;
      const bDate = b.paidDate || b.date;
      return bDate.localeCompare(aDate);
    });
    for (const ro of sorted) {
      const key = (ro.paidDate || ro.date).slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(ro);
    }

    for (const [dateKey, dayROs] of byDate) {
      // Calculate day totals for separator
      let dayHours = 0;
      for (const ro of dayROs) {
        const hasLines = ro.lines && ro.lines.length > 0;
        if (hasLines) {
          dayHours += ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + l.hoursPaid, 0);
        } else {
          dayHours += ro.paidHours;
        }
      }

      const [y, m, d] = dateKey.split('-').map(Number);
      const dateLabel = format(new Date(y, m - 1, d), 'EEE, MMM d');
      allRows.push({ type: 'date-separator', dateLabel, roCount: dayROs.length, dayHours });

      for (const ro of dayROs) {
        const hasLines = ro.lines && ro.lines.length > 0;
        const roTotal = hasLines
          ? ro.lines.filter(l => !l.isTbd).reduce((sum, l) => sum + l.hoursPaid, 0)
          : ro.paidHours;

        if (hasLines) {
          const size = ro.lines.length;
          ro.lines.forEach((line, i) => {
            if (!line.isTbd) {
              hours += line.hoursPaid;
              const lt = line.laborType ?? ro.laborType;
              if (lt === 'warranty') wHours += line.hoursPaid;
              else if (lt === 'customer-pay') cHours += line.hoursPaid;
              else iHours += line.hoursPaid;
            }
            lines++;
            allRows.push({
              type: 'data',
              ro,
              lineIndex: i,
              isFirstOfGroup: i === 0,
              groupSize: size,
              groupIndex: groupIdx,
              roTotal,
            });
          });
        } else {
          hours += ro.paidHours;
          if (ro.laborType === 'warranty') wHours += ro.paidHours;
          else if (ro.laborType === 'customer-pay') cHours += ro.paidHours;
          else iHours += ro.paidHours;
          lines++;
          allRows.push({
            type: 'data',
            ro,
            lineIndex: -1,
            isFirstOfGroup: true,
            groupSize: 1,
            groupIndex: groupIdx,
            roTotal,
          });
        }
        groupIdx++;
      }
    }

    return { rows: allRows, totalHours: hours, totalLines: lines, warrantyHours: wHours, cpHours: cHours, internalHours: iHours };
  }, [ros]);

  // Reset visible count when data changes
  useEffect(() => {
    setVisibleCount(ROW_BATCH_SIZE);
  }, [ros]);

  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const hasMore = visibleCount < rows.length;

  const handleSaveCSV = useCallback(() => {
    const headers = ['RO #', 'Date', 'Advisor', 'Vehicle', 'Line', 'Description', 'Type', 'Hours', 'RO Total'];
    const csvRows = rows
      .filter((r): r is FlatRow => r.type === 'data')
      .map((row) => {
        const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
        const laborType = line?.laborType ?? row.ro.laborType;
        const hoursPaid = line ? line.hoursPaid : row.ro.paidHours;
        const description = line ? line.description : row.ro.workPerformed;
        const lineNo = line ? line.lineNo : 1;
        const typeLabel = laborType === 'warranty' ? 'W' : laborType === 'customer-pay' ? 'CP' : 'INT';
        const vehicle = formatVehicleChip(row.ro.vehicle) || '';
        return [
          row.ro.roNumber,
          row.ro.paidDate || row.ro.date,
          row.ro.advisor || '',
          `"${vehicle.replace(/"/g, '""')}"`,
          lineNo,
          `"${(description || '').replace(/"/g, '""')}"`,
          typeLabel,
          hoursPaid.toFixed(2),
          row.isFirstOfGroup ? row.roTotal.toFixed(2) : '',
        ].join(',');
      });
    const csv = [headers.join(','), ...csvRows].join('\n');
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    downloadCSV(csv, `spreadsheet-${dateStr}.csv`);
  }, [rows]);

  const handlePrint = useCallback(() => {
    const printContent = tableRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Spreadsheet</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 1rem; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 4px 8px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .date-sep { background: #eee; font-weight: bold; text-transform: uppercase; font-size: 11px; }
        .summary { margin-top: 1rem; font-size: 13px; }
        .summary td { border: none; padding: 4px 8px; }
        .summary .label { font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      ${printContent.innerHTML}
      <table class="summary">
        <tr><td class="label">Warranty (W):</td><td>${warrantyHours.toFixed(1)}h</td></tr>
        <tr><td class="label">Customer Pay (CP):</td><td>${cpHours.toFixed(1)}h</td></tr>
        <tr><td class="label">Internal (I):</td><td>${internalHours.toFixed(1)}h</td></tr>
        <tr><td class="label" style="font-size:14px;">Total:</td><td style="font-size:14px;font-weight:bold;">${totalHours.toFixed(1)}h</td></tr>
      </table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [warrantyHours, cpHours, internalHours, totalHours]);

  if (ros.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-medium">No ROs to display</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center justify-end gap-2 px-3 py-1.5 border-b border-border bg-card">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSaveCSV}>
          <Download className="h-3.5 w-3.5" />
          Save CSV
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>
      <div className="flex-1 overflow-auto" ref={tableRef}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card border-b-2 border-border">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">RO #</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Date</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Advisor</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">Vehicle</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap w-12">Line</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Description</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap w-16">Type</th>
              <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap w-16">Hours</th>
              <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap w-20 bg-primary/5">RO Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => {
              if (row.type === 'date-separator') {
                return (
                  <tr key={`sep-${i}`} className="bg-muted/60">
                    <td colSpan={TOTAL_COLUMNS} className="px-3 py-2 font-bold text-foreground text-xs uppercase tracking-wider">
                      <div className="flex items-center justify-between">
                        <span>{row.dateLabel}</span>
                        <span className="text-muted-foreground font-medium normal-case tracking-normal">
                          {row.roCount} RO{row.roCount !== 1 ? 's' : ''} · {row.dayHours.toFixed(1)}h
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }

              const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
              const laborType = line?.laborType ?? row.ro.laborType;
              const hoursPaid = line ? line.hoursPaid : row.ro.paidHours;
              const isTbd = line?.isTbd ?? false;
              const description = line ? line.description : row.ro.workPerformed;
              const lineNo = line ? line.lineNo : 1;

              const effectiveDate = row.ro.paidDate || row.ro.date;
              const [y, m, d] = effectiveDate.split('-').map(Number);
              const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const hasDifferentPaidDate = row.ro.paidDate && row.ro.paidDate !== row.ro.date;

              const typeLabel = laborType === 'warranty' ? 'W' : laborType === 'customer-pay' ? 'CP' : 'INT';
              const typeClass = laborType === 'warranty'
                ? 'text-[hsl(var(--status-warranty))]'
                : laborType === 'customer-pay'
                  ? 'text-[hsl(var(--status-customer-pay))]'
                  : 'text-[hsl(var(--status-internal))]';

              const borderColorClass = row.ro.laborType === 'warranty'
                ? 'border-l-[hsl(var(--status-warranty))]'
                : row.ro.laborType === 'customer-pay'
                  ? 'border-l-[hsl(var(--status-customer-pay))]'
                  : 'border-l-[hsl(var(--status-internal))]';

              const vehicleChip = formatVehicleChip(row.ro.vehicle);

              return (
                <tr
                  key={`${row.ro.id}-${row.lineIndex}`}
                  className={cn(
                    'cursor-pointer hover:bg-accent/50 transition-colors',
                    row.isFirstOfGroup ? 'border-t-2 border-border' : 'border-t border-border/30',
                  )}
                  onClick={() => onSelectRO(row.ro)}
                >
                  {row.isFirstOfGroup ? (
                    <>
                      <td
                        className={cn(
                          'px-3 py-2 font-bold text-foreground whitespace-nowrap align-top border-l-[3px]',
                          borderColorClass,
                        )}
                        rowSpan={row.groupSize}
                      >
                        #{row.ro.roNumber}
                      </td>
                      <td
                        className="px-3 py-2 text-muted-foreground whitespace-nowrap align-top"
                        rowSpan={row.groupSize}
                      >
                        {formattedDate}
                        {hasDifferentPaidDate && (
                          <div className="text-[10px] text-muted-foreground/60">
                            RO: {(() => { const [oy, om, od] = row.ro.date.split('-').map(Number); return new Date(oy, om - 1, od).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); })()}
                          </div>
                        )}
                      </td>
                      <td
                        className="px-3 py-2 text-muted-foreground whitespace-nowrap align-top"
                        rowSpan={row.groupSize}
                      >
                        {row.ro.advisor}
                      </td>
                      <td
                        className="px-3 py-2 text-muted-foreground whitespace-nowrap align-top text-xs"
                        rowSpan={row.groupSize}
                      >
                        {vehicleChip || <span className="italic">—</span>}
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
                  {row.isFirstOfGroup ? (
                    <td
                      className="px-3 py-2 text-right tabular-nums font-bold text-primary whitespace-nowrap align-top bg-primary/5"
                      rowSpan={row.groupSize}
                    >
                      {row.roTotal.toFixed(1)}h
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {hasMore && (
              <tr>
                <td colSpan={TOTAL_COLUMNS} className="text-center py-3">
                  <button
                    onClick={() => setVisibleCount(c => c + ROW_BATCH_SIZE)}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Show more ({rows.length - visibleCount} remaining)
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="flex-shrink-0 border-t-2 border-border bg-card px-4 py-2.5 flex items-center justify-between text-sm">
        <div className="flex gap-4 text-muted-foreground">
          <span><strong className="text-foreground">{ros.length}</strong> ROs</span>
          <span><strong className="text-foreground">{totalLines}</strong> lines</span>
        </div>
        <div className="flex items-center gap-3 tabular-nums">
          <span className="text-[hsl(var(--status-warranty))] font-medium text-xs">W: {warrantyHours.toFixed(1)}h</span>
          <span className="text-[hsl(var(--status-customer-pay))] font-medium text-xs">CP: {cpHours.toFixed(1)}h</span>
          <span className="text-[hsl(var(--status-internal))] font-medium text-xs">I: {internalHours.toFixed(1)}h</span>
          <span className="font-bold text-foreground ml-1">{totalHours.toFixed(1)}h total</span>
        </div>
      </div>
    </div>
  );
}
