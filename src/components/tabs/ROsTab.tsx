import { useState, useMemo, useEffect, useRef, useDeferredValue, memo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Table2, LayoutList, ClipboardList, Loader2, Clock, Flag, AlertTriangle, CalendarRange, Plus, Crown, CheckCircle2, Rows3, Rows4 } from 'lucide-react';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { computeDateRangeBounds, filterROsByDateRange, boundsRangeLabel, type DateFilterKey } from '@/lib/dateRangeFilter';
import { useSharedDateRange } from '@/hooks/useSharedDateRange';
import { CustomDateRangeDialog } from '@/components/shared/CustomDateRangeDialog';
import { maskHours } from '@/lib/maskHours';
import { BottomSheet } from '@/components/mobile/BottomSheet';
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
import { compareAdvisorNames, normalizeAdvisorName, sortROs, matchesSearchQuery } from '@/lib/roFilters';
import { getStatusSummary } from '@/lib/roStatus';
import { RO_MONTHLY_CAP } from '@/lib/proFeatures';

const SpreadsheetView = lazy(() =>
  import('@/components/shared/SpreadsheetView').then((m) => ({ default: m.SpreadsheetView })),
);

/* ── Labor type accent bar color ─────────────────── */
const laborTypeBarColor = (type: LaborType) =>
  type === 'warranty'
    ? 'hsl(var(--status-warranty))'
    : type === 'customer-pay'
      ? 'hsl(var(--status-customer-pay))'
      : 'hsl(var(--status-internal))';

/* ── Compact inline status indicators ───────────── */
function InlineStatusChips({
  ro, flagsCount, checksCount,
}: { ro: RepairOrder; flagsCount: number; checksCount: number }) {
  const status = getStatusSummary(ro, flagsCount, checksCount);
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* Paid — only show when paid date is set */}
      {status.paid === 'Paid' && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none" style={{ color: 'hsl(var(--status-warranty))' }}>
          <CheckCircle2 className="h-3 w-3" />
        </span>
      )}
      {status.tbd > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 leading-none">
          <Clock className="h-2.5 w-2.5" />
          <span>{status.allTbd ? 'ALL' : status.tbd}</span>
        </span>
      )}
      {status.flags > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none" style={{ color: 'hsl(var(--status-internal))' }}>
          <Flag className="h-2.5 w-2.5" />
          <span>{status.flags}</span>
        </span>
      )}
      {status.checks > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive leading-none">
          <AlertTriangle className="h-2.5 w-2.5" />
          <span>{status.checks}</span>
        </span>
      )}
    </div>
  );
}

/* ── ROCard — dense, purpose-built row card ──────── */

interface ROCardProps {
  ro: RepairOrder;
  onEdit: () => void;
  onDelete: () => void;
  onFlag: () => void;
  onTbdAll: () => void;
  onViewDetails: () => void;
  flags: import('@/types/flags').ROFlag[];
  reviewIssues: ReviewIssue[];
  existingRONumbers: string[];
  hideTotals: boolean;
  compact?: boolean;
}

const ROCard = memo(function ROCard({
  ro, onEdit, onDelete, onFlag, onTbdAll, onViewDetails,
  flags, reviewIssues, existingRONumbers, hideTotals,
  compact = false,
}: ROCardProps) {
  const hours = calcHours(ro);
  const roDate = formatDateShort(effectiveDate(ro));
  const accentColor = laborTypeBarColor(ro.laborType);
  const ltLabel = ro.laborType === 'warranty' ? 'W' : ro.laborType === 'customer-pay' ? 'CP' : 'INT';

  const workSummary = ro.lines?.length
    ? ro.lines.map((l) => l.description).filter(Boolean).slice(0, 3).join(' · ')
    : ro.workPerformed || '';

  const vehicle = vehicleLabel(ro);

  return (
    <div
      className="ro-row-card bg-card relative overflow-hidden group"
      style={{ borderLeftColor: accentColor }}
    >
      <div
        className="flex items-stretch gap-0 cursor-pointer hover:bg-muted/25 transition-colors duration-75 active:bg-muted/40"
        onClick={onViewDetails}
      >
        <div className={cn('flex-1 min-w-0 px-3', compact ? 'py-[5px]' : 'py-2')}>
          {/* Row 1: RO# · Date · Customer — left | Hours + Type — right */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              'font-extrabold tabular-nums text-foreground tracking-tight leading-none flex-shrink-0 font-mono',
              compact ? 'text-[12px]' : 'text-[13px]',
            )}>
              #{ro.roNumber || '—'}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
              {roDate}
            </span>
            {ro.customerName ? (
              <span className={cn(
                'font-medium text-foreground/70 truncate min-w-0 flex-1',
                compact ? 'text-[10px]' : 'text-[11px]',
              )}>
                {ro.customerName}
              </span>
            ) : (
              <span className="flex-1" />
            )}
            {/* Hours — monospace, the #1 number a tech looks for */}
            <span className={cn(
              'flex-shrink-0 font-bold tabular-nums leading-none px-1.5 py-0.5 font-mono',
              compact ? 'text-[12px]' : 'text-[13px]',
              hours === 0 ? 'text-muted-foreground bg-muted/50' : 'text-foreground',
            )} style={{
              borderRadius: '3px',
              ...(hours > 0 ? { backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)` } : {}),
            }}>
              {maskHours(hours, hideTotals)}h
            </span>
            {/* Labor type tag */}
            <span
              className="text-[8px] font-bold leading-none px-1 py-0.5 flex-shrink-0 text-white"
              style={{ backgroundColor: accentColor, borderRadius: '2px' }}
            >
              {ltLabel}
            </span>
          </div>

          {/* Row 2: Advisor · Vehicle · Work summary — left | Status — right */}
          <div className={cn('flex items-center gap-1 min-w-0', compact ? 'mt-[2px]' : 'mt-0.5')}>
            {ro.advisor && (
              <span className="text-[10px] font-semibold text-foreground/50 truncate flex-shrink-0 max-w-[100px]">
                {ro.advisor}
              </span>
            )}
            {vehicle !== '—' && (
              <>
                <span className="text-muted-foreground/25 text-[9px] flex-shrink-0">·</span>
                <span className="text-[10px] text-muted-foreground/50 truncate flex-shrink-0 max-w-[90px]">
                  {vehicle}
                </span>
              </>
            )}
            {workSummary && !compact && (
              <>
                <span className="text-muted-foreground/20 text-[8px] flex-shrink-0">—</span>
                <span className="text-[10px] text-muted-foreground/40 truncate min-w-0 flex-1">
                  {workSummary}
                </span>
              </>
            )}
            <span className="flex-1 min-w-[4px]" />
            <InlineStatusChips ro={ro} flagsCount={flags.length} checksCount={reviewIssues.length} />
          </div>
        </div>

        <div
          className="flex-shrink-0 flex items-center pr-1.5 pl-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <ROActionMenu
            roNumber={ro.roNumber}
            onEdit={onEdit}
            onDelete={onDelete}
            onFlag={onFlag}
            onTbdAll={onTbdAll}
            isAllTbd={!!(ro.lines?.length && ro.lines.every(l => l.isTbd))}
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
  const { ros, deleteRO, updateRO, loadingROs } = useRO();
  const { isPro } = useSubscription();
  const { flags, userSettings, addFlag } = useFlagContext();

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
  const [density, setDensity] = useLocalStorageState<'normal' | 'compact'>('ui.mobile.roTab.density.v1', 'normal');
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

  const preFilteredROs = useMemo(() => {
    let result = ros;

    if (deferredSearch.trim()) {
      const q = deferredSearch.trim();
      result = result.filter(ro => matchesSearchQuery(ro, q));
    }

    if (filters.advisors.length > 0) {
      const selectedAdvisors = new Set(filters.advisors.map((a) => normalizeAdvisorName(a)));
      result = result.filter(ro => selectedAdvisors.has(normalizeAdvisorName(ro.advisor)));
    }

    if (filters.laborTypes.length > 0) {
      result = result.filter(ro => filters.laborTypes.includes(ro.laborType));
    }

    return sortROs(result, filters.sortBy);
  }, [ros, deferredSearch, filters]);

  const filteredROs = useMemo(() => filterROsByDateRange(preFilteredROs, rangeBounds), [preFilteredROs, rangeBounds]);

  // Stable set of RO numbers — only recomputed when the list of RO numbers
  // actually changes (not on every ros reference change).
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

  // Only compute review issues for VISIBLE ROs, not the entire dataset.
  // The duplicate-RO-number counts still scan all ros (cheap Map build),
  // but the expensive getReviewIssues() call only runs for visible rows.
  const roNumberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ro of ros) {
      if (!ro.roNumber) continue;
      counts.set(ro.roNumber, (counts.get(ro.roNumber) ?? 0) + 1);
    }
    return counts;
  }, [ros]);

  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, filters, dateFilter]);

  const visibleROs = useMemo(() => filteredROs.slice(0, visibleCount), [filteredROs, visibleCount]);
  const hasMore = visibleCount < filteredROs.length;

  const reviewIssuesByROId = useMemo(() => {
    const issuesMap = new Map<string, ReviewIssue[]>();
    for (const ro of visibleROs) {
      const count = ro.roNumber ? (roNumberCounts.get(ro.roNumber) ?? 0) : 0;
      issuesMap.set(ro.id, count > 1 ? getReviewIssues(ro, ros) : []);
    }
    return issuesMap;
  }, [visibleROs, roNumberCounts, ros]);

  const totalHours = useMemo(() => filteredROs.reduce((s, ro) => s + calcHours(ro), 0), [filteredROs]);

  // Monthly RO usage for free-tier cap indicator
  const monthlyROCount = useMemo(() => {
    if (isPro) return 0;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter(r => r.date && r.date >= monthStart).length;
  }, [ros, isPro]);
  const goalSettings = userSettings;
  const hoursGoalDaily = goalSettings.hoursGoalDaily;

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

  const dateFilterOptions = [
    { value: 'all' as const, label: 'All' },
    { value: 'today' as const, label: 'Today' },
    { value: 'week' as const, label: userSettings.defaultSummaryRange === 'two_weeks' ? '2 Wk' : 'Week' },
    { value: 'last_week' as const, label: 'Last Wk' },
    { value: 'month' as const, label: 'Month' },
    ...(hasCustomPayPeriod ? [{ value: 'pay_period' as const, label: 'Pay Period' }] : []),
    { value: 'custom' as const, label: 'Custom' },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Sticky header ───────────────────────────── */}
      <div className="sticky top-0 z-30 bg-card border-b border-border/60">

        {/* Top bar: shop name + controls */}
        <div className="flex items-center h-10 px-3 gap-2 border-b border-border/30">
          <h2 className="text-[15px] font-bold tracking-tight text-foreground flex-1 truncate">
            {goalSettings.shopName || 'Repair Orders'}
          </h2>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Daily goal indicator */}
            {hoursGoalDaily > 0 && (
              <div className={cn(
                'h-6 px-2 rounded-full text-[10px] font-bold tabular-nums flex items-center gap-1 border',
                todayHours >= hoursGoalDaily
                  ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400'
                  : 'bg-primary/10 text-primary border-primary/20'
              )}>
                <span>{todayHours.toFixed(1)}</span>
                <span className="opacity-60">/</span>
                <span>{hoursGoalDaily}h</span>
              </div>
            )}

            {/* Avatar */}
            {goalSettings.displayName && (
              <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 select-none">
                {goalSettings.displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Density toggle */}
            {viewMode === 'cards' && (
              <button
                onClick={() => setDensity(d => d === 'normal' ? 'compact' : 'normal')}
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded-md quiet-transition border',
                  density === 'compact'
                    ? 'bg-primary/10 text-primary border-primary/25'
                    : 'text-muted-foreground bg-transparent border-border/60 hover:bg-muted/50 hover:text-foreground'
                )}
                title={density === 'compact' ? 'Switch to normal density' : 'Switch to compact density'}
              >
                {density === 'compact' ? <Rows3 className="h-3 w-3" /> : <Rows4 className="h-3 w-3" />}
              </button>
            )}

            {/* Spreadsheet toggle */}
            <button
              onClick={() => isPro ? setViewMode(v => v === 'cards' ? 'spreadsheet' : 'cards') : setShowUpgrade(true)}
              className={cn(
                'h-6 w-6 flex items-center justify-center rounded-md quiet-transition relative border',
                isPro && viewMode === 'spreadsheet'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground bg-transparent border-border/60 hover:bg-muted/50 hover:text-foreground'
              )}
              title={isPro ? 'Toggle spreadsheet view' : 'Spreadsheet view — Pro'}
            >
              {viewMode === 'spreadsheet' && isPro ? <LayoutList className="h-3 w-3" /> : <Table2 className="h-3 w-3" />}
              {!isPro && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full flex items-center justify-center">
                  <Crown className="h-1.5 w-1.5 text-primary-foreground" />
                </span>
              )}
            </button>

            {/* Flag Inbox */}
            <FlagInbox />
          </div>
        </div>

        {/* Search + stats bar */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          {/* Hours + RO count pill */}
          <div className="stat-badge flex-shrink-0">
            <span className="text-[15px] font-bold tabular-nums text-primary leading-none tracking-tight font-mono">
              {maskHours(totalHours, userSettings.hideTotals ?? false)}h
            </span>
            <span className="text-[10px] text-muted-foreground font-medium leading-none">
              {filteredROs.length} RO{filteredROs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Monthly cap indicator for free users */}
          {!isPro && !loadingROs && (
            <button
              onClick={() => setShowUpgrade(true)}
              className={cn(
                'flex-shrink-0 h-6 px-2 rounded-full border text-[10px] font-semibold flex items-center gap-1 quiet-transition',
                monthlyROCount >= RO_MONTHLY_CAP
                  ? 'bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400'
                  : monthlyROCount >= RO_MONTHLY_CAP - 5
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground border-border/60'
              )}
              title="Monthly RO usage — upgrade for unlimited"
            >
              <Crown className="h-2.5 w-2.5" />
              {monthlyROCount}/{RO_MONTHLY_CAP}
            </button>
          )}

          {/* Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, RO#, VIN, work, notes…"
              className="w-full h-9 pl-3 pr-3 rounded-lg border border-input bg-background text-[12px] shadow-[var(--shadow-sm)] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Filter button — standalone for easy tap target */}
          <button
            onClick={() => setShowFilters(true)}
            className={cn(
              'relative flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-lg border quiet-transition',
              activeFiltersCount > 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Date filter chips + quick labor type chips */}
        {viewMode !== 'spreadsheet' && (
          <div className="flex items-center gap-1 px-3 pb-1.5 overflow-x-auto scrollbar-hide">
            {dateFilterOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => value === 'custom' ? requestCustomDialog() : setDateRange(value as DateFilterKey)}
                className={cn(
                  'h-6 px-2.5 text-[10px] font-semibold rounded-full border flex-shrink-0 quiet-transition',
                  dateFilter === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border/60 hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
            {/* Divider */}
            <span className="w-px h-3.5 bg-border/60 flex-shrink-0 mx-0.5" />
            {/* Quick labor type chips */}
            {([
              { type: 'warranty' as LaborType, label: 'W', color: 'hsl(var(--status-warranty))' },
              { type: 'customer-pay' as LaborType, label: 'CP', color: 'hsl(var(--status-customer-pay))' },
              { type: 'internal' as LaborType, label: 'INT', color: 'hsl(var(--status-internal))' },
            ]).map(({ type, label, color }) => {
              const active = filters.laborTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleLaborTypeFilter(type)}
                  className={cn(
                    'h-6 px-2 text-[9px] font-bold rounded-full flex-shrink-0 quiet-transition border',
                    active ? 'text-white' : 'bg-transparent border-border/60 hover:border-border',
                  )}
                  style={active
                    ? { backgroundColor: color, borderColor: color }
                    : { color }}
                  title={type === 'warranty' ? 'Warranty' : type === 'customer-pay' ? 'Customer Pay' : 'Internal'}
                >
                  {label}
                </button>
              );
            })}
            <span
              className={cn(
                'ml-auto flex items-center gap-1 text-[10px] font-medium text-muted-foreground flex-shrink-0',
                dateFilter === 'custom' && 'cursor-pointer hover:text-foreground'
              )}
              onClick={() => { if (dateFilter === 'custom') requestCustomDialog(); }}
            >
              <CalendarRange className="h-3 w-3" />
              {rangeChipLabel}
            </span>
          </div>
        )}
      </div>

      {/* ── List content ─────────────────────────────── */}
      {viewMode === 'spreadsheet' && isPro ? (
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
            <SpreadsheetView
              ros={preFilteredROs}
              onSelectRO={ro => { setSelectedRO(ro); setShowDetail(true); }}
            />
          </Suspense>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/20">
          {loadingROs ? (
            <div className="divide-y divide-border/40">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-3 py-2.5 flex items-center gap-2.5 bg-card" style={{ opacity: 1 - i * 0.08 }}>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <Skeleton className="h-4 w-16 rounded" />
                      <Skeleton className="h-3 w-12 rounded" />
                      <div className="flex-1" />
                      <Skeleton className="h-5 w-10 rounded" />
                      <Skeleton className="h-4 w-6 rounded-full" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-3 w-32 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredROs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              variant={ros.length === 0 ? 'welcome' : 'filtered'}
              title={ros.length === 0 ? 'Ready to track your hours' : 'No ROs match your filters'}
              description={
                ros.length === 0
                  ? 'Add your first repair order — it takes about 10 seconds. You\'ll see your hours, totals, and pay period summary right away.'
                  : 'Try adjusting your date range, search, or filters.'
              }
              actions={
                ros.length === 0 ? (
                  <button
                    onClick={() => navigate('/add-ro')}
                    className="h-11 px-6 text-sm font-semibold bg-primary text-primary-foreground rounded-full flex items-center gap-2 active:scale-[0.97] transition-transform shadow-[var(--shadow-soft)]"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First RO
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
            <div className="divide-y divide-border/40">
              {visibleROs.map(ro => (
                <ROCard
                  key={ro.id}
                  ro={ro}
                  flags={flagsByROId.get(ro.id) ?? []}
                  reviewIssues={reviewIssuesByROId.get(ro.id) ?? []}
                  hideTotals={userSettings.hideTotals ?? false}
                  compact={density === 'compact'}
                  onEdit={() => onEditRO(ro)}
                  onFlag={() => setFlaggingRO(ro)}
                  onDelete={() => deleteRO(ro.id)}
                  onTbdAll={() => {
                    const allTbd = !!(ro.lines?.length && ro.lines.every(l => l.isTbd));
                    updateRO(ro.id, {
                      lines: (ro.lines ?? []).map(l => ({ ...l, isTbd: !allTbd, updatedAt: new Date().toISOString() })),
                    });
                  }}
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
                  className="w-full h-10 bg-card border-t border-border/40 text-[11px] font-semibold text-primary hover:bg-muted/40 quiet-transition"
                >
                  Show {Math.min(50, filteredROs.length - visibleCount)} more
                </button>
              )}
              {/* Bottom padding for FAB */}
              <div className="h-24" />
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
        existingRONumbers={existingRONumbers}
        onDelete={() => { if (selectedRO) deleteRO(selectedRO.id); setShowDetail(false); }}
        onSelectRO={(ro) => { setSelectedRO(ro); setShowDetail(true); }}
      />

      {/* Filter / Sort Bottom Sheet */}
      <BottomSheet isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filter & Sort">
        <div className="p-4 space-y-4">
          <div className="surface-subtle p-3">
            <label className="section-title block mb-2.5">Sort By</label>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { value: 'date', label: 'Most recent' },
                { value: 'ro', label: 'RO #' },
                { value: 'advisor', label: 'Advisor A–Z' },
                { value: 'customer', label: 'Customer A–Z' },
                { value: 'laborType', label: 'Labor type' },
                { value: 'hours', label: 'Hours' },
              ] as const).map(o => (
                <button
                  key={o.value}
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: o.value }))}
                  className={cn(
                    'px-3 py-2 text-[11px] font-semibold rounded-lg border quiet-transition min-h-[40px] text-left',
                    filters.sortBy === o.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border/70 hover:bg-muted/40'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-subtle p-3">
            <label className="section-title block mb-2.5">Labor Type</label>
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
            <div className="surface-subtle p-3">
              <label className="section-title block mb-2.5">Advisor</label>
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

          <div className="flex gap-2 pt-1">
            <button
              onClick={clearFilters}
              className="flex-1 h-11 bg-muted rounded-xl font-semibold text-sm text-foreground/70 hover:bg-muted/80 quiet-transition"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 quiet-transition"
            >
              Done
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
