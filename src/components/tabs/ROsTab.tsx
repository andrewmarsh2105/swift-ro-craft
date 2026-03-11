import { useState, useMemo, useCallback, useEffect, useDeferredValue, memo, lazy, Suspense } from 'react';
import { Search, SlidersHorizontal, Filter, Table2, LayoutList, ClipboardList, Loader2, Clock, Flag, AlertTriangle, CalendarRange } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { computeDateRangeBounds, filterROsByDateRange, boundsRangeLabel, type DateFilterKey } from '@/lib/dateRangeFilter';
import { useSharedDateRange } from '@/hooks/useSharedDateRange';
import { CustomDateRangeDialog } from '@/components/shared/CustomDateRangeDialog';
import { maskHours } from '@/lib/maskHours';
import { StatusPill } from '@/components/mobile/StatusPill';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { Chip } from '@/components/mobile/Chip';
import { RODetailSheet } from '@/components/sheets/RODetailSheet';
import { ROActionMenu } from '@/components/shared/ROActionMenu';
import { FlagInbox } from '@/components/flags/FlagInbox';
import { AddFlagDialog } from '@/components/flags/AddFlagDialog';
import { EmptyState } from '@/components/states/EmptyState';
import { toast } from 'sonner';
import type { LaborType, RepairOrder } from '@/types/ro';
import type { FlagType } from '@/types/flags';
import type { ReviewIssue } from '@/lib/reviewRules';
import { getReviewIssues } from '@/lib/reviewRules';
import { cn } from '@/lib/utils';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { effectiveDate, formatDateShort, calcHours, vehicleLabel } from '@/lib/roDisplay';
import { getStatusSummary } from '@/lib/roStatus';

const SpreadsheetView = lazy(() =>
  import('@/components/shared/SpreadsheetView').then((m) => ({ default: m.SpreadsheetView })),
);

/* ── StatusChips ─────────────────────────────────── */

function MobileStatusChips({ ro, flagsCount, checksCount }: { ro: RepairOrder; flagsCount: number; checksCount: number }) {
  const status = getStatusSummary(ro, flagsCount, checksCount);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Badge
        variant={status.paid === "Paid" ? "outline" : "secondary"}
        className={cn(
          "text-[10px] px-1.5 py-0",
          status.paid === "Paid"
            ? "border-[hsl(var(--status-warranty))]/30 text-[hsl(var(--status-warranty))]"
            : "text-muted-foreground",
        )}
      >
        {status.paid}
      </Badge>
      {status.tbd > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {status.tbd}
        </Badge>
      )}
      {status.flags > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 text-[hsl(var(--status-internal))]">
          <Flag className="h-2.5 w-2.5" />
          {status.flags}
        </Badge>
      )}
      {status.checks > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 text-[hsl(var(--destructive))]">
          <AlertTriangle className="h-2.5 w-2.5" />
          {status.checks}
        </Badge>
      )}
    </div>
  );
}

/* ── ROCard ─────────────────────────────────────── */

interface ROCardProps {
  ro: RepairOrder;
  onEdit: () => void;
  onDuplicate: (newRONumber: string) => void;
  onDelete: () => void;
  onFlag: () => void;
  onViewDetails: () => void;
  flags: import('@/types/flags').ROFlag[];
  onClearFlag: (flagId: string) => void;
  reviewIssues: ReviewIssue[];
  onConvertToFlag: (issue: ReviewIssue, flagType: FlagType, note?: string) => void;
  existingRONumbers: string[];
  hideTotals: boolean;
}

const ROCard = memo(function ROCard({
  ro, onEdit, onDuplicate, onDelete, onFlag, onViewDetails,
  flags, onClearFlag, reviewIssues, onConvertToFlag, existingRONumbers, hideTotals,
}: ROCardProps) {
  const roEffectiveDate = effectiveDate(ro);
  const hours = calcHours(ro);

  const laborTypeColor =
    ro.laborType === 'warranty'
      ? 'hsl(var(--status-warranty))'
      : ro.laborType === 'customer-pay'
        ? 'hsl(var(--status-customer-pay))'
        : 'hsl(var(--status-internal))';

  return (
    <div
      className="card-mobile px-4 py-3 group row-hover quiet-transition border-l-[3px]"
      style={{ borderLeftColor: laborTypeColor }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetails}>
          {/* Row 1: RO# · hours · status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold tabular-nums flex-shrink-0 text-foreground">#{ro.roNumber || '—'}</span>
            <span className="hours-pill flex-shrink-0">{maskHours(hours, hideTotals)}h</span>
            <span className="meta-text tabular-nums flex-shrink-0">{formatDateShort(roEffectiveDate)}</span>
            <div className="flex-shrink-0">
              <MobileStatusChips ro={ro} flagsCount={flags.length} checksCount={reviewIssues.length} />
            </div>
          </div>

          {/* Row 2: labor type · advisor · vehicle · work summary */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <StatusPill type={ro.laborType} size="sm" />
            <p className="meta-text truncate">
              {ro.advisor}
              {vehicleLabel(ro) !== "—" && <> · {vehicleLabel(ro)}</>}
              {' — '}
              <span className="text-muted-foreground/65">
                {ro.lines?.length
                  ? ro.lines.map((l) => l.description).filter(Boolean).slice(0, 3).join(", ")
                  : ro.workPerformed || "—"}
              </span>
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="flex-shrink-0 pt-0.5">
          <ROActionMenu
            roNumber={ro.roNumber}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onFlag={onFlag}
            existingRONumbers={existingRONumbers}
          />
        </div>
      </div>
    </div>
  );
});

/* ── Filter types ───────────────────────────────── */

interface FilterState {
  advisors: string[];
  laborTypes: LaborType[];
  sortBy: 'date' | 'hours' | 'ro' | 'advisor' | 'customer' | 'laborType';
}

interface ROsTabProps {
  onEditRO: (ro: RepairOrder) => void;
  onViewModeChange?: (mode: 'cards' | 'spreadsheet') => void;
}

/* ── Main Tab ───────────────────────────────────── */

export function ROsTab({ onEditRO, onViewModeChange }: ROsTabProps) {
  const { ros, deleteRO, duplicateRO, loadingROs } = useRO();
  const { isPro } = useSubscription();
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();

  const hasCustomPayPeriod =
    userSettings.payPeriodType === 'custom' &&
    Array.isArray(userSettings.payPeriodEndDates) &&
    userSettings.payPeriodEndDates.length > 0;

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);
  const [viewMode, setViewMode] = useLocalStorageState<'cards' | 'spreadsheet'>('ui.mobile.roTab.viewMode.v1', 'cards');
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    onViewModeChange?.(viewMode);
  }, [viewMode, onViewModeChange]);

  const [filters, setFilters] = useLocalStorageState<FilterState>('ui.mobile.roTab.filters.v2', {
    advisors: [],
    laborTypes: [],
    sortBy: 'date',
  });

  const { dateFilter, setFilter: setDateRange, customStart, customEnd, applyCustom, cancelCustom, showCustomDialog, requestCustomDialog } =
    useSharedDateRange('week', 'mobile-ro-tab');

  const rangeBounds = useMemo(() => computeDateRangeBounds({
    filter: dateFilter,
    weekStartDay: userSettings.weekStartDay ?? 0,
    defaultSummaryRange: userSettings.defaultSummaryRange,
    payPeriodEndDates: (userSettings.payPeriodEndDates || []) as number[],
    hasCustomPayPeriod,
    customStart,
    customEnd,
  }), [dateFilter, userSettings.weekStartDay, userSettings.defaultSummaryRange, userSettings.payPeriodEndDates, hasCustomPayPeriod, customStart, customEnd]);

  const rangeChipLabel = useMemo(() => boundsRangeLabel(rangeBounds), [rangeBounds]);

  const uniqueAdvisors = useMemo(() => [...new Set(ros.map(r => r.advisor))].sort(), [ros]);

  const filteredROs = useMemo(() => {
    let result = ros;

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(ro => {
        const vehicleStr = [ro.vehicle?.year?.toString(), ro.vehicle?.make, ro.vehicle?.model].filter(Boolean).join(' ').toLowerCase();
        return (
          ro.roNumber.toLowerCase().includes(q) ||
          ro.advisor.toLowerCase().includes(q) ||
          (ro.workPerformed || '').toLowerCase().includes(q) ||
          (ro.customerName || '').toLowerCase().includes(q) ||
          vehicleStr.includes(q)
        );
      });
    }

    if (filters.advisors.length > 0) {
      result = result.filter(ro => filters.advisors.includes(ro.advisor));
    }

    if (filters.laborTypes.length > 0) {
      result = result.filter(ro => filters.laborTypes.includes(ro.laborType));
    }

    result = filterROsByDateRange(result, rangeBounds);

    const sorted = [...result].sort((a, b) => {
      if (filters.sortBy === 'date') return (b.paidDate || b.date).localeCompare(a.paidDate || a.date);
      if (filters.sortBy === 'hours') return calcHours(b) - calcHours(a);
      if (filters.sortBy === 'ro') return a.roNumber.localeCompare(b.roNumber);
      if (filters.sortBy === 'advisor') return a.advisor.localeCompare(b.advisor);
      if (filters.sortBy === 'customer') return (a.customerName || '').localeCompare(b.customerName || '');
      if (filters.sortBy === 'laborType') return a.laborType.localeCompare(b.laborType);
      return 0;
    });

    return sorted;
  }, [ros, deferredSearch, filters, hasCustomPayPeriod, userSettings, rangeBounds]);

  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, filters, dateFilter]);

  const visibleROs = useMemo(() => filteredROs.slice(0, visibleCount), [filteredROs, visibleCount]);
  const hasMore = visibleCount < filteredROs.length;

  const totalHours = useMemo(() => filteredROs.reduce((s, ro) => s + calcHours(ro), 0), [filteredROs]);

  const handleConvertToFlag = useCallback((issue: ReviewIssue, flagType: FlagType, note?: string) => {
    addFlag(issue.roId, flagType, note || issue.detail, issue.lineId);
  }, [addFlag]);

  const activeFiltersCount =
    filters.advisors.length +
    filters.laborTypes.length +
    (dateFilter !== 'all' ? 1 : 0) +
    (filters.sortBy !== 'date' ? 1 : 0);

  const toggleAdvisorFilter = (advisor: string) => {
    setFilters(prev => ({
      ...prev,
      advisors: prev.advisors.includes(advisor) ? prev.advisors.filter(a => a !== advisor) : [...prev.advisors, advisor],
    }));
  };

  const toggleLaborTypeFilter = (type: LaborType) => {
    setFilters(prev => ({
      ...prev,
      laborTypes: prev.laborTypes.includes(type) ? prev.laborTypes.filter(t => t !== type) : [...prev.laborTypes, type],
    }));
  };

  const clearFilters = () => {
    setFilters({ advisors: [], laborTypes: [], sortBy: 'date' });
    setDateRange('all');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="min-w-0">
            <h2 className="page-title">Repair Orders</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-2xl font-bold tabular-nums text-primary leading-none">
                {maskHours(totalHours, userSettings.hideTotals ?? false)}h
              </span>
              <span className="text-sm text-muted-foreground tabular-nums font-medium leading-none">
                {filteredROs.length} ROs
              </span>
              <Badge
                variant="outline"
                className={cn("gap-1 text-xs py-0.5 px-2 font-medium", dateFilter === "custom" && "cursor-pointer hover:bg-muted")}
                onClick={() => { if (dateFilter === "custom") requestCustomDialog(); }}
              >
                <CalendarRange className="h-3 w-3" />
                {rangeChipLabel}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <FlagInbox />
            {isPro && (
              <button
                onClick={() => setViewMode(v => v === 'cards' ? 'spreadsheet' : 'cards')}
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-full quiet-transition',
                  viewMode === 'spreadsheet' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {viewMode === 'spreadsheet' ? <LayoutList className="icon-toolbar" /> : <Table2 className="icon-toolbar" />}
              </button>
            )}
            <button
              onClick={() => setShowFilters(true)}
              className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted relative quiet-transition"
            >
              <SlidersHorizontal className="icon-toolbar" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 icon-toolbar text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search RO #, advisor, vehicle, work..."
              className="w-full h-9 pl-8 pr-3 rounded-full border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {([
            { value: 'all', label: 'All' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: userSettings.defaultSummaryRange === 'two_weeks' ? '2 Wk' : 'Week' },
            { value: 'month', label: 'Month' },
            ...(hasCustomPayPeriod ? [{ value: 'pay_period' as const, label: 'Pay Period' }] : []),
            { value: 'custom' as const, label: 'Custom' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => value === 'custom' ? requestCustomDialog() : setDateRange(value as DateFilterKey)}
              className={cn(
                'h-8 px-3 text-xs font-medium rounded-full border quiet-transition',
                dateFilter === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List content */}
      {viewMode === 'spreadsheet' ? (
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
            <SpreadsheetView
              ros={filteredROs}
              rangeLabel={rangeChipLabel}
              onSelectRO={ro => { setSelectedRO(ro); setShowDetail(true); }}
            />
          </Suspense>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-32">
          {loadingROs ? (
            <div className="px-4 py-3 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-mobile px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex gap-2">
                        <Skeleton className="h-3.5 w-14" />
                        <Skeleton className="h-3.5 w-20" />
                      </div>
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-5 w-10 rounded-md" />
                    <Skeleton className="h-5 w-12 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredROs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              variant={ros.length === 0 ? 'welcome' : 'filtered'}
              title={ros.length === 0 ? 'No repair orders yet' : 'No repair orders found'}
              description={
                ros.length === 0
                  ? 'Tap the Quick Add button below to log your first RO.'
                  : 'Try adjusting your search or filters.'
              }
              actions={
                activeFiltersCount > 0 ? (
                  <button
                    onClick={clearFilters}
                    className="h-9 px-4 text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/15 transition-colors"
                  >
                    Clear all filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="px-4 py-2 space-y-1.5">
              {visibleROs.map(ro => (
                <ROCard
                  key={ro.id}
                  ro={ro}
                  flags={getFlagsForRO(ro.id)}
                  onClearFlag={clearFlag}
                  reviewIssues={getReviewIssues(ro, ros)}
                  onConvertToFlag={handleConvertToFlag}
                  hideTotals={userSettings.hideTotals ?? false}
                  onEdit={() => onEditRO(ro)}
                  onFlag={() => setFlaggingRO(ro)}
                  onDuplicate={newRONumber => {
                    duplicateRO(ro.id, newRONumber);
                    toast.success(`Duplicated RO #${ro.roNumber} → #${newRONumber}`);
                  }}
                  onDelete={() => {
                    deleteRO(ro.id);
                    toast.success(`Deleted RO #${ro.roNumber}`);
                  }}
                  onViewDetails={() => {
                    setSelectedRO(ro);
                    setShowDetail(true);
                  }}
                  existingRONumbers={ros.map(r => r.roNumber)}
                />
              ))}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount(c => c + 50)}
                  className="w-full h-10 rounded-full border border-border bg-card text-xs font-semibold text-primary hover:bg-muted quiet-transition"
                >
                  Load {Math.min(50, filteredROs.length - visibleCount)} more
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail sheet */}
      <RODetailSheet
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        ro={selectedRO}
        onEdit={() => { setShowDetail(false); if (selectedRO) onEditRO(selectedRO); }}
        onDuplicate={newRONumber => {
          if (selectedRO) {
            duplicateRO(selectedRO.id, newRONumber);
            toast.success(`Duplicated RO #${selectedRO.roNumber} → #${newRONumber}`);
          }
          setShowDetail(false);
        }}
        existingRONumbers={ros.map(r => r.roNumber)}
        onDelete={() => { if (selectedRO) deleteRO(selectedRO.id); setShowDetail(false); }}
      />

      {/* Filter / Sort Bottom Sheet */}
      <BottomSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filter & Sort">
        <div className="p-4 space-y-5">
          <div>
            <label className="section-title block mb-2">Sort By</label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { value: 'date', label: 'Most recent' },
                { value: 'ro', label: 'RO #' },
                { value: 'advisor', label: 'Advisor A-Z' },
                { value: 'customer', label: 'Customer A-Z' },
                { value: 'laborType', label: 'Labor type' },
                { value: 'hours', label: 'Hours' },
              ] as const).map(o => (
                <button
                  key={o.value}
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: o.value }))}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full border quiet-transition min-h-[44px]',
                    filters.sortBy === o.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="section-title block mb-2">Labor Type</label>
            <div className="flex flex-wrap gap-1.5">
              {(['warranty', 'customer-pay', 'internal'] as LaborType[]).map(type => (
                <Chip
                  key={type}
                  label={type === 'warranty' ? 'Warranty' : type === 'customer-pay' ? 'Customer Pay' : 'Internal'}
                  selected={filters.laborTypes.includes(type)}
                  onSelect={() => toggleLaborTypeFilter(type)}
                />
              ))}
            </div>
          </div>

          {uniqueAdvisors.length > 0 && (
            <div>
              <label className="section-title block mb-2">Advisor</label>
              <div className="flex flex-wrap gap-1.5">
                {uniqueAdvisors.map(advisor => (
                  <Chip
                    key={advisor}
                    label={advisor}
                    selected={filters.advisors.includes(advisor)}
                    onSelect={() => toggleAdvisorFilter(advisor)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={clearFilters}
              className="flex-1 h-12 bg-secondary rounded-xl font-medium text-sm"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      </BottomSheet>

      <AddFlagDialog
        open={!!flaggingRO}
        onClose={() => setFlaggingRO(null)}
        onSubmit={(flagType, note) => { if (flaggingRO) addFlag(flaggingRO.id, flagType, note); }}
        title={flaggingRO ? `Flag RO #${flaggingRO.roNumber}` : 'Add Flag'}
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
