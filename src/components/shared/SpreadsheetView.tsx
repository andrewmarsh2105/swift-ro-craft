import { useMemo, useRef, useCallback, useState, useEffect, type ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  Printer, Download, ChevronDown, ChevronRight,
  Rows3, Rows4, FileSpreadsheet, FileText, Group, CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { maskHours } from '@/lib/maskHours';
import { csvCell, typeCode, downloadCSVFile, buildCSV } from '@/lib/csvUtils';
import { useFlagContext } from '@/contexts/FlagContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { LineTextModal } from '@/components/shared/LineTextModal';
import { ColumnChooser } from '@/components/shared/spreadsheet/ColumnChooser';
import {
  ALL_COLUMNS,
  type ColumnId, type ViewMode, type Density,
} from '@/components/shared/spreadsheet/types';
import type { RepairOrder } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';
import { toast } from 'sonner';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';
import {
  buildSpreadsheetRows,
  PAYROLL_EXPORT_HEADERS,
  AUDIT_EXPORT_HEADERS,
  rowToExportCells,
  type SpreadsheetRow,
  type SpreadsheetLineRow,
  type SpreadsheetSubtotalRow,
} from '@/lib/buildSpreadsheetRows';

/* ─── Props ─── */
interface SpreadsheetViewProps {
  ros: RepairOrder[];
  onSelectRO: (ro: RepairOrder) => void;
  rangeLabel?: string;
  isCloseout?: boolean;
}

type DateRange = 'all' | 'week' | 'month' | 'pay_period';
type GroupBy = 'date' | 'ro' | 'advisor' | 'none';

/* ─── Columns (no roTotal) ─── */
const DISPLAY_COLUMNS: ColumnId[] = [
  'roNumber', 'date', 'advisor', 'customer', 'vehicle', 'description', 'hours', 'type',
];

const AUDIT_DISPLAY_COLUMNS: ColumnId[] = [
  'roNumber', 'date', 'advisor', 'customer', 'vehicle', 'lineNo', 'description', 'hours', 'type', 'tbd', 'notes', 'mileage', 'vin',
];

const ROW_BATCH = 120;

/* ─── Component ─── */
export function SpreadsheetView({ ros, onSelectRO, rangeLabel, isCloseout }: SpreadsheetViewProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { userSettings, updateUserSetting } = useFlagContext();
  const { isPro } = useSubscription();
  const isMobile = useIsMobile();
  const hideTotals = userSettings.hideTotals ?? false;

  const persistedViewMode = ((userSettings as any).spreadsheetViewMode as ViewMode) || 'payroll';
  const persistedDensity = ((userSettings as any).spreadsheetDensity as Density) || 'compact';
  const persistedGroupBy = ((userSettings as any).spreadsheetGroupBy as GroupBy) || 'date';

  const [viewMode, setViewMode] = useState<ViewMode>(persistedViewMode);
  const [density, setDensity] = useState<Density>(persistedDensity);
  const [groupBy, setGroupBy] = useState<GroupBy>(persistedGroupBy);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [activeColIds, setActiveColIds] = useState<ColumnId[]>(
    persistedViewMode === 'payroll' ? DISPLAY_COLUMNS : AUDIT_DISPLAY_COLUMNS
  );

  const hasCustomPayPeriod = userSettings.payPeriodType === 'custom' &&
    Array.isArray(userSettings.payPeriodEndDates) &&
    (userSettings.payPeriodEndDates as number[]).length > 0;

  useEffect(() => { setViewMode(persistedViewMode); }, [persistedViewMode]);
  useEffect(() => { setDensity(persistedDensity); }, [persistedDensity]);
  useEffect(() => { setGroupBy(persistedGroupBy); }, [persistedGroupBy]);
  useEffect(() => {
    setActiveColIds(viewMode === 'payroll' ? DISPLAY_COLUMNS : AUDIT_DISPLAY_COLUMNS);
  }, [viewMode]);

  const handleViewModeChange = (m: ViewMode) => {
    setViewMode(m);
    updateUserSetting('spreadsheetViewMode' as any, m);
  };
  const handleGroupByChange = (g: GroupBy) => {
    setGroupBy(g);
    updateUserSetting('spreadsheetGroupBy' as any, g);
  };
  const handleDensityChange = () => {
    const next: Density = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
    updateUserSetting('spreadsheetDensity' as any, next);
  };
  const handleToggleCol = (id: ColumnId) => {
    if (id === 'roTotal') return;
    setActiveColIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Text modal
  const [textModal, setTextModal] = useState<{ open: boolean; lineNo: number; description: string }>({
    open: false, lineNo: 0, description: '',
  });

  // Pagination
  const [visibleCount, setVisibleCount] = useState(ROW_BATCH);
  useEffect(() => setVisibleCount(ROW_BATCH), [ros]);

  /* ─── Active column defs (no roTotal) ─── */
  const activeCols = useMemo(
    () => activeColIds.filter(id => id !== 'roTotal').map(id => ALL_COLUMNS.find(c => c.id === id)!).filter(Boolean),
    [activeColIds],
  );

  /* ─── Filter ROs by selected date range ─── */
  const { filteredROs, computedRangeLabel } = useMemo(() => {
    const now = new Date();
    const localDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (isCloseout || dateRange === 'all') {
      return { filteredROs: ros, computedRangeLabel: rangeLabel || 'All ROs' };
    }

    let startStr: string;
    let endStr: string;

    if (dateRange === 'week') {
      const ws = startOfWeek(now, { weekStartsOn: 0 });
      const we = endOfWeek(now, { weekStartsOn: 0 });
      startStr = localDate(ws);
      endStr = localDate(we);
    } else if (dateRange === 'month') {
      const ms = startOfMonth(now);
      const me = endOfMonth(now);
      startStr = localDate(ms);
      endStr = localDate(me);
    } else {
      // pay_period
      const ppDates = (userSettings.payPeriodEndDates || []) as number[];
      const { start, end } = getCustomPayPeriodRange(ppDates, now);
      startStr = start;
      endStr = end;
    }

    const filtered = ros.filter(ro => {
      const d = ro.paidDate || ro.date;
      return d >= startStr && d <= endStr;
    });

    const fmtLabel = (s: string, e: string) => {
      try {
        const [sy, sm, sd] = s.split('-').map(Number);
        const [ey, em, ed] = e.split('-').map(Number);
        const sf = format(new Date(sy, sm - 1, sd), 'MMM d');
        const ef = format(new Date(ey, em - 1, ed), 'MMM d');
        return `${sf} – ${ef}`;
      } catch { return `${s} – ${e}`; }
    };

    return { filteredROs: filtered, computedRangeLabel: fmtLabel(startStr, endStr) };
  }, [ros, dateRange, isCloseout, rangeLabel, userSettings.payPeriodEndDates, userSettings.payPeriodType]);

  /* ─── Build rows using shared model ─── */
  const allRows = useMemo(() => buildSpreadsheetRows({ ros: filteredROs, periodLabel: computedRangeLabel, groupBy }), [filteredROs, computedRangeLabel, groupBy]);

  /* ─── Compute totals from the period subtotal row ─── */
  const periodRow = allRows.find(r => r.rowType === 'periodSubtotal') as SpreadsheetSubtotalRow | undefined;
  const totalHours = periodRow?.hours ?? 0;
  const warrantyHours = periodRow?.wHours ?? 0;
  const cpHours = periodRow?.cpHours ?? 0;
  const internalHours = periodRow?.iHours ?? 0;
  const totalLines = allRows.filter(r => r.rowType === 'line').length;

  /* ─── Paginate ─── */
  const visibleRows = useMemo(() => allRows.slice(0, visibleCount), [allRows, visibleCount]);
  const hasMore = visibleCount < allRows.length;

  /* ─── Cell value renderer ─── */
  const renderCellValue = useCallback((colId: ColumnId, row: SpreadsheetLineRow): ReactNode => {
    switch (colId) {
      case 'roNumber':
        return <span className="font-bold">#{row.roNumber}</span>;
      case 'date': {
        const [y, m, d] = row.date.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      case 'advisor': return row.advisor || '—';
      case 'customer': return row.customer || '—';
      case 'vehicle': return row.vehicle || <span className="italic text-muted-foreground">—</span>;
      case 'lineNo': return row.lineNo;
      case 'description': {
        return (
          <button
            className="text-left truncate max-w-full hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setTextModal({ open: true, lineNo: row.lineNo, description: row.description || '' });
            }}
            title="Click to view full text"
          >
            {row.description || <span className="text-muted-foreground italic">—</span>}
          </button>
        );
      }
      case 'hours': {
        return (
          <span className={cn('tabular-nums font-medium', row.isTbd && 'line-through text-amber-500')}>
            {row.hours.toFixed(1)}
            {row.isTbd && <span className="ml-1 text-[10px] font-semibold">TBD</span>}
          </span>
        );
      }
      case 'type': {
        const tc = row.laborType === 'warranty'
          ? 'text-[hsl(var(--status-warranty))]'
          : row.laborType === 'customer-pay'
            ? 'text-[hsl(var(--status-customer-pay))]'
            : 'text-[hsl(var(--status-internal))]';
        return <span className={cn('font-semibold text-xs', tc)}>{row.type}</span>;
      }
      case 'tbd':
        return row.isTbd ? <span className="text-amber-500 text-xs font-semibold">⏳</span> : '';
      case 'notes':
        return <span className="text-xs text-muted-foreground truncate">{row.notes || ''}</span>;
      case 'mileage':
        return <span className="text-xs tabular-nums">{row.mileage || ''}</span>;
      case 'vin':
        return <span className="text-[11px] font-mono text-muted-foreground">{row.vin || ''}</span>;
      default: return '';
    }
  }, []);

  /* ─── Export helpers ─── */
  const handleExportCSV = useCallback((mode: 'payroll' | 'audit') => {
    const headers = mode === 'payroll' ? PAYROLL_EXPORT_HEADERS : AUDIT_EXPORT_HEADERS;
    const exportRows = allRows
      .filter(r => !(r.rowType === 'line' && (r as SpreadsheetLineRow).isTbd))
      .map(r => rowToExportCells(r, headers).map(c => csvCell(c)));
    const csv = buildCSV(headers, exportRows);
    downloadCSVFile(csv, `${mode}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success(`${mode === 'payroll' ? 'Payroll' : 'Audit'} CSV downloaded`);
  }, [allRows]);

  const handleExportXLSX = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = viewMode === 'payroll' ? PAYROLL_EXPORT_HEADERS : AUDIT_EXPORT_HEADERS;
      const exportRows = allRows
        .filter(r => !(r.rowType === 'line' && (r as SpreadsheetLineRow).isTbd))
        .map(r => rowToExportCells(r, headers));
      const data = [headers, ...exportRows];

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = headers.map((h) => {
        if (h === 'Work Performed') return { wch: 40 };
        if (h === 'VIN') return { wch: 20 };
        if (h === 'Notes') return { wch: 24 };
        return { wch: Math.max(h.length + 2, 12) };
      });
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Spreadsheet');
      XLSX.writeFile(wb, `spreadsheet-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('XLSX downloaded');
    } catch (err) {
      console.error('XLSX export failed', err);
      toast.error('XLSX export failed');
    }
  }, [allRows, viewMode]);

  const handleExportPDF = useCallback(async (mode: 'payroll' | 'audit') => {
    try {
      const { exportPDFFromRows } = await import('@/lib/pdfExport');
      exportPDFFromRows(
        allRows,
        mode,
        `${mode}-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        `${mode === 'payroll' ? 'Payroll' : 'Audit'} Report${rangeLabel ? ' — ' + rangeLabel : ''}`,
      );
      toast.success(`${mode === 'payroll' ? 'Payroll' : 'Audit'} PDF downloaded`);
    } catch (err) {
      console.error('PDF export failed', err);
      toast.error('PDF export failed');
    }
  }, [allRows, rangeLabel]);

  const handlePrint = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Spreadsheet</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:1rem}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{padding:4px 8px;border:1px solid #ddd;text-align:left}
        th{background:#f5f5f5;font-weight:600}
        @media print{body{margin:0}}
      </style></head><body>${DOMPurify.sanitize(el.innerHTML)}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }, []);

  /* ─── Density classes ─── */
  const cellPy = density === 'compact' ? 'py-1' : 'py-2';
  const cellPx = 'px-2.5';
  const textSize = density === 'compact' ? 'text-xs' : 'text-sm';

  /* ─── Helpers ─── */
  const getRowBg = (groupIndex: number) =>
    groupIndex % 2 === 1 ? 'bg-muted/30' : 'bg-card';

  /* ─── Empty state ─── */
  if (filteredROs.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Still show toolbar so user can change range */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card">
        {!isCloseout && !isMobile && (
            <div className="flex rounded-lg border border-border overflow-hidden">
              {([
                { value: 'week' as DateRange, label: 'Week' },
                { value: 'month' as DateRange, label: 'Month' },
                ...(hasCustomPayPeriod ? [{ value: 'pay_period' as DateRange, label: 'Pay Period' }] : []),
                { value: 'all' as DateRange, label: 'All' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors',
                    dateRange === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {computedRangeLabel && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{computedRangeLabel}</span>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-lg font-medium">No ROs in this range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ─── Toolbar ─── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-card flex-wrap">
        <div className="flex items-center gap-2">
          {/* Date range selector */}
          {!isCloseout && !isMobile && (
            <div className="flex rounded-lg border border-border overflow-hidden">
              {([
                { value: 'week' as DateRange, label: 'Week' },
                { value: 'month' as DateRange, label: 'Month' },
                ...(hasCustomPayPeriod ? [{ value: 'pay_period' as DateRange, label: 'Pay Period' }] : []),
                { value: 'all' as DateRange, label: 'All' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors',
                    dateRange === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {computedRangeLabel && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{computedRangeLabel}</span>
          )}

          {/* View mode */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['payroll', 'audit'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => handleViewModeChange(m)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                  viewMode === m
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <Select value={groupBy} onValueChange={(v) => handleGroupByChange(v as GroupBy)}>
            <SelectTrigger className="h-7 w-[120px] text-[11px] font-semibold">
              <Group className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="ro">By RO</SelectItem>
              <SelectItem value="advisor">By Advisor</SelectItem>
              <SelectItem value="none">No Grouping</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm" className="h-7 gap-1 text-xs"
            onClick={handleDensityChange}
            title={density === 'compact' ? 'Comfortable' : 'Compact'}
          >
            {density === 'compact' ? <Rows4 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
          </Button>

          <ColumnChooser activeColumns={activeColIds} onToggle={handleToggleCol} />

          {isPro && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExportCSV('payroll')}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Payroll CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV('audit')}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Audit CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF('payroll')}>
                  <FileText className="h-3.5 w-3.5 mr-2" /> Payroll PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF('audit')}>
                  <FileText className="h-3.5 w-3.5 mr-2" /> Audit PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXLSX}>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> XLSX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isPro && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="flex-1 overflow-auto" ref={tableRef}>
        <table className={cn('min-w-[900px] w-full border-collapse', textSize)}>
          <thead className="sticky top-0 z-10 bg-card border-b-2 border-border">
            <tr>
              {activeCols.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    cellPx, cellPy,
                    'font-semibold text-muted-foreground whitespace-nowrap bg-card overflow-hidden',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                  style={{ minWidth: col.minWidth }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => {
              /* ─── Subtotal rows ─── */
              if (row.rowType === 'roSubtotal') {
                const sub = row as SpreadsheetSubtotalRow;
                // Find how many columns before 'hours'
                const hrsIdx = activeCols.findIndex(c => c.id === 'hours');
                const typeIdx = activeCols.findIndex(c => c.id === 'type');
                const spanCols = hrsIdx > 0 ? hrsIdx : activeCols.length - 1;
                const afterCols = activeCols.length - spanCols - 1 - (typeIdx > hrsIdx ? 1 : 0);

                return (
                  <tr key={`rosub-${i}`} className="border-t border-border/50 bg-muted/15">
                    <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-muted-foreground text-xs text-right')}>
                      {sub.label}
                    </td>
                    <td className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-primary')}>
                      {maskHours(sub.hours, hideTotals)}h
                    </td>
                    {typeIdx > hrsIdx && (
                      <td className={cn(cellPx, cellPy, 'text-xs text-muted-foreground')}>
                        {[
                          sub.cpHours ? `CP: ${sub.cpHours.toFixed(1)}` : '',
                          sub.wHours ? `W: ${sub.wHours.toFixed(1)}` : '',
                          sub.iHours ? `I: ${sub.iHours.toFixed(1)}` : '',
                        ].filter(Boolean).join(' ')}
                      </td>
                    )}
                    {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, cellPy)} />}
                  </tr>
                );
              }

              if (row.rowType === 'daySubtotal') {
                const sub = row as SpreadsheetSubtotalRow;
                const hrsIdx = activeCols.findIndex(c => c.id === 'hours');
                const spanCols = hrsIdx > 0 ? hrsIdx : activeCols.length - 1;
                const afterCols = activeCols.length - spanCols - 1;

                return (
                  <tr key={`daysub-${i}`} className="border-t-2 border-border bg-muted/40">
                    <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-foreground text-xs uppercase text-right')}>
                      {sub.label}
                    </td>
                    <td className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-foreground')}>
                      {maskHours(sub.hours, hideTotals)}h
                    </td>
                    {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, cellPy)} />}
                  </tr>
                );
              }

              if (row.rowType === 'advisorSubtotal') {
                const sub = row as SpreadsheetSubtotalRow;
                const hrsIdx = activeCols.findIndex(c => c.id === 'hours');
                const spanCols = hrsIdx > 0 ? hrsIdx : activeCols.length - 1;
                const afterCols = activeCols.length - spanCols - 1;

                return (
                  <tr key={`advsub-${i}`} className="border-t-2 border-border bg-muted/40">
                    <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-foreground text-xs uppercase text-right')}>
                      {sub.label}
                    </td>
                    <td className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-foreground')}>
                      {maskHours(sub.hours, hideTotals)}h
                    </td>
                    {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, cellPy)} />}
                  </tr>
                );
              }

              if (row.rowType === 'periodSubtotal') {
                const sub = row as SpreadsheetSubtotalRow;
                const hrsIdx = activeCols.findIndex(c => c.id === 'hours');
                const spanCols = hrsIdx > 0 ? hrsIdx : activeCols.length - 1;
                const afterCols = activeCols.length - spanCols - 1;

                return (
                  <tr key={`period-${i}`} className="border-t-2 border-border bg-primary/5">
                    <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-foreground uppercase text-xs text-right')}>
                      {sub.label}
                    </td>
                    <td className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-foreground text-base')}>
                      {maskHours(sub.hours, hideTotals)}h
                    </td>
                    {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, cellPy)} />}
                  </tr>
                );
              }

              /* ─── Line row ─── */
              const line = row as SpreadsheetLineRow;
              const rowBg = getRowBg(line.groupIndex);
              const borderColorClass = line.laborType === 'warranty'
                ? 'border-l-[hsl(var(--status-warranty))]'
                : line.laborType === 'customer-pay'
                  ? 'border-l-[hsl(var(--status-customer-pay))]'
                  : 'border-l-[hsl(var(--status-internal))]';

              return (
                <tr
                  key={`line-${i}`}
                  className={cn(
                    'cursor-pointer hover:bg-accent/50 transition-colors border-t border-border/30',
                    rowBg,
                  )}
                  onClick={() => line.ro && onSelectRO(line.ro)}
                >
                  {activeCols.map((col, ci) => (
                    <td
                      key={col.id}
                      className={cn(
                        cellPx, cellPy,
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.id === 'description' ? 'truncate overflow-hidden' : 'whitespace-nowrap overflow-hidden',
                        ci === 0 && `border-l-[3px] ${borderColorClass}`,
                        'align-top',
                      )}
                    >
                      {renderCellValue(col.id, line)}
                    </td>
                  ))}
                </tr>
              );
            })}

            {hasMore && (
              <tr>
                <td colSpan={activeCols.length} className="text-center py-3">
                  <button
                    onClick={() => setVisibleCount(c => c + ROW_BATCH)}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Show more
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Footer ─── */}
      <div className="flex-shrink-0 border-t-2 border-border bg-card px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex gap-4 text-muted-foreground">
          <span><strong className="text-foreground">{filteredROs.length}</strong> ROs</span>
          <span><strong className="text-foreground">{totalLines}</strong> lines</span>
        </div>
        <div className="flex items-center gap-3 tabular-nums">
          <span className="text-[hsl(var(--status-warranty))] font-medium text-xs">W: {maskHours(warrantyHours, hideTotals)}h</span>
          <span className="text-[hsl(var(--status-customer-pay))] font-medium text-xs">CP: {maskHours(cpHours, hideTotals)}h</span>
          <span className="text-[hsl(var(--status-internal))] font-medium text-xs">I: {maskHours(internalHours, hideTotals)}h</span>
          <span className="font-bold text-foreground ml-1">{maskHours(totalHours, hideTotals)}h total</span>
        </div>
      </div>

      {/* Text modal */}
      <LineTextModal
        open={textModal.open}
        onClose={() => setTextModal(prev => ({ ...prev, open: false }))}
        lineNo={textModal.lineNo}
        description={textModal.description}
      />
    </div>
  );
}
