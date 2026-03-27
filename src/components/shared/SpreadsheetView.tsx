import { useMemo, useRef, useCallback, useState, useEffect, memo, type ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  Printer, Download, ChevronDown, MoreVertical,
  Rows3, Rows4, FileSpreadsheet, FileText, Group, CalendarRange, CalendarDays,
  CheckSquare, Square, Flag, CircleDot, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
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
  type ColumnId, type ColumnDef, type ViewMode, type Density,
} from '@/components/shared/spreadsheet/types';
import type { RepairOrder } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';
import { toast } from 'sonner';
import { computeDateRangeBounds, filterROsByDateRange, type DateFilterKey } from '@/lib/dateRangeFilter';
import { CustomDateRangeDialog } from '@/components/shared/CustomDateRangeDialog';
import {
  buildSpreadsheetRows,
  PAYROLL_EXPORT_HEADERS,
  AUDIT_EXPORT_HEADERS,
  rowToExportCells,
  type SpreadsheetRow,
  type SpreadsheetLineRow,
  type SpreadsheetSubtotalRow,
} from '@/lib/buildSpreadsheetRows';

/* ─── Spreadsheet-local date range (independent from global shared state) ─── */
const SS_LS_KEY = "ui.spreadsheet.dateRange.v1";

interface SSDateState {
  dateFilter: DateFilterKey;
  customStart?: string;
  customEnd?: string;
}

function readSSLS(): SSDateState | null {
  try {
    const raw = localStorage.getItem(SS_LS_KEY);
    return raw ? (JSON.parse(raw) as SSDateState) : null;
  } catch { return null; }
}

function writeSSLS(s: SSDateState) {
  try { localStorage.setItem(SS_LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/* ─── Memoized line row ─── */
interface LineRowProps {
  line: SpreadsheetLineRow;
  activeCols: ColumnDef[];
  cellPx: string;
  cellPy: string;
  rowBg: string;
  borderColorClass: string;
  renderCellValue: (colId: ColumnId, row: SpreadsheetLineRow) => ReactNode;
  onSelectRO: (ro: RepairOrder) => void;
  isSelected: boolean;
  showCheckbox: boolean;
  onToggleSelect: (roId: string) => void;
}

const LineRow = memo(function LineRow({
  line, activeCols, cellPx, cellPy, rowBg, borderColorClass,
  renderCellValue, onSelectRO, isSelected, showCheckbox, onToggleSelect,
}: LineRowProps) {
  return (
    <tr
      className={cn(
        'cursor-pointer transition-colors border-t border-border/40',
        isSelected
          ? 'bg-primary/8 hover:bg-primary/12 ring-1 ring-inset ring-primary/20'
          : cn(rowBg, 'hover:bg-accent/50'),
      )}
      onClick={() => line.ro && onSelectRO(line.ro)}
    >
      {showCheckbox && (
        <td className={cn(cellPx, cellPy, 'w-9 text-center')} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => line.ro && onToggleSelect(line.ro.id)}
            className="h-3.5 w-3.5"
          />
        </td>
      )}
      {activeCols.map((col, ci) => (
        <td
          key={col.id}
          className={cn(
            cellPx, cellPy,
            col.align === 'right' && 'text-right',
            col.align === 'center' && 'text-center',
            col.id === 'description' ? 'truncate overflow-hidden' : 'whitespace-nowrap overflow-hidden',
            ci === 0 && !showCheckbox && `border-l-[3px] ${borderColorClass}`,
            showCheckbox && ci === 0 && `border-l-[3px] ${borderColorClass}`,
            'align-top',
          )}
        >
          {renderCellValue(col.id, line)}
        </td>
      ))}
    </tr>
  );
});

/* ─── Mobile card row ─── */
interface MobileLineCardProps {
  line: SpreadsheetLineRow;
  onSelectRO: (ro: RepairOrder) => void;
  isSelected: boolean;
  showCheckbox: boolean;
  onToggleSelect: (roId: string) => void;
  flagCount: number;
}

const MobileLineCard = memo(function MobileLineCard({ line, onSelectRO, isSelected, showCheckbox, onToggleSelect, flagCount }: MobileLineCardProps) {
  const borderColorClass = line.laborType === 'warranty'
    ? 'border-l-[hsl(var(--status-warranty))]'
    : line.laborType === 'customer-pay'
      ? 'border-l-[hsl(var(--status-customer-pay))]'
      : 'border-l-[hsl(var(--status-internal))]';

  const typeColor = line.laborType === 'warranty'
    ? 'text-[hsl(var(--status-warranty))]'
    : line.laborType === 'customer-pay'
      ? 'text-[hsl(var(--status-customer-pay))]'
      : 'text-[hsl(var(--status-internal))]';

  const isPaid = !!line.ro?.paidDate;

  return (
    <div
      className={cn(
        'flex items-start gap-2 px-3 py-2.5 border-l-[3px] border-b border-border/40',
        'cursor-pointer active:bg-accent/50 transition-colors',
        borderColorClass,
        isSelected ? 'bg-primary/8' : 'bg-card',
      )}
      onClick={() => line.ro && onSelectRO(line.ro)}
    >
      {showCheckbox && (
        <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => line.ro && onToggleSelect(line.ro.id)}
            className="h-3.5 w-3.5"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-bold text-xs text-foreground shrink-0">#{line.roNumber}</span>
          <span className={cn(
            'text-[9px] font-bold px-1.5 py-0 rounded-full uppercase tracking-wide',
            isPaid
              ? 'bg-[hsl(var(--status-warranty-bg))] text-[hsl(var(--status-warranty))]'
              : 'bg-muted text-muted-foreground',
          )}>
            {isPaid ? 'Paid' : 'Open'}
          </span>
          {flagCount > 0 && (
            <Flag className="h-3 w-3 text-amber-500 fill-amber-500/20" />
          )}
          {line.customer && (
            <span className="text-[11px] text-muted-foreground truncate">{line.customer}</span>
          )}
        </div>
        <p className="text-sm text-foreground leading-snug line-clamp-2">
          {line.description || <span className="italic text-muted-foreground">No description</span>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0 ml-1">
        <span className={cn('text-base font-bold tabular-nums leading-none', line.isTbd && 'line-through text-amber-500')}>
          {line.hours.toFixed(1)}h
        </span>
        <span className={cn('text-[10px] font-semibold uppercase tracking-wide', typeColor)}>
          {line.type}
        </span>
        {line.isTbd && <span className="text-[9px] font-bold text-amber-500">TBD</span>}
      </div>
    </div>
  );
});

/* ─── Props ─── */
interface SpreadsheetViewProps {
  ros: RepairOrder[];
  onSelectRO: (ro: RepairOrder) => void;
  rangeLabel?: string;
  isCloseout?: boolean;
}

type GroupBy = 'date' | 'ro' | 'advisor' | 'none';

/* ─── Columns (no roTotal) ─── */
const DISPLAY_COLUMNS: ColumnId[] = [
  'roNumber', 'date', 'advisor', 'customer', 'vehicle', 'status', 'description', 'hours', 'type',
];

const AUDIT_DISPLAY_COLUMNS: ColumnId[] = [
  'roNumber', 'date', 'advisor', 'customer', 'vehicle', 'status', 'flags', 'lineNo', 'description', 'hours', 'type', 'tbd', 'notes', 'mileage', 'vin',
];

const ROW_BATCH = 120;

/* ─── Date filter bar (spreadsheet-local, does not sync with other tabs) ─── */
interface DateFilterBarProps {
  dateRange: DateFilterKey;
  computedRangeLabel: string;
  hasCustomPayPeriod: boolean;
  isMobile: boolean;
  onSelect: (f: DateFilterKey) => void;
  onCustomRequest: () => void;
}

function DateFilterBar({ dateRange, computedRangeLabel, hasCustomPayPeriod, isMobile, onSelect, onCustomRequest }: DateFilterBarProps) {
  const filterOpts: { value: DateFilterKey; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'last_week', label: 'Last Wk' },
    { value: 'month', label: 'Month' },
    ...(hasCustomPayPeriod ? [{ value: 'pay_period' as DateFilterKey, label: 'Pay Period' }] : []),
    { value: 'all', label: 'All' },
    { value: 'custom', label: isMobile ? 'Custom…' : 'Custom' },
  ];

  const activeLabelShort =
    dateRange === 'all' ? 'All'
    : dateRange === 'today' ? 'Today'
    : dateRange === 'last_week' ? 'Last Wk'
    : dateRange === 'week' ? 'Week'
    : dateRange === 'month' ? 'Month'
    : dateRange === 'pay_period' ? 'Pay Period'
    : 'Custom';

  if (isMobile) {
    return (
      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] max-w-[140px]">
              <CalendarDays className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{activeLabelShort}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Spreadsheet Range</p>
            </div>
            <DropdownMenuSeparator />
            {filterOpts.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => opt.value === 'custom' ? onCustomRequest() : onSelect(opt.value)}
                className={cn(dateRange === opt.value && 'bg-primary/10 text-primary font-semibold')}
              >
                {opt.label}
                {opt.value === 'pay_period' && dateRange === 'pay_period' && computedRangeLabel && (
                  <span className="ml-auto text-[10px] text-muted-foreground">{computedRangeLabel}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {computedRangeLabel && (
          <Badge
            variant={dateRange === 'custom' ? 'secondary' : 'outline'}
            className={cn(
              'gap-1 text-[10px] px-1.5 py-0 h-5 font-medium',
              dateRange === 'custom' && 'cursor-pointer hover:bg-muted',
            )}
            onClick={() => { if (dateRange === 'custom') onCustomRequest(); }}
          >
            {computedRangeLabel}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0 rounded-lg border border-border overflow-hidden bg-card">
        {filterOpts.map((opt, idx) => (
          <button
            key={opt.value}
            onClick={() => opt.value === 'custom' ? onCustomRequest() : onSelect(opt.value)}
            className={cn(
              'px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors whitespace-nowrap',
              idx > 0 && 'border-l border-border/60',
              dateRange === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {computedRangeLabel && (
        <Badge
          variant={dateRange === 'custom' ? 'secondary' : 'outline'}
          className={cn(
            'gap-1 text-[10px] px-2 h-5 font-medium shrink-0',
            dateRange === 'custom' && 'cursor-pointer hover:bg-muted',
          )}
          onClick={() => { if (dateRange === 'custom') onCustomRequest(); }}
        >
          <CalendarRange className="h-2.5 w-2.5" />
          {computedRangeLabel}
        </Badge>
      )}
    </div>
  );
}

/* ─── Batch Action Bar ─── */
interface BatchBarProps {
  selectedCount: number;
  onMarkPaid: () => void;
  onExportSelected: () => void;
  onClearFlags: () => void;
  onDeselectAll: () => void;
  hasFlagsInSelection: boolean;
  isPro: boolean;
}

function BatchActionBar({ selectedCount, onMarkPaid, onExportSelected, onClearFlags, onDeselectAll, hasFlagsInSelection, isPro }: BatchBarProps) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20 animate-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-1.5">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{selectedCount} selected</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] gap-1"
          onClick={onMarkPaid}
        >
          <CircleDot className="h-3 w-3" />
          Mark Paid
        </Button>

        {hasFlagsInSelection && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={onClearFlags}
          >
            <Flag className="h-3 w-3" />
            Clear Flags
          </Button>
        )}

        {isPro && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={onExportSelected}
          >
            <Download className="h-3 w-3" />
            Export
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
          onClick={onDeselectAll}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Component ─── */
export function SpreadsheetView({ ros, onSelectRO, rangeLabel, isCloseout }: SpreadsheetViewProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { userSettings, updateUserSetting, getFlagsForRO, clearFlagsBulk } = useFlagContext();
  const { isPro } = useSubscription();
  const isMobile = useIsMobile();
  const hideTotals = userSettings.hideTotals ?? false;

  const persistedViewMode = ((userSettings as any).spreadsheetViewMode as ViewMode) || 'payroll';
  const persistedDensity = ((userSettings as any).spreadsheetDensity as Density) || 'compact';
  const persistedGroupBy = ((userSettings as any).spreadsheetGroupBy as GroupBy) || 'date';

  const [viewMode, setViewMode] = useState<ViewMode>(persistedViewMode);
  const [density, setDensity] = useState<Density>(persistedDensity);
  const [groupBy, setGroupBy] = useState<GroupBy>(persistedGroupBy);
  const [activeColIds, setActiveColIds] = useState<ColumnId[]>(
    persistedViewMode === 'payroll' ? DISPLAY_COLUMNS : AUDIT_DISPLAY_COLUMNS
  );

  /* ─── Selection state ─── */
  const [selectedROIds, setSelectedROIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleSelect = useCallback((roId: string) => {
    setSelectedROIds(prev => {
      const next = new Set(prev);
      if (next.has(roId)) next.delete(roId); else next.add(roId);
      return next;
    });
    setSelectionMode(true);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedROIds(new Set());
    setSelectionMode(false);
  }, []);

  const hasCustomPayPeriod = userSettings.payPeriodType === 'custom' &&
    Array.isArray(userSettings.payPeriodEndDates) &&
    (userSettings.payPeriodEndDates as number[]).length > 0;

  /* ─── Local (spreadsheet-only) date range state ─── */
  const ssDefaultFilter: DateFilterKey = hasCustomPayPeriod ? 'pay_period' : 'week';
  const ssSaved = readSSLS();
  const [dateRange, setDateRangeRaw] = useState<DateFilterKey>(ssSaved?.dateFilter ?? ssDefaultFilter);
  const [customStart, setCustomStart] = useState<string | undefined>(ssSaved?.customStart);
  const [customEnd, setCustomEnd] = useState<string | undefined>(ssSaved?.customEnd);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [prevFilter, setPrevFilter] = useState<DateFilterKey>(ssSaved?.dateFilter ?? ssDefaultFilter);
  const [stashedCustomStart, setStashedCustomStart] = useState<string | undefined>(ssSaved?.customStart);
  const [stashedCustomEnd, setStashedCustomEnd] = useState<string | undefined>(ssSaved?.customEnd);

  useEffect(() => {
    writeSSLS({ dateFilter: dateRange, customStart, customEnd });
  }, [dateRange, customStart, customEnd]);

  const setDateRange = useCallback((f: DateFilterKey) => {
    if (f === 'custom') {
      setPrevFilter(dateRange);
      setDateRangeRaw('custom');
      setShowCustomDialog(true);
    } else {
      setDateRangeRaw(f);
    }
  }, [dateRange]);

  const requestCustomDialog = useCallback(() => {
    if (dateRange === 'custom' && customStart && customEnd) {
      setStashedCustomStart(customStart);
      setStashedCustomEnd(customEnd);
      setPrevFilter('custom');
      setCustomStart(undefined);
      setCustomEnd(undefined);
    } else {
      setPrevFilter(dateRange);
      setDateRangeRaw('custom');
    }
    setShowCustomDialog(true);
  }, [dateRange, customStart, customEnd]);

  const applyCustom = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setStashedCustomStart(start);
    setStashedCustomEnd(end);
    setDateRangeRaw('custom');
    setShowCustomDialog(false);
  }, []);

  const cancelCustom = useCallback(() => {
    if (stashedCustomStart && stashedCustomEnd) {
      setCustomStart(stashedCustomStart);
      setCustomEnd(stashedCustomEnd);
      setDateRangeRaw('custom');
    } else {
      setDateRangeRaw(prevFilter !== 'custom' ? prevFilter : 'week');
    }
    setShowCustomDialog(false);
  }, [stashedCustomStart, stashedCustomEnd, prevFilter]);

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
    if (isCloseout) {
      return { filteredROs: ros, computedRangeLabel: rangeLabel || 'All ROs' };
    }

    const bounds = computeDateRangeBounds({
      filter: dateRange,
      weekStartDay: userSettings.weekStartDay ?? 0,
      defaultSummaryRange: userSettings.defaultSummaryRange,
      payPeriodEndDates: (userSettings.payPeriodEndDates || []) as number[],
      hasCustomPayPeriod,
      customStart,
      customEnd,
    });

    if (!bounds) {
      return { filteredROs: ros, computedRangeLabel: rangeLabel || 'All ROs' };
    }

    return {
      filteredROs: filterROsByDateRange(ros, bounds),
      computedRangeLabel: bounds.label,
    };
  }, [ros, dateRange, isCloseout, rangeLabel, userSettings.payPeriodEndDates, userSettings.weekStartDay, userSettings.defaultSummaryRange, hasCustomPayPeriod, customStart, customEnd]);

  /* ─── Flag counts per RO ─── */
  const roFlagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const ro of filteredROs) {
      const flags = getFlagsForRO(ro.id);
      if (flags.length > 0) map.set(ro.id, flags.length);
    }
    return map;
  }, [filteredROs, getFlagsForRO]);

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

  /* ─── Batch action helpers ─── */
  const hasFlagsInSelection = useMemo(() => {
    for (const roId of selectedROIds) {
      if (roFlagCounts.has(roId)) return true;
    }
    return false;
  }, [selectedROIds, roFlagCounts]);

  const handleBatchMarkPaid = useCallback(() => {
    // This would need updateRO from ROContext, but we don't have it here.
    // For now, give feedback that this requires the RO detail flow.
    toast.info(`Mark ${selectedROIds.size} RO(s) as paid — open each RO to set paid date`);
    deselectAll();
  }, [selectedROIds, deselectAll]);

  const handleBatchClearFlags = useCallback(() => {
    const flagIds: string[] = [];
    for (const roId of selectedROIds) {
      const flags = getFlagsForRO(roId);
      flagIds.push(...flags.map(f => f.id));
    }
    if (flagIds.length === 0) return;
    clearFlagsBulk(flagIds);
    toast.success(`Cleared ${flagIds.length} flag(s) from ${selectedROIds.size} RO(s)`);
    deselectAll();
  }, [selectedROIds, getFlagsForRO, clearFlagsBulk, deselectAll]);

  const handleBatchExport = useCallback(() => {
    const selectedROs = filteredROs.filter(ro => selectedROIds.has(ro.id));
    const rows = buildSpreadsheetRows({ ros: selectedROs, periodLabel: 'Selected', groupBy: 'none' });
    const headers = viewMode === 'payroll' ? PAYROLL_EXPORT_HEADERS : AUDIT_EXPORT_HEADERS;
    const exportRows = rows
      .filter(r => !(r.rowType === 'line' && (r as SpreadsheetLineRow).isTbd))
      .map(r => rowToExportCells(r, headers).map(c => csvCell(c)));
    const csv = buildCSV(headers, exportRows);
    downloadCSVFile(csv, `selected-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success(`Exported ${selectedROs.length} RO(s)`);
    deselectAll();
  }, [selectedROIds, filteredROs, viewMode, deselectAll, groupBy]);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredROs.map(ro => ro.id));
    setSelectedROIds(allIds);
    setSelectionMode(true);
  }, [filteredROs]);

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
      case 'status': {
        const isPaid = !!row.ro?.paidDate;
        return (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide',
            isPaid
              ? 'bg-[hsl(var(--status-warranty-bg))] text-[hsl(var(--status-warranty))]'
              : 'bg-muted text-muted-foreground',
          )}>
            {isPaid ? 'Paid' : 'Open'}
          </span>
        );
      }
      case 'flags': {
        const count = row.ro ? (roFlagCounts.get(row.ro.id) ?? 0) : 0;
        if (count === 0) return '';
        return (
          <span className="inline-flex items-center gap-0.5 text-amber-500">
            <Flag className="h-3 w-3 fill-amber-500/20" />
            {count > 1 && <span className="text-[10px] font-bold">{count}</span>}
          </span>
        );
      }
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
  }, [roFlagCounts]);

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
    } catch {
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
    } catch {
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
    groupIndex % 2 === 1 ? 'bg-accent/20' : 'bg-card';

  const showCheckbox = selectionMode || selectedROIds.size > 0;

  /* ─── Empty state ─── */
  if (filteredROs.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border/90 bg-gradient-to-r from-card to-accent/40 flex-wrap">
          {!isCloseout && (
            <DateFilterBar
              dateRange={dateRange}
              computedRangeLabel={computedRangeLabel}
              hasCustomPayPeriod={hasCustomPayPeriod}
              isMobile={isMobile}
              onSelect={setDateRange}
              onCustomRequest={requestCustomDialog}
            />
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <CalendarDays className="h-8 w-8 opacity-30" />
          <p className="text-base font-medium">No ROs in this range</p>
          <p className="text-xs opacity-60">Try a different date range</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ─── Toolbar ─── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border/90 bg-gradient-to-r from-card via-card to-accent/40 backdrop-blur-sm flex-wrap shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {!isCloseout && (
            <DateFilterBar
              dateRange={dateRange}
              computedRangeLabel={computedRangeLabel}
              hasCustomPayPeriod={hasCustomPayPeriod}
              isMobile={isMobile}
              onSelect={setDateRange}
              onCustomRequest={requestCustomDialog}
            />
          )}

          {/* View mode */}
          <div className="flex rounded-lg border border-border/90 overflow-hidden bg-accent/35 shadow-[var(--shadow-sm)]">
            {(['payroll', 'audit'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => handleViewModeChange(m)}
                className={cn(
                  'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                  viewMode === m
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-muted-foreground hover:bg-accent/35',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Group by — hidden on mobile */}
          {!isMobile && (
            <Select value={groupBy} onValueChange={(v) => handleGroupByChange(v as GroupBy)}>
              <SelectTrigger className="h-8 w-[128px] text-xs font-semibold">
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
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Select toggle */}
          {!isMobile && (
            <Button
              variant={selectionMode ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => selectionMode ? deselectAll() : handleSelectAll()}
            >
              {selectionMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              Select
            </Button>
          )}

          {/* Desktop-only controls */}
          {!isMobile && (
            <>
              <Button
                variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                onClick={handleDensityChange}
                title={density === 'compact' ? 'Comfortable' : 'Compact'}
              >
                {density === 'compact' ? <Rows4 className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
              </Button>

              <ColumnChooser activeColumns={activeColIds} onToggle={handleToggleCol} />

              {isPro && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
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
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}

          {/* Mobile: collapse everything into a single ⋮ menu */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => selectionMode ? deselectAll() : handleSelectAll()}>
                  {selectionMode ? <CheckSquare className="h-3.5 w-3.5 mr-2" /> : <Square className="h-3.5 w-3.5 mr-2" />}
                  {selectionMode ? 'Deselect All' : 'Select All'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Group By</p>
                </div>
                {(['date', 'ro', 'advisor', 'none'] as GroupBy[]).map(g => (
                  <DropdownMenuItem
                    key={g}
                    onClick={() => handleGroupByChange(g)}
                    className={cn(groupBy === g && 'bg-primary/10 text-primary font-semibold')}
                  >
                    {g === 'date' ? 'By Date' : g === 'ro' ? 'By RO' : g === 'advisor' ? 'By Advisor' : 'No Grouping'}
                  </DropdownMenuItem>
                ))}
                {isPro && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Export</p>
                    </div>
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
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ─── Batch Action Bar ─── */}
      {selectedROIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedROIds.size}
          onMarkPaid={handleBatchMarkPaid}
          onExportSelected={handleBatchExport}
          onClearFlags={handleBatchClearFlags}
          onDeselectAll={deselectAll}
          hasFlagsInSelection={hasFlagsInSelection}
          isPro={isPro}
        />
      )}

      {/* ─── Mobile card list ─── */}
      {isMobile ? (
        <div className="flex-1 overflow-auto">
          {visibleRows.map((row, i) => {
            if (row.rowType === 'daySubtotal' || row.rowType === 'advisorSubtotal') {
              const sub = row as SpreadsheetSubtotalRow;
              return (
                <div
                  key={`header-${i}`}
                  className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 bg-secondary/95 backdrop-blur-sm border-b border-t border-border shadow-[0_2px_6px_-4px_hsl(var(--foreground)/0.2)]"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground">{sub.label}</span>
                  <span className="text-xs font-bold tabular-nums text-foreground">{maskHours(sub.hours, hideTotals)}h</span>
                </div>
              );
            }
            if (row.rowType === 'roSubtotal') {
              const sub = row as SpreadsheetSubtotalRow;
              return (
                <div key={`rosub-${i}`} className="flex items-center justify-between px-3 py-1.5 bg-accent/20 border-b border-border/40">
                  <span className="text-xs font-semibold text-muted-foreground">{sub.label}</span>
                  <div className="flex items-center gap-2">
                    {(sub.cpHours! > 0 || sub.wHours! > 0 || sub.iHours! > 0) && (
                      <span className="text-[10px] text-muted-foreground">
                        {[
                          sub.cpHours ? `CP ${sub.cpHours.toFixed(1)}` : '',
                          sub.wHours ? `W ${sub.wHours.toFixed(1)}` : '',
                          sub.iHours ? `I ${sub.iHours.toFixed(1)}` : '',
                        ].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <span className="text-xs font-bold tabular-nums text-primary">{maskHours(sub.hours, hideTotals)}h</span>
                  </div>
                </div>
              );
            }
            if (row.rowType === 'periodSubtotal') {
              const sub = row as SpreadsheetSubtotalRow;
              return (
                <div key={`period-${i}`} className="flex items-center justify-between px-3 py-2.5 bg-primary/10 border-t-2 border-border">
                  <span className="text-sm font-bold uppercase tracking-wide text-foreground">{sub.label}</span>
                  <span className="text-lg font-bold tabular-nums text-foreground">{maskHours(sub.hours, hideTotals)}h</span>
                </div>
              );
            }
            const line = row as SpreadsheetLineRow;
            const roId = line.ro?.id ?? '';
            return (
              <MobileLineCard
                key={`line-${i}`}
                line={line}
                onSelectRO={onSelectRO}
                isSelected={selectedROIds.has(roId)}
                showCheckbox={showCheckbox}
                onToggleSelect={toggleSelect}
                flagCount={roFlagCounts.get(roId) ?? 0}
              />
            );
          })}
          {hasMore && (
            <button
              onClick={() => setVisibleCount(c => c + ROW_BATCH)}
              className="w-full py-3.5 text-sm font-medium text-primary hover:text-primary/80 active:scale-95 transition-all border-t border-border/40"
            >
              Show {allRows.length - visibleCount} more
            </button>
          )}
        </div>
      ) : (
        /* ─── Desktop Table ─── */
        <div className="flex-1 overflow-auto" ref={tableRef}>
          <table className={cn('min-w-[900px] w-full border-collapse', textSize)}>
            <thead className="sticky top-0 z-20 border-b-2 border-border">
              <tr className="bg-secondary/98 backdrop-blur-sm shadow-[0_2px_6px_-4px_hsl(var(--foreground)/0.18)]">
                {showCheckbox && (
                  <th className={cn(cellPx, cellPy, 'w-9 text-center bg-secondary/98')}>
                    <Checkbox
                      checked={selectedROIds.size === filteredROs.length && filteredROs.length > 0}
                      onCheckedChange={(checked) => checked ? handleSelectAll() : deselectAll()}
                      className="h-3.5 w-3.5"
                    />
                  </th>
                )}
                {activeCols.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      cellPx, cellPy,
                      'font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap bg-secondary/98 overflow-hidden',
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
                if (row.rowType === 'roSubtotal') {
                  const sub = row as SpreadsheetSubtotalRow;
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  const hrsIdx = activeCols.findIndex(c => c.id === 'hours') + (showCheckbox ? 1 : 0);
                  const typeIdx = activeCols.findIndex(c => c.id === 'type') + (showCheckbox ? 1 : 0);
                  const spanCols = hrsIdx > 0 ? hrsIdx : colCount - 1;
                  const afterCols = colCount - spanCols - 1 - (typeIdx > hrsIdx ? 1 : 0);

                  return (
                    <tr key={`rosub-${i}`} className="border-t border-border/60 bg-accent/15">
                      <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-muted-foreground text-[11px] text-right')}>
                        {sub.label}
                      </td>
                      <td className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-primary text-xs')}>
                        {maskHours(sub.hours, hideTotals)}h
                      </td>
                      {typeIdx > hrsIdx && (
                        <td className={cn(cellPx, cellPy, 'text-[10px] text-muted-foreground')}>
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
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  const hrsIdx = activeCols.findIndex(c => c.id === 'hours') + (showCheckbox ? 1 : 0);
                  const spanCols = hrsIdx > 0 ? hrsIdx : colCount - 1;
                  const afterCols = colCount - spanCols - 1;

                  return (
                    <tr key={`daysub-${i}`} className="border-t-2 border-border bg-accent/30">
                      <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-foreground text-[11px] uppercase text-right')}>
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
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  const hrsIdx = activeCols.findIndex(c => c.id === 'hours') + (showCheckbox ? 1 : 0);
                  const spanCols = hrsIdx > 0 ? hrsIdx : colCount - 1;
                  const afterCols = colCount - spanCols - 1;

                  return (
                    <tr key={`advsub-${i}`} className="border-t-2 border-border bg-accent/30">
                      <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-foreground text-[11px] uppercase text-right')}>
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
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  const hrsIdx = activeCols.findIndex(c => c.id === 'hours') + (showCheckbox ? 1 : 0);
                  const spanCols = hrsIdx > 0 ? hrsIdx : colCount - 1;
                  const afterCols = colCount - spanCols - 1;

                  return (
                    <tr key={`period-${i}`} className="border-t-2 border-border bg-primary/10">
                      <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-foreground uppercase text-[11px] text-right')}>
                        {sub.label}
                      </td>
                      <td className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-foreground text-base')}>
                        {maskHours(sub.hours, hideTotals)}h
                      </td>
                      {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, cellPy)} />}
                    </tr>
                  );
                }

                const line = row as SpreadsheetLineRow;
                const rowBg = getRowBg(line.groupIndex);
                const borderColorClass = line.laborType === 'warranty'
                  ? 'border-l-[hsl(var(--status-warranty))]'
                  : line.laborType === 'customer-pay'
                    ? 'border-l-[hsl(var(--status-customer-pay))]'
                    : 'border-l-[hsl(var(--status-internal))]';
                const roId = line.ro?.id ?? '';

                return (
                  <LineRow
                    key={`line-${i}`}
                    line={line}
                    activeCols={activeCols}
                    cellPx={cellPx}
                    cellPy={cellPy}
                    rowBg={rowBg}
                    borderColorClass={borderColorClass}
                    renderCellValue={renderCellValue}
                    onSelectRO={onSelectRO}
                    isSelected={selectedROIds.has(roId)}
                    showCheckbox={showCheckbox}
                    onToggleSelect={toggleSelect}
                  />
                );
              })}

              {hasMore && (
                <tr>
                  <td colSpan={activeCols.length + (showCheckbox ? 1 : 0)} className="text-center py-3">
                    <button
                      onClick={() => setVisibleCount(c => c + ROW_BATCH)}
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Show {allRows.length - visibleCount} more
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Footer ─── */}
      <div className="flex-shrink-0 border-t-2 border-border bg-gradient-to-r from-card to-accent/35 px-3 py-2 flex items-center justify-between gap-2 text-sm">
        <div className="flex gap-2 text-muted-foreground text-xs">
          <span><strong className="text-foreground">{filteredROs.length}</strong> ROs</span>
          <span><strong className="text-foreground">{totalLines}</strong> lines</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 tabular-nums rounded-lg border border-border/70 bg-accent/20 px-2.5 py-1">
          <span className="text-[hsl(var(--status-warranty))] font-medium text-xs">W: {maskHours(warrantyHours, hideTotals)}h</span>
          <span className="text-[hsl(var(--status-customer-pay))] font-medium text-xs">CP: {maskHours(cpHours, hideTotals)}h</span>
          <span className="text-[hsl(var(--status-internal))] font-medium text-xs">I: {maskHours(internalHours, hideTotals)}h</span>
          <span className="font-bold text-foreground text-sm border-l border-border/50 pl-1.5 ml-0.5">{maskHours(totalHours, hideTotals)}h</span>
        </div>
      </div>

      {/* Text modal */}
      <LineTextModal
        open={textModal.open}
        onClose={() => setTextModal(prev => ({ ...prev, open: false }))}
        lineNo={textModal.lineNo}
        description={textModal.description}
      />

      <CustomDateRangeDialog
        open={showCustomDialog}
        onClose={cancelCustom}
        onApply={applyCustom}
        initialStart={customStart}
        initialEnd={customEnd}
      />
    </div>
  );
}
