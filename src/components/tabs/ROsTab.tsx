import { useState, useMemo, useEffect, useRef, useDeferredValue, memo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Filter, Table2, LayoutList, ClipboardList, Loader2, Clock, Flag, AlertTriangle, CalendarRange, Plus, Crown } from 'lucide-react';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
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
import type { ReviewIssue } from '@/lib/reviewRules';
import { getReviewIssues } from '@/lib/reviewRules';
import { cn } from '@/lib/utils';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { effectiveDate, formatDateShort, calcHours, vehicleLabel } from '@/lib/roDisplay';
import { compareAdvisorNames, normalizeAdvisorName, sortROs } from '@/lib/roFilters';
import { getStatusSummary } from '@/lib/roStatus';

const SpreadsheetView = lazy(() =>
  import('@/components/shared/SpreadsheetView').then((m) => ({ default: m.SpreadsheetView })),
);

/* ── StatusChips ─────────────────────────────────── */

function MobileStatusChips({ ro, flagsCount, checksCount }: { ro: RepairOrder; flagsCount: number; checksCount: number }) {
  const status = getStatusSummary(ro, flagsCount, checksCount);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge
        variant={status.paid === "Paid" ? "outline" : "secondary"}
        className={cn(
          "text-[10px] px-2 py-0.5 font-semibold rounded-full",
          status.paid === "Paid"
            ? "border-[hsl(var(--status-warranty))]/30 text-[hsl(var(--status-warranty))]"
            : "text-muted-foreground",
        )}
      >
        {status.paid}
      </Badge>
      {status.tbd > 0 && (
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1 font-semibold rounded-full">
          <Clock className="h-2.5 w-2.5" />
          {status.tbd}
        </Badge>
      )}
      {status.flags > 0 && (
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1 font-semibold rounded-full text-[hsl(var(--status-internal))]">
          <Flag className="h-2.5 w-2.5" />
          {status.flags}
        </Badge>
      )}
      {status.checks > 0 && (
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1 font-semibold rounded-full text-[hsl(var(--destructive))]">
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
  reviewIssues: ReviewIssue[];
  existingRONumbers: string[];
  hideTotals: boolean;
}

const ROCard = memo(function ROCard({
  ro, onEdit, onDuplicate, onDelete, onFlag, onViewDetails,
  flags, reviewIssues, existingRONumbers, hideTotals,
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
      className="card-mobile px-4 py-3.5 group row-hover quiet-transition border-l-[3px] border border-border/70 shadow-soft"
      style={{ borderLeftColor: laborTypeColor }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetails}>
          {/* Row 1: RO# · hours · status badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base font-bold tabular-nums flex-shrink-0 text-foreground">#{ro.roNumber || '—'}</span>
            <span className="hours-pill flex-shrink-0">{maskHours(hours, hideTotals)}h</span>
            <span className="meta-text tabular-nums flex-shrink-0 bg-muted/60 px-2 py-0.5 rounded-full">{formatDateShort(roEffectiveDate)}</span>
            <div className="flex-shrink-0">
              <MobileStatusChips ro={ro} flagsCount={flags.length} checksCount={reviewIssues.length} />
            </div>
          </div>

          {/* Row 2: labor type · advisor · vehicle · work summary */}
          <div className="flex items-start gap-1.5 mt-2">
            <StatusPill type={ro.laborType} size="sm" />
            <p className="meta-text leading-snug">
              {ro.advisor}
              {vehicleLabel(ro) !== "—" && <> · {vehicleLabel(ro)}</>}
              {' — '}
              <span className="text-muted-foreground/75 block truncate">
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
  const navigate = useNavigate();
  const { ros, deleteRO, duplicateRO, loadingROs } = useRO();
  const { isPro } = useSubscription();
  const { flags, userSettings } = useFlagContext();

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
  const [showUpgrade, setShowUpgrade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const SCROLL_KEY = 'ui.mobile.roTab.scrollY';

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved && scrollEl) {
      scrollEl.scrollTop = parseInt(saved, 10);
    }
    return () => {
      if (scrollEl) {
        sessionStorage.setItem(SCROLL_KEY, String(scrollEl.scrollTop));
      }
    };
  }, []);

  useEffect(() => {
    if (!isPro && viewMode === 'spreadsheet') setViewMode('cards');
  }, [isPro, viewMode, setViewMode]);

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

  const advisorsInRange = useMemo(() => {
    const inRange = filterROsByDateRange(ros, rangeBounds);
    const firstSeenByKey = new Map<string, string>();
    inRange.forEach((ro) => {
      const normalized = normalizeAdvisorName(ro.advisor);
      if (!normalized || firstSeenByKey.has(normalized)) return;
      firstSeenByKey.set(normalized, ro.advisor.trim());
    });
    return Array.from(firstSeenByKey.values()).sort(compareAdvisorNames);
  }, [ros, rangeBounds]);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.advisors.length === 0) return prev;
      const allowed = new Set(advisorsInRange.map((name) => normalizeAdvisorName(name)));
      const nextAdvisors = prev.advisors.filter((name) => allowed.has(normalizeAdvisorName(name)));
      return nextAdvisors.length === prev.advisors.length ? prev : { ...prev, advisors: nextAdvisors };
    });
  }, [advisorsInRange, setFilters]);

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
      const selectedAdvisors = new Set(filters.advisors.map((a) => normalizeAdvisorName(a)));
      result = result.filter(ro => selectedAdvisors.has(normalizeAdvisorName(ro.advisor)));
    }

    if (filters.laborTypes.length > 0) {
      result = result.filter(ro => filters.laborTypes.includes(ro.laborType));
    }

    result = filterROsByDateRange(result, rangeBounds);

    return sortROs(result, filters.sortBy);
  }, [ros, deferredSearch, filters, rangeBounds]);

  const existingRONumbers = useMemo(() => ros.map((r) => r.roNumber), [ros]);

  const flagsByROId = useMemo(() => {
    const map = new Map<string, import('@/types/flags').ROFlag[]>();
    for (const flag of flags) {
      if (flag.roLineId) continue;
      const current = map.get(flag.roId);
      if (current) current.push(flag);
      else map.set(flag.roId, [flag]);
    }
    return map;
  }, [flags]);

  const reviewIssuesByROId = useMemo(() => {
    const roNumberCounts = new Map<string, number>();
    for (const ro of ros) {
      if (!ro.roNumber) continue;
      roNumberCounts.set(ro.roNumber, (roNumberCounts.get(ro.roNumber) ?? 0) + 1);
    }

    const issuesMap = new Map<string, ReviewIssue[]>();
    for (const ro of ros) {
      const count = ro.roNumber ? (roNumberCounts.get(ro.roNumber) ?? 0) : 0;
      issuesMap.set(ro.id, count > 1 ? getReviewIssues(ro, ros) : []);
    }
    return issuesMap;
  }, [ros]);

  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, filters, dateFilter]);

  const visibleROs = useMemo(() => filteredROs.slice(0, visibleCount), [filteredROs, visibleCount]);
  const hasMore = visibleCount < filteredROs.length;

  const totalHours = useMemo(() => filteredROs.reduce((s, ro) => s + calcHours(ro), 0), [filteredROs]);
  const goalSettings = userSettings; // use shared FlagContext instance — updates immediately when settings change
  const hoursGoalDaily = goalSettings.hoursGoalDaily;

  // Today's hours for daily goal indicator
  const todayHours = useMemo(() => {
    if (hoursGoalDaily <= 0) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return ros.filter(ro => (ro.date || '').startsWith(today)).reduce((s, ro) => s + calcHours(ro), 0);
  }, [ros, hoursGoalDaily]);

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
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 pt-2.5">
        <div className="flex items-start justify-between pb-2 gap-2">
          <div className="min-w-0">
            <h2 className="page-title">{goalSettings.shopName || 'Repair Orders'}</h2>
            <div className="mt-1.5 inline-flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/35 px-2.5 py-1.5">
              <span className="text-2xl font-bold tabular-nums text-primary leading-none tracking-tight">
                {maskHours(totalHours, userSettings.hideTotals ?? false)}h
              </span>
              <span className="text-sm text-muted-foreground tabular-nums font-medium leading-none">
                {filteredROs.length} ROs
              </span>
              {hoursGoalDaily > 0 && (
                <span className={cn(
                  'text-xs font-semibold tabular-nums leading-none px-2 py-0.5 rounded-full',
                  todayHours >= hoursGoalDaily
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-primary/10 text-primary'
                )}>
                  {todayHours.toFixed(1)} / {hoursGoalDaily}h today
                </span>
              )}
              <Badge
                variant="outline"
                className={cn("gap-1 text-xs py-0.5 px-2 font-medium rounded-full", dateFilter === "custom" && "cursor-pointer hover:bg-background")}
                onClick={() => { if (dateFilter === "custom") requestCustomDialog(); }}
              >
                <CalendarRange className="h-3 w-3" />
                {rangeChipLabel}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {goalSettings.displayName && (
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 select-none">
                {goalSettings.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <FlagInbox />
            <button
              onClick={() => isPro ? setViewMode(v => v === 'cards' ? 'spreadsheet' : 'cards') : setShowUpgrade(true)}
              className={cn(
                'h-9 w-9 flex items-center justify-center rounded-full quiet-transition relative',
                isPro && viewMode === 'spreadsheet' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
              title={isPro ? 'Toggle spreadsheet view' : 'Spreadsheet view — Pro'}
            >
              {viewMode === 'spreadsheet' && isPro ? <LayoutList className="icon-toolbar" /> : <Table2 className="icon-toolbar" />}
              {!isPro && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-primary rounded-full flex items-center justify-center">
                  <Crown className="h-2 w-2 text-primary-foreground" />
                </span>
              )}
            </button>
            <button
              onClick={() => setShowFilters(true)}
              className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted relative quiet-transition"
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

        <div className="pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 icon-toolbar text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search RO #, advisor, vehicle, work..."
              className="w-full h-9 pl-8 pr-3 rounded-full border border-input bg-muted/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {viewMode !== 'spreadsheet' && (
          <div className="flex flex-wrap gap-1.5 pb-2.5">
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
                'h-8 px-3.5 text-xs font-semibold rounded-full border quiet-transition',
                dateFilter === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {label}
            </button>
          ))}
          </div>
        )}
        </div>
      </div>

      {/* List content */}
      {viewMode === 'spreadsheet' && isPro ? (
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32">
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
              title={ros.length === 0 ? 'No ROs yet' : 'Nothing matches'}
              description={
                ros.length === 0
                  ? 'Track every repair order so you always know your hours.'
                  : 'Try a different search or filter.'
              }
              actions={
                ros.length === 0 ? (
                  <button
                    onClick={() => navigate('/add-ro')}
                    className="h-11 px-6 text-sm font-semibold bg-primary text-primary-foreground rounded-full flex items-center gap-2 active:scale-[0.97] transition-transform"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First RO
                  </button>
                ) : activeFiltersCount > 0 ? (
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
            <div className="px-4 py-2.5 space-y-2">
              {visibleROs.map(ro => (
                <ROCard
                  key={ro.id}
                  ro={ro}
                  flags={flagsByROId.get(ro.id) ?? []}
                  reviewIssues={reviewIssuesByROId.get(ro.id) ?? []}
                  hideTotals={userSettings.hideTotals ?? false}
                  onEdit={() => onEditRO(ro)}
                  onFlag={() => setFlaggingRO(ro)}
                  onDuplicate={newRONumber => {
                    duplicateRO(ro.id, newRONumber);
                    toast.success(`Duplicated RO #${ro.roNumber} → #${newRONumber}`);
                  }}
                  onDelete={() => deleteRO(ro.id)}
                  onViewDetails={() => {
                    setSelectedRO(ro);
                    setShowDetail(true);
                  }}
                  existingRONumbers={existingRONumbers}
                />
              ))}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount(c => c + 50)}
                  className="w-full h-10 rounded-full border border-border bg-card text-xs font-semibold text-primary hover:bg-muted quiet-transition"
                >
                  Show {Math.min(50, filteredROs.length - visibleCount)} more
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
        existingRONumbers={existingRONumbers}
        onDelete={() => { if (selectedRO) deleteRO(selectedRO.id); setShowDetail(false); }}
      />

      {/* Filter / Sort Bottom Sheet */}
      <BottomSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filter & Sort">
        <div className="p-4 space-y-5">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <label className="section-title block mb-2">Sort By</label>
            <div className="grid grid-cols-2 gap-1.5">
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
                    'px-3 py-1.5 text-xs font-medium rounded-full border quiet-transition min-h-[44px] text-left',
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

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
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

          {advisorsInRange.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <label className="section-title block mb-2">Advisor</label>
              <div className="flex flex-wrap gap-1.5">
                {advisorsInRange.map(advisor => (
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

      <ProUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} trigger="spreadsheet" />
    </div>
  );
}
