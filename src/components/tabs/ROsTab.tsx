import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { Search, SlidersHorizontal, Filter, Table2, LayoutList, ClipboardList } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';
import { maskHours } from '@/lib/maskHours';
import { StatusPill } from '@/components/mobile/StatusPill';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { Chip } from '@/components/mobile/Chip';
import { RODetailSheet } from '@/components/sheets/RODetailSheet';
import { ROActionMenu } from '@/components/shared/ROActionMenu';
import { FlagBadge } from '@/components/flags/FlagBadge';
import { FlagInbox } from '@/components/flags/FlagInbox';
import { ReviewIndicator } from '@/components/flags/ReviewIndicator';
import { AddFlagDialog } from '@/components/flags/AddFlagDialog';
import { SpreadsheetView } from '@/components/shared/SpreadsheetView';
import { EmptyState } from '@/components/states/EmptyState';
import { toast } from 'sonner';
import type { LaborType, RepairOrder } from '@/types/ro';
import type { FlagType } from '@/types/flags';
import type { ReviewIssue } from '@/lib/reviewRules';
import { getReviewIssues } from '@/lib/reviewRules';
import { cn } from '@/lib/utils';

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

function calcHours(ro: RepairOrder): number {
  if (ro.lines?.length) return ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + (l.hoursPaid || 0), 0);
  return ro.paidHours || 0;
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

const ROCard = memo(function ROCard({
  ro, onEdit, onDuplicate, onDelete, onFlag, onViewDetails,
  flags, onClearFlag, reviewIssues, onConvertToFlag, existingRONumbers, hideTotals,
}: ROCardProps) {
  const effectiveDate = ro.paidDate || ro.date;
  const hours = calcHours(ro);
  const hasLines = ro.lines && ro.lines.length > 0;

  return (
    <div className="card-mobile p-2.5 group hover:bg-accent/30 transition-colors duration-100">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetails}>
          {/* Row 1: RO#, date, advisor */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold tabular-nums">#{ro.roNumber}</span>
            <span className="text-[11px] text-muted-foreground">{formatDateShort(effectiveDate)}</span>
            <span className="text-[11px] text-muted-foreground">· {ro.advisor}</span>
            {hasLines && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted border px-1.5 py-0 rounded">
                {ro.lines.length}L
              </span>
            )}
            <FlagBadge flags={flags} onClear={onClearFlag} />
            {reviewIssues.length > 0 && (
              <ReviewIndicator issues={reviewIssues} onConvertToFlag={onConvertToFlag} />
            )}
          </div>
        </div>

        {/* Right: status + hours + menu */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusPill type={ro.laborType} size="sm" />
          <span className="hours-pill text-xs">{maskHours(hours, hideTotals)}h</span>
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
  dateRange: 'all' | 'today' | 'week' | 'month' | 'pay_period';
  sortBy: 'date' | 'hours' | 'ro' | 'advisor';
}

interface ROsTabProps {
  onEditRO: (ro: RepairOrder) => void;
  onViewModeChange?: (mode: 'cards' | 'spreadsheet') => void;
}

function getWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
}

function getTwoWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff - 7);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'spreadsheet'>('cards');
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    onViewModeChange?.(viewMode);
  }, [viewMode, onViewModeChange]);

  const [filters, setFilters] = useState<FilterState>({
    advisors: [],
    laborTypes: [],
    dateRange: 'all',
    sortBy: 'date',
  });

  const uniqueAdvisors = useMemo(() => [...new Set(ros.map(r => r.advisor))].sort(), [ros]);

  const filteredROs = useMemo(() => {
    let result = ros;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
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

    // Advisor
    if (filters.advisors.length > 0) {
      result = result.filter(ro => filters.advisors.includes(ro.advisor));
    }

    // Labor type
    if (filters.laborTypes.length > 0) {
      result = result.filter(ro => filters.laborTypes.includes(ro.laborType));
    }

    // Date
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (filters.dateRange === 'today') {
      result = result.filter(ro => (ro.paidDate || ro.date) === today);
    } else if (filters.dateRange === 'week') {
      const useTwoWeeks = userSettings.defaultSummaryRange === 'two_weeks';
      const start = useTwoWeeks ? getTwoWeekStart(userSettings.weekStartDay ?? 0) : getWeekStart(userSettings.weekStartDay ?? 0);
      result = result.filter(ro => (ro.paidDate || ro.date) >= start);
    } else if (filters.dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const start = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`;
      result = result.filter(ro => (ro.paidDate || ro.date) >= start);
    } else if (filters.dateRange === 'pay_period' && hasCustomPayPeriod) {
      const { start, end } = getCustomPayPeriodRange(userSettings.payPeriodEndDates!, new Date());
      result = result.filter(ro => {
        const d = ro.paidDate || ro.date;
        return d >= start && d <= end;
      });
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      if (filters.sortBy === 'date') return (b.paidDate || b.date).localeCompare(a.paidDate || a.date);
      if (filters.sortBy === 'hours') return calcHours(b) - calcHours(a);
      if (filters.sortBy === 'ro') return a.roNumber.localeCompare(b.roNumber);
      if (filters.sortBy === 'advisor') return a.advisor.localeCompare(b.advisor);
      return 0;
    });

    return sorted;
  }, [ros, searchQuery, filters, hasCustomPayPeriod, userSettings]);

  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, filters]);

  const visibleROs = useMemo(() => filteredROs.slice(0, visibleCount), [filteredROs, visibleCount]);
  const hasMore = visibleCount < filteredROs.length;

  const totalHours = useMemo(() => filteredROs.reduce((s, ro) => s + calcHours(ro), 0), [filteredROs]);

  const handleConvertToFlag = useCallback((issue: ReviewIssue, flagType: FlagType, note?: string) => {
    addFlag(issue.roId, flagType, note || issue.detail, issue.lineId);
  }, [addFlag]);

  const activeFiltersCount =
    filters.advisors.length +
    filters.laborTypes.length +
    (filters.dateRange !== 'all' ? 1 : 0) +
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
    setFilters({ advisors: [], laborTypes: [], dateRange: 'all', sortBy: 'date' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <h2 className="text-sm font-semibold">Repair Orders</h2>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {filteredROs.length} ROs · {maskHours(totalHours, userSettings.hideTotals ?? false)}h
            </p>
          </div>
          <div className="flex items-center gap-1">
            <FlagInbox />
            {isPro && (
              <button
                onClick={() => setViewMode(v => v === 'cards' ? 'spreadsheet' : 'cards')}
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-md transition-colors',
                  viewMode === 'spreadsheet' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {viewMode === 'spreadsheet' ? <LayoutList className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={() => setShowFilters(true)}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted relative"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search RO #, advisor, vehicle, work..."
              className="w-full h-9 pl-8 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Date chips */}
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {([
            { value: 'all', label: 'All' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: userSettings.defaultSummaryRange === 'two_weeks' ? '2 Wk' : 'Week' },
            { value: 'month', label: 'Month' },
            ...(hasCustomPayPeriod ? [{ value: 'pay_period' as const, label: 'Pay Period' }] : []),
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilters(prev => ({ ...prev, dateRange: value as FilterState['dateRange'] }))}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap border transition-colors',
                filters.dateRange === value
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
          <SpreadsheetView
            ros={filteredROs}
            rangeLabel={filters.dateRange === 'all' ? 'All Time' : filters.dateRange}
            onSelectRO={ro => { setSelectedRO(ro); setShowDetail(true); }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-32">
          {loadingROs ? (
            <div className="px-4 py-3 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-mobile p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex gap-2">
                        <Skeleton className="h-3.5 w-14" />
                        <Skeleton className="h-3.5 w-20" />
                      </div>
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
              title="No repair orders found"
              description="Try adjusting your search or filters"
              actions={
                activeFiltersCount > 0 ? (
                  <button onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">
                    Clear all filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="px-4 py-2 space-y-1">
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
                  className="w-full py-2.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Load more ({filteredROs.length - visibleCount} remaining)
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
          {/* Sort */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Sort By
            </label>
            <div className="flex flex-wrap gap-1.5">
              {([
                { value: 'date', label: 'Date' },
                { value: 'hours', label: 'Hours' },
                { value: 'ro', label: 'RO #' },
                { value: 'advisor', label: 'Advisor' },
              ] as const).map(o => (
                <button
                  key={o.value}
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: o.value }))}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
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

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Date Range
            </label>
            <SegmentedControl
              options={[
                { value: 'all', label: 'All' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: userSettings.defaultSummaryRange === 'two_weeks' ? '2 Wk' : '1 Wk' },
                { value: 'month', label: 'Month' },
                ...(hasCustomPayPeriod ? [{ value: 'pay_period', label: 'Pay Period' }] : []),
              ]}
              value={filters.dateRange}
              onChange={value => setFilters(prev => ({ ...prev, dateRange: value as FilterState['dateRange'] }))}
            />
          </div>

          {/* Labor Type */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Labor Type
            </label>
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

          {/* Advisors */}
          {uniqueAdvisors.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Advisor
              </label>
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

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={clearFilters}
              className="flex-1 py-2.5 bg-secondary rounded-md font-medium text-sm"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-md font-semibold text-sm"
            >
              Apply
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Add Flag Dialog */}
      <AddFlagDialog
        open={!!flaggingRO}
        onClose={() => setFlaggingRO(null)}
        onSubmit={(flagType, note) => { if (flaggingRO) addFlag(flaggingRO.id, flagType, note); }}
        title={flaggingRO ? `Flag RO #${flaggingRO.roNumber}` : 'Add Flag'}
      />
    </div>
  );
}
