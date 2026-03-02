import { useMemo, useRef, useCallback, useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  Printer, Download, ChevronDown, ChevronRight,
  Rows3, Rows4, FileSpreadsheet, Layers, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import { maskHours } from '@/lib/maskHours';
import { csvCell, typeCode, downloadCSVFile, buildCSV } from '@/lib/csvUtils';
import { useFlagContext } from '@/contexts/FlagContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { LineTextModal } from '@/components/shared/LineTextModal';
import { ColumnChooser } from '@/components/shared/spreadsheet/ColumnChooser';
import {
  ALL_COLUMNS, PAYROLL_COLUMNS, AUDIT_COLUMNS,
  type ColumnId, type ViewMode, type Density,
} from '@/components/shared/spreadsheet/types';
import type { RepairOrder } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';
import { toast } from 'sonner';

/* ─── Props ─── */
interface SpreadsheetViewProps {
  ros: RepairOrder[];
  onSelectRO: (ro: RepairOrder) => void;
  rangeLabel?: string;
  /** When true, default group-by-date with all groups expanded */
  isCloseout?: boolean;
}

/* ─── Grouping ─── */
type GroupBy = 'none' | 'date' | 'ro' | 'advisor';

/* ─── Row types ─── */
interface FlatRow {
  type: 'data';
  ro: RepairOrder;
  lineIndex: number;
  isFirstOfRO: boolean;
  roLineCount: number;
  roTotal: number;
  groupKey: string;     // key for the current group
  groupIndex: number;   // alternating index for zebra
}

interface GroupHeaderRow {
  type: 'group-header';
  groupKey: string;
  label: string;
  roCount: number;
  groupHours: number;
}

interface GroupTotalRow {
  type: 'group-total';
  groupKey: string;
  label: string;
  groupHours: number;
}

type TableRow = FlatRow | GroupHeaderRow | GroupTotalRow;

const ROW_BATCH = 120;

/* ─── Component ─── */
export function SpreadsheetView({ ros, onSelectRO, rangeLabel, isCloseout }: SpreadsheetViewProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { userSettings, updateUserSetting } = useFlagContext();
  const { isPro } = useSubscription();
  const hideTotals = userSettings.hideTotals ?? false;

  // Persisted prefs
  const [viewMode, setViewMode] = useState<ViewMode>(
    ((userSettings as any).spreadsheetViewMode as ViewMode) || 'payroll'
  );
  const [density, setDensity] = useState<Density>(
    ((userSettings as any).spreadsheetDensity as Density) || 'compact'
  );
  const [groupBy, setGroupBy] = useState<GroupBy>(isCloseout ? 'date' : 'none');
  const [activeColIds, setActiveColIds] = useState<ColumnId[]>(
    viewMode === 'payroll' ? PAYROLL_COLUMNS : AUDIT_COLUMNS
  );

  // Sync viewMode → columns
  useEffect(() => {
    setActiveColIds(viewMode === 'payroll' ? PAYROLL_COLUMNS : AUDIT_COLUMNS);
  }, [viewMode]);

  const handleViewModeChange = (m: ViewMode) => {
    setViewMode(m);
    updateUserSetting('spreadsheetViewMode' as any, m);
  };
  const handleDensityChange = () => {
    const next: Density = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
    updateUserSetting('spreadsheetDensity' as any, next);
  };
  const handleToggleCol = (id: ColumnId) => {
    setActiveColIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Collapsible groups
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Text modal
  const [textModal, setTextModal] = useState<{ open: boolean; lineNo: number; description: string }>({
    open: false, lineNo: 0, description: '',
  });

  // Pagination
  const [visibleCount, setVisibleCount] = useState(ROW_BATCH);
  useEffect(() => setVisibleCount(ROW_BATCH), [ros]);

  /* ─── Active column defs ─── */
  const activeCols = useMemo(
    () => activeColIds.map(id => ALL_COLUMNS.find(c => c.id === id)!).filter(Boolean),
    [activeColIds],
  );

  /* ─── Sticky styles for first 2 columns ─── */
  const stickyStyles = useMemo(() => {
    const map: Record<string, React.CSSProperties> = {};
    let left = 0;
    activeCols.forEach((col, i) => {
      if (i < 2) {
        map[col.id] = { position: 'sticky', left, minWidth: col.minWidth };
        left += col.minWidth;
      }
    });
    return map;
  }, [activeCols]);

  /* ─── Helpers ─── */
  const getGroupKey = useCallback((ro: RepairOrder): string => {
    switch (groupBy) {
      case 'date': return (ro.paidDate || ro.date).slice(0, 10);
      case 'ro': return ro.id;
      case 'advisor': return ro.advisor || 'Unknown';
      default: return '__all__';
    }
  }, [groupBy]);

  const getGroupLabel = useCallback((key: string, sampleRO: RepairOrder): string => {
    switch (groupBy) {
      case 'date': {
        const [y, m, d] = key.split('-').map(Number);
        return format(new Date(y, m - 1, d), 'EEE, MMM d');
      }
      case 'ro': return `#${sampleRO.roNumber}`;
      case 'advisor': return key;
      default: return '';
    }
  }, [groupBy]);

  /* ─── Data processing ─── */
  const { rows, totalHours, totalLines, warrantyHours, cpHours, internalHours } = useMemo(() => {
    const allRows: TableRow[] = [];
    let hours = 0, lines = 0, wH = 0, cH = 0, iH = 0;

    // Sort ROs
    const sorted = [...ros].sort((a, b) => {
      const aD = a.paidDate || a.date, bD = b.paidDate || b.date;
      return bD.localeCompare(aD) || a.roNumber.localeCompare(b.roNumber);
    });

    if (groupBy === 'none') {
      // Flat: no grouping
      let groupIdx = 0;
      for (const ro of sorted) {
        const hasL = ro.lines?.length > 0;
        const roTotal = hasL
          ? ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + l.hoursPaid, 0)
          : ro.paidHours;

        if (hasL) {
          ro.lines.forEach((line, i) => {
            if (!line.isTbd) {
              hours += line.hoursPaid;
              const lt = line.laborType ?? ro.laborType;
              if (lt === 'warranty') wH += line.hoursPaid;
              else if (lt === 'customer-pay') cH += line.hoursPaid;
              else iH += line.hoursPaid;
            }
            lines++;
            allRows.push({
              type: 'data', ro, lineIndex: i, isFirstOfRO: i === 0,
              roLineCount: ro.lines.length, groupIndex: groupIdx, roTotal, groupKey: '__all__',
            });
          });
        } else {
          hours += ro.paidHours;
          if (ro.laborType === 'warranty') wH += ro.paidHours;
          else if (ro.laborType === 'customer-pay') cH += ro.paidHours;
          else iH += ro.paidHours;
          lines++;
          allRows.push({
            type: 'data', ro, lineIndex: -1, isFirstOfRO: true,
            roLineCount: 1, groupIndex: groupIdx, roTotal, groupKey: '__all__',
          });
        }
        groupIdx++;
      }
    } else {
      // Grouped
      const groups = new Map<string, RepairOrder[]>();
      for (const ro of sorted) {
        const key = getGroupKey(ro);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(ro);
      }

      let groupIdx = 0;
      for (const [key, groupROs] of groups) {
        let groupHours = 0;
        const label = getGroupLabel(key, groupROs[0]);

        // Compute group hours
        for (const ro of groupROs) {
          const hasL = ro.lines?.length > 0;
          groupHours += hasL ? ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + l.hoursPaid, 0) : ro.paidHours;
        }

        allRows.push({
          type: 'group-header', groupKey: key, label,
          roCount: groupROs.length, groupHours,
        });

        for (const ro of groupROs) {
          const hasL = ro.lines?.length > 0;
          const roTotal = hasL
            ? ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + l.hoursPaid, 0)
            : ro.paidHours;

          if (hasL) {
            ro.lines.forEach((line, i) => {
              if (!line.isTbd) {
                hours += line.hoursPaid;
                const lt = line.laborType ?? ro.laborType;
                if (lt === 'warranty') wH += line.hoursPaid;
                else if (lt === 'customer-pay') cH += line.hoursPaid;
                else iH += line.hoursPaid;
              }
              lines++;
              allRows.push({
                type: 'data', ro, lineIndex: i, isFirstOfRO: i === 0,
                roLineCount: ro.lines.length, groupIndex: groupIdx, roTotal, groupKey: key,
              });
            });
          } else {
            hours += ro.paidHours;
            if (ro.laborType === 'warranty') wH += ro.paidHours;
            else if (ro.laborType === 'customer-pay') cH += ro.paidHours;
            else iH += ro.paidHours;
            lines++;
            allRows.push({
              type: 'data', ro, lineIndex: -1, isFirstOfRO: true,
              roLineCount: 1, groupIndex: groupIdx, roTotal, groupKey: key,
            });
          }
          groupIdx++;
        }

        // Group total row
        allRows.push({ type: 'group-total', groupKey: key, label, groupHours });
      }
    }

    return { rows: allRows, totalHours: hours, totalLines: lines, warrantyHours: wH, cpHours: cH, internalHours: iH };
  }, [ros, groupBy, getGroupKey, getGroupLabel]);

  /* ─── Visible rows (collapsed + pagination) ─── */
  const visibleRows = useMemo(() => {
    const filtered = rows.filter(r => {
      if (r.type === 'group-header') return true;
      if (collapsed.has(r.groupKey)) return false;
      return true;
    });
    return filtered.slice(0, visibleCount);
  }, [rows, collapsed, visibleCount]);

  const hasMore = visibleCount < rows.length;

  /* ─── Cell value renderer ─── */
  const renderCellValue = useCallback((colId: ColumnId, row: FlatRow): ReactNode => {
    const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
    const laborType = line?.laborType ?? row.ro.laborType;

    switch (colId) {
      case 'roNumber':
        return <span className="font-bold">#{row.ro.roNumber}</span>;
      case 'date': {
        const ed = row.ro.paidDate || row.ro.date;
        const [y, m, d] = ed.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      case 'advisor': return row.ro.advisor || '—';
      case 'customer': return row.ro.customerName || '—';
      case 'vehicle': return formatVehicleChip(row.ro.vehicle) || <span className="italic text-muted-foreground">—</span>;
      case 'lineNo': return line ? line.lineNo : 1;
      case 'description': {
        const desc = line ? line.description : row.ro.workPerformed;
        return (
          <button
            className="text-left truncate max-w-full hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setTextModal({ open: true, lineNo: line?.lineNo ?? 1, description: desc || '' });
            }}
            title="Click to view full text"
          >
            {desc || <span className="text-muted-foreground italic">—</span>}
          </button>
        );
      }
      case 'hours': {
        const hrs = line ? line.hoursPaid : row.ro.paidHours;
        const isTbd = line?.isTbd ?? false;
        return (
          <span className={cn('tabular-nums font-medium', isTbd && 'line-through text-amber-500')}>
            {hrs.toFixed(1)}
            {isTbd && <span className="ml-1 text-[10px] font-semibold">TBD</span>}
          </span>
        );
      }
      case 'type': {
        const tl = laborType === 'warranty' ? 'W' : laborType === 'customer-pay' ? 'CP' : 'I';
        const tc = laborType === 'warranty'
          ? 'text-[hsl(var(--status-warranty))]'
          : laborType === 'customer-pay'
            ? 'text-[hsl(var(--status-customer-pay))]'
            : 'text-[hsl(var(--status-internal))]';
        return <span className={cn('font-semibold text-xs', tc)}>{tl}</span>;
      }
      case 'roTotal':
        return <span className="tabular-nums font-bold text-primary">{maskHours(row.roTotal, hideTotals)}h</span>;
      case 'tbd':
        return line?.isTbd ? <span className="text-amber-500 text-xs font-semibold">⏳</span> : '';
      case 'notes':
        return <span className="text-xs text-muted-foreground truncate">{row.ro.notes || ''}</span>;
      case 'mileage':
        return <span className="text-xs tabular-nums">{row.ro.mileage || ''}</span>;
      case 'vin':
        return <span className="text-[11px] font-mono text-muted-foreground">{row.ro.vehicle?.vin || ''}</span>;
      default: return '';
    }
  }, [hideTotals]);

  /* ─── Export helpers ─── */
  const buildExportRows = useCallback((columns: ColumnId[]) => {
    const headers = columns.map(id => ALL_COLUMNS.find(c => c.id === id)!.label);
    const dataRows = rows.filter((r): r is FlatRow => r.type === 'data');

    const csvRows: string[][] = [];
    let currentDate = '';
    let dayTotal = 0;

    const sorted = [...dataRows].sort((a, b) => {
      const aD = a.ro.paidDate || a.ro.date, bD = b.ro.paidDate || b.ro.date;
      return aD.localeCompare(bD) || a.ro.roNumber.localeCompare(b.ro.roNumber);
    });

    for (const row of sorted) {
      const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
      if (line?.isTbd) continue;
      const dateKey = (row.ro.paidDate || row.ro.date).slice(0, 10);

      if (currentDate && dateKey !== currentDate) {
        const totalRow = columns.map(id => {
          if (id === 'date') return csvCell(currentDate);
          if (id === 'description') return csvCell('DAY TOTAL');
          if (id === 'hours') return csvCell(dayTotal.toFixed(2));
          return csvCell('');
        });
        csvRows.push(totalRow);
        dayTotal = 0;
      }
      currentDate = dateKey;

      const hrs = line ? line.hoursPaid : row.ro.paidHours;
      dayTotal += hrs;

      // ALWAYS repeat RO-level fields on every row
      const vals = columns.map(id => {
        const laborType = line?.laborType ?? row.ro.laborType;
        switch (id) {
          case 'roNumber': return csvCell(row.ro.roNumber);
          case 'date': return csvCell(row.ro.paidDate || row.ro.date);
          case 'advisor': return csvCell(row.ro.advisor || '');
          case 'customer': return csvCell(row.ro.customerName || '');
          case 'vehicle': return csvCell(formatVehicleChip(row.ro.vehicle) || '');
          case 'lineNo': return csvCell(line ? line.lineNo : 1);
          case 'description': return csvCell(line ? line.description : row.ro.workPerformed);
          case 'hours': return csvCell(hrs.toFixed(2));
          case 'type': return csvCell(typeCode(laborType));
          case 'roTotal': return csvCell(row.roTotal.toFixed(2));
          case 'tbd': return csvCell(line?.isTbd ? 'Y' : 'N');
          case 'notes': return csvCell(row.ro.notes || '');
          case 'mileage': return csvCell(row.ro.mileage || '');
          case 'vin': return csvCell(row.ro.vehicle?.vin || '');
          default: return csvCell('');
        }
      });
      csvRows.push(vals);
    }

    // Final day total
    if (currentDate) {
      const totalRow = columns.map(id => {
        if (id === 'date') return csvCell(currentDate);
        if (id === 'description') return csvCell('DAY TOTAL');
        if (id === 'hours') return csvCell(dayTotal.toFixed(2));
        return csvCell('');
      });
      csvRows.push(totalRow);
    }

    // Period total
    const periodTotal = sorted.reduce((sum, r) => {
      const line = r.lineIndex >= 0 ? r.ro.lines[r.lineIndex] : null;
      if (line?.isTbd) return sum;
      return sum + (line ? line.hoursPaid : r.ro.paidHours);
    }, 0);
    const periodRow = columns.map(id => {
      if (id === 'description') return csvCell('PERIOD TOTAL');
      if (id === 'hours') return csvCell(periodTotal.toFixed(2));
      return csvCell('');
    });
    csvRows.push(periodRow);

    return { headers, csvRows };
  }, [rows]);

  const handleExportPayroll = useCallback(() => {
    const cols: ColumnId[] = ['roNumber', 'date', 'advisor', 'customer', 'vehicle', 'description', 'hours', 'type'];
    const { headers, csvRows } = buildExportRows(cols);
    const csv = buildCSV(headers, csvRows);
    downloadCSVFile(csv, `payroll-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Payroll CSV downloaded');
  }, [buildExportRows]);

  const handleExportFull = useCallback(() => {
    const cols: ColumnId[] = ['roNumber', 'date', 'advisor', 'customer', 'vehicle', 'lineNo', 'description', 'hours', 'type', 'roTotal', 'tbd', 'notes', 'mileage', 'vin'];
    const { headers, csvRows } = buildExportRows(cols);
    const csv = buildCSV(headers, csvRows);
    downloadCSVFile(csv, `audit-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Full CSV downloaded');
  }, [buildExportRows]);

  const handleExportXLSX = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const cols: ColumnId[] = activeColIds;
      const { headers, csvRows } = buildExportRows(cols);

      const parseCell = (c: string) => {
        if (!c) return '';
        if (c.startsWith('"') && c.endsWith('"')) return c.slice(1, -1).replace(/""/g, '"');
        return c;
      };
      const data = [headers, ...csvRows.map(r => r.map(parseCell))];

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = headers.map((h) => {
        if (h === 'Work Performed' || h === 'Description') return { wch: 40 };
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
  }, [activeColIds, buildExportRows]);

  const handleExportPayrollPDF = useCallback(async () => {
    try {
      const { exportPDF } = await import('@/lib/pdfExport');
      const cols: ColumnId[] = ['roNumber', 'date', 'advisor', 'customer', 'vehicle', 'description', 'hours', 'type'];
      exportPDF(ros, cols, `payroll-${format(new Date(), 'yyyy-MM-dd')}.pdf`, `Payroll Report${rangeLabel ? ' — ' + rangeLabel : ''}`);
      toast.success('Payroll PDF downloaded');
    } catch (err) {
      console.error('PDF export failed', err);
      toast.error('PDF export failed');
    }
  }, [ros, rangeLabel]);

  const handleExportAuditPDF = useCallback(async () => {
    try {
      const { exportPDF } = await import('@/lib/pdfExport');
      const cols: ColumnId[] = ['roNumber', 'date', 'advisor', 'customer', 'vehicle', 'lineNo', 'description', 'hours', 'type', 'roTotal', 'notes', 'mileage', 'vin'];
      exportPDF(ros, cols, `audit-${format(new Date(), 'yyyy-MM-dd')}.pdf`, `Audit Report${rangeLabel ? ' — ' + rangeLabel : ''}`);
      toast.success('Audit PDF downloaded');
    } catch (err) {
      console.error('PDF export failed', err);
      toast.error('PDF export failed');
    }
  }, [ros, rangeLabel]);

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

  /* ─── Empty state ─── */
  if (ros.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-medium">No ROs to display</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ─── Toolbar ─── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-card flex-wrap">
        <div className="flex items-center gap-2">
          {rangeLabel && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{rangeLabel}</span>
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

          {/* Group by */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-7 w-[120px] text-xs border-border">
              <Layers className="h-3 w-3 mr-1 flex-shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="ro">By RO</SelectItem>
              <SelectItem value="advisor">By Advisor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          {/* Density toggle */}
          <Button
            variant="ghost" size="sm" className="h-7 gap-1 text-xs"
            onClick={handleDensityChange}
            title={density === 'compact' ? 'Comfortable' : 'Compact'}
          >
            {density === 'compact' ? <Rows4 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
          </Button>

          <ColumnChooser activeColumns={activeColIds} onToggle={handleToggleCol} />

          {/* Export dropdown - Pro only */}
          {isPro && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportPayroll}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Payroll CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportFull}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Audit CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPayrollPDF}>
                  <FileText className="h-3.5 w-3.5 mr-2" /> Payroll PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportAuditPDF}>
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
      <div className="flex-1 overflow-auto pr-5" ref={tableRef} style={{ scrollbarGutter: 'stable' }}>
        <table className={cn('w-full border-collapse table-fixed', textSize)}>
          <colgroup>
            {activeCols.map((col) => {
              // Description gets remaining space via auto; others get fixed widths
              if (col.id === 'description') {
                return <col key={col.id} />;
              }
              return <col key={col.id} style={{ width: col.minWidth }} />;
            })}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-card border-b-2 border-border">
            <tr>
              {activeCols.map((col) => {
                const sticky = stickyStyles[col.id];
                return (
                  <th
                    key={col.id}
                    className={cn(
                      cellPx, cellPy,
                      'font-semibold text-muted-foreground whitespace-nowrap bg-card overflow-hidden',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.id === 'roTotal' && 'bg-primary/5',
                    )}
                    style={{
                      ...(sticky ? { ...sticky, zIndex: 11 } : {}),
                    }}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => {
              if (row.type === 'group-header') {
                const isCollapsed = collapsed.has(row.groupKey);
                return (
                  <tr key={`hdr-${row.groupKey}`} className="bg-muted/60">
                    <td
                      colSpan={activeCols.length}
                      className={cn(cellPx, 'py-1.5 font-bold text-foreground text-xs uppercase tracking-wider cursor-pointer select-none')}
                      onClick={() => toggleCollapse(row.groupKey)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {isCollapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                          {row.label}
                        </span>
                        <span className="text-muted-foreground font-medium normal-case tracking-normal">
                          {row.roCount} RO{row.roCount !== 1 ? 's' : ''} · {maskHours(row.groupHours, hideTotals)}h
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }

              if (row.type === 'group-total') {
                return (
                  <tr key={`gtot-${row.groupKey}`} className="bg-muted/30 border-t border-border">
                    {activeCols.map(col => {
                      if (col.id === 'description')
                        return <td key={col.id} className={cn(cellPx, cellPy, 'text-xs font-bold text-muted-foreground uppercase')}>
                          {groupBy === 'date' ? 'Day Total' : 'Group Total'}
                        </td>;
                      if (col.id === 'hours')
                        return <td key={col.id} className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-foreground')}>{maskHours(row.groupHours, hideTotals)}h</td>;
                      return <td key={col.id} className={cn(cellPx, cellPy)} />;
                    })}
                  </tr>
                );
              }

              // Data row
              const laborType = (row.lineIndex >= 0 ? row.ro.lines[row.lineIndex]?.laborType : null) ?? row.ro.laborType;
              const borderColorClass = laborType === 'warranty'
                ? 'border-l-[hsl(var(--status-warranty))]'
                : laborType === 'customer-pay'
                  ? 'border-l-[hsl(var(--status-customer-pay))]'
                  : 'border-l-[hsl(var(--status-internal))]';

              return (
                <tr
                  key={`${row.ro.id}-${row.lineIndex}`}
                  className={cn(
                    'cursor-pointer hover:bg-accent/50 transition-colors',
                    row.isFirstOfRO ? 'border-t border-border' : 'border-t border-border/30',
                    row.groupIndex % 2 === 1 && 'bg-muted/20',
                  )}
                  onClick={() => onSelectRO(row.ro)}
                >
                  {activeCols.map((col, ci) => {
                    const sticky = stickyStyles[col.id];
                    const isFirstCol = ci === 0;

                    return (
                      <td
                        key={col.id}
                        className={cn(
                          cellPx, cellPy,
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.id === 'description' ? 'truncate overflow-hidden' : 'whitespace-nowrap overflow-hidden',
                          col.id === 'roTotal' && 'bg-primary/5',
                          isFirstCol && `border-l-[3px] ${borderColorClass}`,
                          'align-top bg-card',
                          row.groupIndex % 2 === 1 && 'bg-muted/20',
                        )}
                        style={{
                          ...(sticky ? { ...sticky, zIndex: 1 } : {}),
                        }}
                      >
                        {renderCellValue(col.id, row)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Period total row */}
            <tr className="border-t-2 border-border bg-primary/5">
              {activeCols.map(col => {
                if (col.id === 'description')
                  return <td key={col.id} className={cn(cellPx, cellPy, 'font-bold text-foreground uppercase text-xs')}>Period Total</td>;
                if (col.id === 'hours')
                  return <td key={col.id} className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-foreground text-base')}>{maskHours(totalHours, hideTotals)}h</td>;
                return <td key={col.id} className={cn(cellPx, cellPy)} />;
              })}
            </tr>

            {hasMore && (
              <tr>
                <td colSpan={activeCols.length} className="text-center py-3">
                  <button
                    onClick={() => setVisibleCount(c => c + ROW_BATCH)}
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

      {/* ─── Footer ─── */}
      <div className="flex-shrink-0 border-t-2 border-border bg-card px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex gap-4 text-muted-foreground">
          <span><strong className="text-foreground">{ros.length}</strong> ROs</span>
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
