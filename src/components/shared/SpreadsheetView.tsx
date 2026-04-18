import { useMemo, useRef, useCallback, useState, useEffect, memo, type ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ChevronDown, MoreVertical,
  Rows3, Rows4, FileText, Group, CalendarRange, CalendarDays,
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
import { typeCode } from '@/lib/csvUtils';
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
import { dateDisplayContext } from '@/lib/roDisplay';
import { hasPaidDate } from '@/lib/paidDate';
import { toast } from 'sonner';
import { computeDateRangeBounds, filterROsByDateRangeWithCarryover, type DateFilterKey } from '@/lib/dateRangeFilter';
import { useSharedDateRange } from '@/hooks/useSharedDateRange';
import { applySharedROFilters, useSharedROFilters } from '@/hooks/useSharedROFilters';
import { getDateFilterLabel, getPeriodFilterLabels } from '@/lib/payPeriodRange';
import { CustomDateRangeDialog } from '@/components/shared/CustomDateRangeDialog';
import { PrintHeader } from '@/components/shared/PrintHeader';
import {
  buildSpreadsheetRows,
  type SpreadsheetLineRow,
  type SpreadsheetSubtotalRow,
  type SpreadsheetSectionDividerRow,
} from '@/lib/buildSpreadsheetRows';

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
  const stickyRoBg = isSelected
    ? 'bg-primary/10'
    : line.isCarryover
      ? 'bg-muted/20'
      : rowBg;

  return (
    <tr
      className={cn(
        'cursor-pointer transition-colors',
        line.isCarryover && 'opacity-60',
        line.lineNo === 1 && 'border-t border-border/40',
        isSelected
          ? 'bg-primary/[0.18] hover:bg-amber-200/70 border-l-[3px] border-l-primary'
          : cn(
              line.isCarryover ? 'bg-muted/20 hover:bg-muted/30' : rowBg,
              'hover:bg-primary/[0.16] border-l-[3px]',
              line.isCarryover ? 'border-l-border border-l-dashed' : borderColorClass,
            ),
      )}
      onClick={() => line.ro && onSelectRO(line.ro)}
    >
      {showCheckbox && (
        <td className={cn(cellPx, cellPy, 'w-8 text-center sticky left-0 z-[2]', stickyRoBg)} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => line.ro && onToggleSelect(line.ro.id)}
            className="h-3.5 w-3.5"
          />
        </td>
      )}
      {activeCols.map((col) => (
        <td
          key={col.id}
          className={cn(
            cellPx, cellPy,
            col.align === 'right' && 'text-right',
            col.align === 'center' && 'text-center',
            col.id === 'description' ? 'truncate overflow-hidden max-w-[1px]' : 'whitespace-nowrap overflow-hidden',
            col.id === 'roNumber' && cn('sticky z-[1]', showCheckbox ? 'left-8' : 'left-0', stickyRoBg, 'shadow-[2px_0_0_hsl(var(--border)/0.2)]'),
            'align-middle',
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
  rowTone: 'base' | 'alt';
  showGroupHeader: boolean;
  isGroupStart: boolean;
}

const MobileLineCard = memo(function MobileLineCard({
  line, onSelectRO, isSelected, showCheckbox, onToggleSelect, flagCount, rowTone, showGroupHeader, isGroupStart,
}: MobileLineCardProps) {
  const borderColorClass = line.isCarryover
    ? 'border-l-border'
    : line.laborType === 'warranty'
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
  const toneSurface = rowTone === 'alt'
    ? 'bg-primary/[0.12] border-primary/30'
    : 'bg-white border-border/55 dark:bg-card';
  const toneCarryover = rowTone === 'alt'
    ? 'bg-primary/[0.09] border-primary/25 opacity-75'
    : 'bg-white/95 border-border/45 opacity-75 dark:bg-card/80';

  return (
    <div
      className={cn(
        'flex items-start gap-2 px-3 py-2.5 border-l-[3px] border-b',
        'cursor-pointer active:bg-primary/[0.14] transition-colors',
        borderColorClass,
        isGroupStart && 'mt-2 rounded-t-lg border-t shadow-[0_1px_4px_-2px_hsl(var(--foreground)/0.22)]',
        line.isCarryover
          ? toneCarryover
          : (isSelected
            ? 'bg-amber-100/90 border-amber-400/65 dark:bg-amber-950/25'
            : toneSurface),
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
        {showGroupHeader ? (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-bold text-xs text-foreground shrink-0">#{line.roNumber}</span>
            <span className={cn(
              'text-[9px] font-bold px-1.5 py-0 rounded-full uppercase tracking-wide',
              isPaid
                ? 'bg-[hsl(var(--status-warranty-bg))] text-[hsl(var(--status-warranty))]'
                : 'bg-[hsl(var(--status-internal-bg))] text-[hsl(var(--status-internal))]',
            )}>
              {isPaid ? 'PAID' : 'OPEN'}
            </span>
            {line.isCarryover && (
              <span className="text-[8px] font-semibold text-muted-foreground/75 border border-dashed border-muted-foreground/30 rounded px-1 py-px uppercase tracking-wide">
                Carryover
              </span>
            )}
            {flagCount > 0 && (
              <Flag className="h-3 w-3 text-amber-500 fill-amber-500/20" />
            )}
            {line.customer && (
              <span className="text-[11px] text-muted-foreground truncate">{line.customer}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-muted-foreground/70 tabular-nums font-medium">Line {line.lineNo}</span>
          </div>
        )}
        <p className={cn('text-[13px] text-foreground leading-snug line-clamp-2', !showGroupHeader && 'pl-1')}>
          {line.description || <span className="italic text-muted-foreground">No description</span>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0 ml-1">
        <span className="text-[15px] font-bold tabular-nums leading-none">
          {line.hours.toFixed(1)}h
        </span>
        <span className={cn('text-[10px] font-semibold uppercase tracking-[0.08em]', typeColor)}>
          {line.type}
        </span>
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
  'roNumber', 'date', 'advisor', 'customer', 'vehicle', 'status', 'flags', 'lineNo', 'description', 'hours', 'type', 'notes', 'mileage', 'vin',
];

const ROW_BATCH = 120;

/* ─── Date filter bar (spreadsheet-local, does not sync with other tabs) ─── */
interface DateFilterBarProps {
  dateRange: DateFilterKey;
  computedRangeLabel: string;
  hasCustomPayPeriod: boolean;
  currentLabel: string;
  previousLabel: string;
  currentLabelShort: string;
  previousLabelShort: string;
  isMobile: boolean;
  onSelect: (f: DateFilterKey) => void;
  onCustomRequest: () => void;
}

function DateFilterBar({
  dateRange, computedRangeLabel, hasCustomPayPeriod, currentLabel, previousLabel, currentLabelShort, previousLabelShort, isMobile, onSelect, onCustomRequest,
}: DateFilterBarProps) {
  const filterOpts: { value: DateFilterKey; label: string }[] = [
    { value: 'today', label: 'Today' },
    ...(hasCustomPayPeriod
      ? [
          { value: 'pay_period' as DateFilterKey, label: currentLabel },
          { value: 'last_pay_period' as DateFilterKey, label: previousLabel },
        ]
      : [
          { value: 'week' as DateFilterKey, label: currentLabel },
          { value: 'last_week' as DateFilterKey, label: previousLabel },
        ]),
    { value: 'month', label: 'Month' },
    { value: 'all', label: 'All' },
    { value: 'custom', label: isMobile ? 'Custom…' : 'Custom' },
  ];

  const activeLabelShort =
    dateRange === 'week' || dateRange === 'pay_period'
      ? currentLabelShort
      : dateRange === 'last_week' || dateRange === 'last_pay_period'
        ? previousLabelShort
        : getDateFilterLabel(dateRange, { payPeriodType: hasCustomPayPeriod ? 'custom' : 'week' }, true);

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
                {(opt.value === 'pay_period' || opt.value === 'last_pay_period') && dateRange === opt.value && computedRangeLabel && (
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
  onClearFlags: () => void;
  onDeselectAll: () => void;
  hasFlagsInSelection: boolean;
}

function BatchActionBar({ selectedCount, onMarkPaid, onClearFlags, onDeselectAll, hasFlagsInSelection }: BatchBarProps) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-primary/8 border-b border-primary/15 animate-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-1.5">
        <CheckSquare className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-bold text-foreground tabular-nums">{selectedCount} selected</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={onMarkPaid}>
          <CircleDot className="h-3 w-3" />
          Mark Paid
        </Button>

        {hasFlagsInSelection && (
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={onClearFlags}>
            <Flag className="h-3 w-3" />
            Clear Flags
          </Button>
        )}

        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={onDeselectAll}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function HoursBreakdown({ cpHours, wHours, iHours, compact = false }: { cpHours?: number; wHours?: number; iHours?: number; compact?: boolean }) {
  const parts = [
    cpHours ? <span key="cp" className="text-[hsl(var(--status-customer-pay))] font-medium">CP {cpHours.toFixed(1)}</span> : null,
    wHours ? <span key="w" className="text-[hsl(var(--status-warranty))] font-medium">W {wHours.toFixed(1)}</span> : null,
    iHours ? <span key="i" className="text-[hsl(var(--status-internal))] font-medium">I {iHours.toFixed(1)}</span> : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <span className={cn('whitespace-nowrap', compact ? 'text-[9px]' : 'text-[10px]')}>
      {parts.map((el, idx) => <span key={idx}>{idx > 0 && <span className="text-border mx-0.5">·</span>}{el}</span>)}
    </span>
  );
}

/* ─── Component ─── */
export function SpreadsheetView({ ros, onSelectRO, rangeLabel, isCloseout }: SpreadsheetViewProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { userSettings, updateUserSetting, getFlagsForRO, clearFlagsBulk } = useFlagContext();
  const { isPro } = useSubscription();
  const isMobile = useIsMobile();
  const hideTotals = userSettings.hideTotals ?? false;

  const persistedViewMode = (userSettings.spreadsheetViewMode as ViewMode) || 'payroll';
  const persistedDensity = (userSettings.spreadsheetDensity as Density) || 'compact';
  const persistedGroupBy = (userSettings.spreadsheetGroupBy as GroupBy) || 'date';

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
  const periodLabels = getPeriodFilterLabels(userSettings);

  /* ─── Shared date range state ─── */
  const { filters: sharedFilters } = useSharedROFilters();
  const {
    dateFilter: dateRange,
    setFilter: setDateRange,
    customStart,
    customEnd,
    applyCustom,
    cancelCustom,
    showCustomDialog,
    requestCustomDialog,
  } = useSharedDateRange('week', isMobile ? 'spreadsheet-mobile' : 'spreadsheet-desktop', userSettings);

  useEffect(() => { setViewMode(persistedViewMode); }, [persistedViewMode]);
  useEffect(() => { setDensity(persistedDensity); }, [persistedDensity]);
  useEffect(() => { setGroupBy(persistedGroupBy); }, [persistedGroupBy]);
  useEffect(() => {
    setActiveColIds(viewMode === 'payroll' ? DISPLAY_COLUMNS : AUDIT_DISPLAY_COLUMNS);
  }, [viewMode]);

  const handleViewModeChange = (m: ViewMode) => {
    setViewMode(m);
    updateUserSetting('spreadsheetViewMode', m);
  };
  const handleGroupByChange = (g: GroupBy) => {
    setGroupBy(g);
    updateUserSetting('spreadsheetGroupBy', g);
  };
  const handleDensityChange = () => {
    const next: Density = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
    updateUserSetting('spreadsheetDensity', next);
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
  const { filteredROs, computedRangeLabel, viewStart, viewEnd } = useMemo(() => {
    if (isCloseout) {
      return {
        filteredROs: applySharedROFilters(ros, sharedFilters),
        computedRangeLabel: rangeLabel || 'All ROs',
        viewStart: undefined as string | undefined,
        viewEnd: undefined as string | undefined,
      };
    }

    const bounds = computeDateRangeBounds({
      filter: dateRange,
      weekStartDay: userSettings.weekStartDay ?? 0,
      payPeriodType: userSettings.payPeriodType,
      payPeriodEndDates: (userSettings.payPeriodEndDates || []) as number[],
      hasCustomPayPeriod,
      customStart,
      customEnd,
    });

    if (!bounds) {
      return {
        filteredROs: applySharedROFilters(ros, sharedFilters),
        computedRangeLabel: rangeLabel || 'All ROs',
        viewStart: undefined as string | undefined,
        viewEnd: undefined as string | undefined,
      };
    }

    return {
      filteredROs: filterROsByDateRangeWithCarryover(applySharedROFilters(ros, sharedFilters), bounds),
      computedRangeLabel: bounds.label,
      viewStart: bounds.start,
      viewEnd: bounds.end,
    };
  }, [ros, sharedFilters, dateRange, isCloseout, rangeLabel, userSettings.payPeriodType, userSettings.payPeriodEndDates, userSettings.weekStartDay, hasCustomPayPeriod, customStart, customEnd]);

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
  const allRows = useMemo(
    () => buildSpreadsheetRows({ ros: filteredROs, periodLabel: computedRangeLabel, groupBy, viewStart }),
    [filteredROs, computedRangeLabel, groupBy, viewStart],
  );

  /* ─── Compute totals from the period subtotal row ─── */
  const periodRow = allRows.find(r => r.rowType === 'periodSubtotal') as SpreadsheetSubtotalRow | undefined;
  const totalHours = periodRow?.hours ?? 0;
  const warrantyHours = periodRow?.wHours ?? 0;
  const cpHours = periodRow?.cpHours ?? 0;
  const internalHours = periodRow?.iHours ?? 0;
  // Only count paid line rows toward the lines total; open/unpaid rows are secondary.
  const totalLines = allRows.filter(r => r.rowType === 'line' && !(r as SpreadsheetLineRow).isCarryover).length;
  const paidROCount = filteredROs.filter(ro => hasPaidDate(ro)).length;
  const openROCount = filteredROs.filter(ro => !hasPaidDate(ro)).length;

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

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredROs.map(ro => ro.id));
    setSelectedROIds(allIds);
    setSelectionMode(true);
  }, [filteredROs]);

  /* ─── Cell value renderer ─── */
  const renderCellValue = useCallback((colId: ColumnId, row: SpreadsheetLineRow): ReactNode => {
    switch (colId) {
      case 'roNumber':
        return (
          <span className={cn('font-bold text-foreground tabular-nums', row.lineNo > 1 && 'opacity-70')}>
            {row.lineNo === 1 ? `#${row.roNumber}` : '↳'}
          </span>
        );
      case 'date': {
        const [y, m, d] = row.date.split('-').map(Number);
        const dateLabel = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isPaidDateRow = row.ro ? dateDisplayContext(row.ro).primaryLabel === 'Paid' : !!(row.ro && hasPaidDate(row.ro));
        return (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span>{dateLabel}</span>
            <span className={cn('text-[9px] font-semibold uppercase tracking-wide', isPaidDateRow ? 'text-emerald-600/90' : 'text-muted-foreground/70')}>
              {isPaidDateRow ? 'Paid' : 'RO'}
            </span>
          </span>
        );
      }
      case 'advisor': return <span className="text-foreground/80">{row.advisor || '—'}</span>;
      case 'customer': return <span className="text-foreground/80">{row.customer || '—'}</span>;
      case 'vehicle': return row.vehicle || <span className="text-muted-foreground/50">—</span>;
      case 'status': {
        const isPaid = !!(row.ro && hasPaidDate(row.ro));
        return (
          <span className={cn(
            'inline-block text-[9px] font-bold px-1.5 py-px rounded uppercase tracking-wider',
            isPaid
              ? 'bg-[hsl(var(--status-warranty))]/15 text-[hsl(var(--status-warranty))]'
              : 'bg-[hsl(var(--status-internal))]/15 text-[hsl(var(--status-internal))]',
          )}>
            {isPaid ? 'PAID' : 'OPEN'}
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
      case 'lineNo': return <span className="text-muted-foreground tabular-nums">{row.lineNo}</span>;
      case 'description': {
        return (
          <button
            className="text-left truncate max-w-full hover:text-primary transition-colors text-foreground/90"
            onClick={(e) => {
              e.stopPropagation();
              setTextModal({ open: true, lineNo: row.lineNo, description: row.description || '' });
            }}
            title="Click to view full text"
          >
            {row.description || <span className="text-muted-foreground/50 italic">—</span>}
          </button>
        );
      }
      case 'hours': {
        return (
          <span className="inline-block tabular-nums font-bold text-foreground">
            {row.hours.toFixed(1)}
          </span>
        );
      }
      case 'type': {
        const bgClass = row.laborType === 'warranty'
          ? 'bg-[hsl(var(--status-warranty))]/15 text-[hsl(var(--status-warranty))]'
          : row.laborType === 'customer-pay'
            ? 'bg-[hsl(var(--status-customer-pay))]/15 text-[hsl(var(--status-customer-pay))]'
            : 'bg-[hsl(var(--status-internal))]/15 text-[hsl(var(--status-internal))]';
        return (
          <span className={cn('inline-block text-[9px] font-bold px-1.5 py-px rounded uppercase tracking-wider', bgClass)}>
            {row.type}
          </span>
        );
      }
      case 'notes':
        return <span className="text-xs text-muted-foreground truncate">{row.notes || ''}</span>;
      case 'mileage':
        return <span className="text-xs tabular-nums text-muted-foreground">{row.mileage || ''}</span>;
      case 'vin':
        return <span className="text-[10px] font-mono text-muted-foreground/70">{row.vin || ''}</span>;
      default: return '';
    }
  }, [roFlagCounts]);

  /* ─── Export helpers ─── */

  // Main export only includes paid payroll rows plus subtotal rows.
  const payrollExportRows = useMemo(() => (
    allRows.filter(r =>
      r.rowType === 'sectionDivider' ? false
      : r.rowType === 'line' ? !(r as SpreadsheetLineRow).isCarryover
      : r.rowType === 'roSubtotal' ? !(r as SpreadsheetSubtotalRow).isCarryover
      : true,
    )
  ), [allRows]);

  const handleExportPDF = useCallback(async () => {
    try {
      const { exportPDFFromRows } = await import('@/lib/pdfExport');
      exportPDFFromRows(
        payrollExportRows,
        `${format(new Date(), 'yyyy-MM-dd')}-payroll.pdf`,
        `Payroll Report${rangeLabel ? ' — ' + rangeLabel : ''}`,
        {
          startDate: viewStart || filteredROs[0]?.paidDate || filteredROs[0]?.date || format(new Date(), 'yyyy-MM-dd'),
          endDate: viewEnd || filteredROs[0]?.paidDate || filteredROs[0]?.date || format(new Date(), 'yyyy-MM-dd'),
          spiffRules: userSettings.spiffRules || [],
          spiffManualEntries: userSettings.spiffManualEntries || [],
          rosInRange: filteredROs.filter(hasPaidDate),
        },
      );
      toast.success('Payroll PDF downloaded');
    } catch {
      toast.error('PDF export failed');
    }
  }, [filteredROs, payrollExportRows, rangeLabel, userSettings.spiffManualEntries, userSettings.spiffRules, viewEnd, viewStart]);

  /* ─── Density classes ─── */
  const cellPy = density === 'compact' ? 'py-[5px]' : 'py-2';
  const cellPx = 'px-2';
  const textSize = density === 'compact' ? 'text-xs' : 'text-[13px]';

  /* ─── Helpers ─── */
  const getRowBg = (groupIndex: number) =>
    groupIndex % 2 === 1
      ? 'bg-primary/[0.12]'
      : 'bg-white dark:bg-card shadow-[inset_0_0_0_1px_hsl(var(--border)/0.32)]';
  const getTone = (groupIndex: number) => (groupIndex % 2 === 1 ? 'alt' : 'base');

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
              currentLabel={periodLabels.current}
              previousLabel={periodLabels.previous}
              currentLabelShort={periodLabels.currentShort}
              previousLabelShort={periodLabels.previousShort}
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
    <div className="h-full flex flex-col brand-shell-bg">
      <PrintHeader periodLabel={computedRangeLabel} />
      {/* ─── Toolbar ─── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/50 bg-gradient-to-r from-card via-accent/35 to-card backdrop-blur-sm flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {!isCloseout && (
            <DateFilterBar
              dateRange={dateRange}
              computedRangeLabel={computedRangeLabel}
              hasCustomPayPeriod={hasCustomPayPeriod}
              currentLabel={periodLabels.current}
              previousLabel={periodLabels.previous}
              currentLabelShort={periodLabels.currentShort}
              previousLabelShort={periodLabels.previousShort}
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
          {!isMobile && (
            <div className="mr-1 hidden lg:flex items-center gap-2 px-2 py-1 rounded-md border border-border/70 bg-muted/25 text-[10px] font-semibold tabular-nums">
              <span className="text-muted-foreground">Rows</span>
              <span className="text-foreground">{allRows.length}</span>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">ROs</span>
              <span className="text-foreground">{filteredROs.length}</span>
            </div>
          )}
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
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportPDF}>
                  <FileText className="h-3.5 w-3.5" />
                  Export PDF
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
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileText className="h-3.5 w-3.5 mr-2" /> Export PDF
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
          onClearFlags={handleBatchClearFlags}
          onDeselectAll={deselectAll}
          hasFlagsInSelection={hasFlagsInSelection}
        />
      )}

      {/* ─── Mobile card list ─── */}
      {isMobile ? (
        <div className="flex-1 overflow-auto">
          {visibleRows.map((row, i) => {
            const prevRow = i > 0 ? visibleRows[i - 1] : null;
            if (row.rowType === 'sectionDivider') {
              const div = row as SpreadsheetSectionDividerRow;
              return (
                <div key={`divider-${i}`} className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-y border-dashed border-border/50 mt-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{div.label}</span>
                  <span className="flex-1 h-px bg-border/40" />
                  <span className="text-[9px] text-muted-foreground/40 italic">not counted in totals</span>
                </div>
              );
            }
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
              const tone = getTone(sub.groupIndex);
              if (sub.isCarryover) {
                return (
                  <div
                    key={`rosub-${i}`}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 border-x border-b border-dashed rounded-b-lg mb-3 opacity-75',
                      tone === 'alt'
                        ? 'bg-primary/[0.09] border-primary/25'
                        : 'bg-white/95 border-border/45 dark:bg-card/80',
                    )}
                  >
                    <span className="text-[10px] italic text-muted-foreground/70">{sub.label}</span>
                    <span className="text-[10px] tabular-nums text-muted-foreground/60">{sub.hours.toFixed(1)}h unpaid</span>
                  </div>
                );
              }
              return (
                <div
                  key={`rosub-${i}`}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 border-x border-b border-t rounded-b-lg mb-3 shadow-[0_2px_8px_-6px_hsl(var(--foreground)/0.32)]',
                    tone === 'alt'
                      ? 'bg-primary/[0.12] border-primary/30'
                      : 'bg-white border-border/55 dark:bg-card',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">Total</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{sub.label}</span>
                    {sub.lineCount != null && (
                      <span className="text-[10px] text-muted-foreground/80">• {sub.lineCount} lines paid</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(sub.cpHours! > 0 || sub.wHours! > 0 || sub.iHours! > 0) && (
                      <span className="text-[10px] text-muted-foreground/85">
                        {[
                          sub.cpHours ? `CP ${sub.cpHours.toFixed(1)}` : '',
                          sub.wHours ? `W ${sub.wHours.toFixed(1)}` : '',
                          sub.iHours ? `I ${sub.iHours.toFixed(1)}` : '',
                        ].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <span className="text-[15px] font-bold tabular-nums text-primary">{maskHours(sub.hours, hideTotals)}h</span>
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
            const isGroupStart = !prevRow || prevRow.rowType !== 'line' || (prevRow as SpreadsheetLineRow).groupIndex !== line.groupIndex;
            const rowTone = getTone(line.groupIndex);
            return (
              <MobileLineCard
                key={`line-${i}`}
                line={line}
                onSelectRO={onSelectRO}
                isSelected={selectedROIds.has(roId)}
                showCheckbox={showCheckbox}
                onToggleSelect={toggleSelect}
                flagCount={roFlagCounts.get(roId) ?? 0}
                rowTone={rowTone}
                showGroupHeader={isGroupStart}
                isGroupStart={isGroupStart}
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
        <div className="flex-1 overflow-auto p-2 pt-1" ref={tableRef}>
          <table className={cn('min-w-[1080px] w-full border-collapse rounded-lg overflow-hidden border border-border/55 bg-card shadow-[var(--shadow-card)]', textSize)} style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {showCheckbox && <col style={{ width: 32 }} />}
              {activeCols.map(col => (
                <col key={col.id} style={{ width: col.id === 'description' ? undefined : col.minWidth, minWidth: col.minWidth }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr className="bg-muted/95 backdrop-blur-sm border-b border-border shadow-[0_1px_3px_-1px_hsl(var(--foreground)/0.1)]">
                {showCheckbox && (
                  <th className="px-1.5 py-1.5 text-center bg-muted/95 sticky left-0 z-[3] shadow-[2px_0_0_hsl(var(--border)/0.2)]">
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
                      cellPx, 'py-1.5',
                      'font-semibold text-[10px] uppercase tracking-widest text-muted-foreground/80 whitespace-nowrap bg-muted/95 overflow-hidden select-none',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.id === 'roNumber' && cn('sticky z-[2]', showCheckbox ? 'left-8' : 'left-0', 'shadow-[2px_0_0_hsl(var(--border)/0.2)]'),
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => {
                if (row.rowType === 'sectionDivider') {
                  const div = row as SpreadsheetSectionDividerRow;
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  return (
                    <tr key={`divider-${i}`} className="bg-muted/20">
                      <td colSpan={colCount} className={cn(cellPx, 'py-2')}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{div.label}</span>
                          <span className="flex-1 h-px bg-border/40" />
                          <span className="text-[9px] text-muted-foreground/40 italic">visible but not counted in totals or exports</span>
                        </div>
                      </td>
                    </tr>
                  );
                }
                if (row.rowType === 'roSubtotal') {
                  const sub = row as SpreadsheetSubtotalRow;
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  const hrsIdx = activeCols.findIndex(c => c.id === 'hours') + (showCheckbox ? 1 : 0);
                  const typeIdx = activeCols.findIndex(c => c.id === 'type') + (showCheckbox ? 1 : 0);
                  const spanCols = hrsIdx > 0 ? hrsIdx : colCount - 1;
                  const afterCols = colCount - spanCols - 1 - (typeIdx > hrsIdx ? 1 : 0);

                  if (sub.isCarryover) {
                    return (
                      <tr key={`rosub-${i}`} className="bg-muted/10 border-b border-dashed border-border/30 opacity-60">
                        <td colSpan={spanCols} className={cn(cellPx, 'py-[3px]', 'italic font-medium text-muted-foreground/70 text-[10px] text-right tracking-wide')}>
                          {sub.label}
                          <span className="ml-1.5 text-[8px] font-semibold border border-dashed border-muted-foreground/30 rounded px-1 py-px normal-case tracking-normal not-italic">unpaid</span>
                        </td>
                        <td className={cn(cellPx, 'py-[3px]', 'text-right tabular-nums font-medium text-muted-foreground/50 text-xs')}>
                          {sub.hours.toFixed(1)}h
                        </td>
                        {typeIdx > hrsIdx && <td className={cn(cellPx, 'py-[3px]')} />}
                        {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, 'py-[3px]')} />}
                      </tr>
                    );
                  }

                  return (
                    <tr key={`rosub-${i}`} className="bg-accent/25 border-y border-border/50 shadow-[inset_0_1px_0_hsl(var(--background)/0.7)]">
                      <td colSpan={spanCols} className={cn(cellPx, 'py-[3px]', 'font-semibold text-muted-foreground text-[10px] text-right tracking-wide')}>
                        <span>{sub.label}</span>
                        {sub.lineCount != null && (
                          <span className="ml-2 text-[9px] font-medium text-muted-foreground/80 normal-case tracking-normal">
                            {sub.lineCount} lines paid
                          </span>
                        )}
                      </td>
                      <td className={cn(cellPx, 'py-[3px]', 'text-right tabular-nums font-bold text-primary text-xs')}>
                        {maskHours(sub.hours, hideTotals)}h
                      </td>
                      {typeIdx > hrsIdx && <td className={cn(cellPx, 'py-[3px]', 'text-[9px] text-muted-foreground/70 whitespace-nowrap')}><HoursBreakdown cpHours={sub.cpHours} wHours={sub.wHours} iHours={sub.iHours} compact /></td>}
                      {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, 'py-[3px]')} />}
                    </tr>
                  );
                }

                if (row.rowType === 'daySubtotal') {
                  const sub = row as SpreadsheetSubtotalRow;
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  const hrsIdx = activeCols.findIndex(c => c.id === 'hours') + (showCheckbox ? 1 : 0);
                  const typeIdx = activeCols.findIndex(c => c.id === 'type') + (showCheckbox ? 1 : 0);
                  const spanCols = hrsIdx > 0 ? hrsIdx : colCount - 1;
                  const afterCols = colCount - spanCols - 1 - (typeIdx > hrsIdx ? 1 : 0);

                  return (
                    <tr key={`daysub-${i}`} className="border-y border-border/60 bg-secondary/70">
                      <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-foreground text-[11px] uppercase tracking-wide text-right')}>
                        {sub.label}
                      </td>
                      <td className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-foreground text-sm')}>
                        {maskHours(sub.hours, hideTotals)}h
                      </td>
                      {typeIdx > hrsIdx && <td className={cn(cellPx, cellPy)}><HoursBreakdown cpHours={sub.cpHours} wHours={sub.wHours} iHours={sub.iHours} /></td>}
                      {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, cellPy)} />}
                    </tr>
                  );
                }

                if (row.rowType === 'advisorSubtotal') {
                  const sub = row as SpreadsheetSubtotalRow;
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  const hrsIdx = activeCols.findIndex(c => c.id === 'hours') + (showCheckbox ? 1 : 0);
                  const typeIdx = activeCols.findIndex(c => c.id === 'type') + (showCheckbox ? 1 : 0);
                  const spanCols = hrsIdx > 0 ? hrsIdx : colCount - 1;
                  const afterCols = colCount - spanCols - 1 - (typeIdx > hrsIdx ? 1 : 0);

                  return (
                    <tr key={`advsub-${i}`} className="border-y border-border/60 bg-secondary/70">
                      <td colSpan={spanCols} className={cn(cellPx, cellPy, 'font-bold text-foreground text-[11px] uppercase tracking-wide text-right')}>
                        {sub.label}
                      </td>
                      <td className={cn(cellPx, cellPy, 'text-right tabular-nums font-bold text-foreground text-sm')}>
                        {maskHours(sub.hours, hideTotals)}h
                      </td>
                      {typeIdx > hrsIdx && <td className={cn(cellPx, cellPy)}><HoursBreakdown cpHours={sub.cpHours} wHours={sub.wHours} iHours={sub.iHours} /></td>}
                      {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, cellPy)} />}
                    </tr>
                  );
                }

                if (row.rowType === 'periodSubtotal') {
                  const sub = row as SpreadsheetSubtotalRow;
                  const colCount = activeCols.length + (showCheckbox ? 1 : 0);
                  const hrsIdx = activeCols.findIndex(c => c.id === 'hours') + (showCheckbox ? 1 : 0);
                  const typeIdx = activeCols.findIndex(c => c.id === 'type') + (showCheckbox ? 1 : 0);
                  const spanCols = hrsIdx > 0 ? hrsIdx : colCount - 1;
                  const afterCols = colCount - spanCols - 1 - (typeIdx > hrsIdx ? 1 : 0);

                  return (
                    <tr key={`period-${i}`} className="border-t-2 border-border bg-primary/8 sticky bottom-0 z-10">
                      <td colSpan={spanCols} className={cn(cellPx, 'py-2', 'font-bold text-foreground uppercase text-xs tracking-wide text-right')}>
                        {sub.label}
                      </td>
                      <td className={cn(cellPx, 'py-2', 'text-right tabular-nums font-bold text-foreground text-base')}>
                        {maskHours(sub.hours, hideTotals)}h
                      </td>
                      {typeIdx > hrsIdx && <td className={cn(cellPx, 'py-2')}><HoursBreakdown cpHours={sub.cpHours} wHours={sub.wHours} iHours={sub.iHours} /></td>}
                      {afterCols > 0 && <td colSpan={afterCols} className={cn(cellPx, 'py-2')} />}
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
      <div className="flex-shrink-0 border-t border-border/40 bg-background/60 px-3 py-1 flex items-center justify-between gap-2">
        <div className="flex gap-3 text-muted-foreground text-[11px] tabular-nums">
          <span><strong className="text-foreground font-semibold">{paidROCount}</strong> paid</span>
          {openROCount > 0 && <span><strong className="text-muted-foreground/60 font-semibold">{openROCount}</strong> <span className="text-muted-foreground/50">open</span></span>}
          <span><strong className="text-foreground font-semibold">{totalLines}</strong> lines</span>
        </div>
        <div className="flex items-center gap-2 tabular-nums text-[11px]">
          <span className="text-[hsl(var(--status-warranty))] font-semibold">W {maskHours(warrantyHours, hideTotals)}</span>
          <span className="text-border">·</span>
          <span className="text-[hsl(var(--status-customer-pay))] font-semibold">CP {maskHours(cpHours, hideTotals)}</span>
          <span className="text-border">·</span>
          <span className="text-[hsl(var(--status-internal))] font-semibold">I {maskHours(internalHours, hideTotals)}</span>
          <span className="border-l border-border pl-2 ml-1 font-bold text-foreground text-sm">{maskHours(totalHours, hideTotals)}h</span>
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
