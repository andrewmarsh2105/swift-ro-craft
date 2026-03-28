import { useState, useMemo } from 'react';
import { Download, Copy, FileText, Flag, CalendarIcon, Clock, AlertCircle, ChevronDown, Lock, Target, DollarSign, Crown } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFlagContext } from '@/contexts/FlagContext';
import { StatusPill } from '@/components/mobile/StatusPill';
import { ProofPack } from '@/components/reports/ProofPack';
import { usePayPeriodReport } from '@/hooks/usePayPeriodReport';
import { generateLineCSV, generateSummaryText, downloadCSV } from '@/lib/exportUtils';
import { cn, localDateStr } from '@/lib/utils';
import { maskHours } from '@/lib/maskHours';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useCloseouts } from '@/hooks/useCloseouts';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { ClosedPeriodsList } from '@/components/reports/ClosedPeriodsList';
import { CloseoutDetailView } from '@/components/reports/CloseoutDetailView';
import type { CloseoutSnapshot, CloseoutRangeType } from '@/hooks/useCloseouts';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';
import type { SummaryRange } from '@/hooks/useUserSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HideTotalsContext } from '@/contexts/HideTotalsContext';
import { MultiPeriodComparison } from '@/components/summary/MultiPeriodComparison';
import { getDayRange, getWeekRange, getMonthRange, getTwoWeekRange, getLastWeekRange } from '@/lib/summaryDateRanges';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Section divider ───────────────────────────────────────
function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4">
      <span className="text-[10px] font-bold text-muted-foreground/45 uppercase tracking-[0.12em] whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-border/25" />
    </div>
  );
}

// ── Goal bar (inline, compact) ────────────────────────────
function GoalBar({ label, current, goal, hide }: { label: string; current: number; goal: number; hide: boolean }) {
  const pct = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target className={cn('h-3 w-3', isComplete && !hide ? 'text-green-600' : 'text-muted-foreground/45')} />
          <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground/65">{label}</span>
          {isComplete && !hide && (
            <span className="text-[9px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full leading-none">
              Done
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hide && (
            <span className="text-[10px] text-muted-foreground/45 tabular-nums">{pct.toFixed(0)}%</span>
          )}
          <span className={cn('text-xs font-bold tabular-nums', isComplete && !hide ? 'text-green-600' : 'text-foreground')}>
            {hide ? '--.-' : current.toFixed(1)}<span className="text-muted-foreground/35 font-normal">/</span>{goal}h
          </span>
        </div>
      </div>
      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', isComplete ? 'bg-green-500' : 'bg-primary')}
          style={{ width: `${hide ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main SummaryTab ───────────────────────────────────────
export function SummaryTab() {
  const isMobile = useIsMobile();
  const { userSettings, clearFlagsForPeriod } = useFlagContext();
  const { isPro } = useSubscription();
  const hideTotals = userSettings.hideTotals ?? false;
  const weekStartDay = userSettings.weekStartDay ?? 0;

  const payPeriodType = userSettings.payPeriodType || 'week';
  const payPeriodEndDates = userSettings.payPeriodEndDates;
  const hasCustomPayPeriod = payPeriodType === 'custom' && payPeriodEndDates && payPeriodEndDates.length > 0;

  const [rangeMode, setRangeMode] = useState<string>(() => {
    if (payPeriodType === 'two_weeks') return 'two_weeks';
    if (hasCustomPayPeriod) return 'pay_period';
    return 'week';
  });
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [showProofPack, setShowProofPack] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [showAllAdvisors, setShowAllAdvisors] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<import('@/lib/proFeatures').UpgradeTrigger>('generic');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const openUpgrade = (trigger: import('@/lib/proFeatures').UpgradeTrigger) => {
    setUpgradeTrigger(trigger);
    setShowUpgrade(true);
  };

  const hoursGoalDaily = userSettings.hoursGoalDaily;
  const hoursGoalWeekly = userSettings.hoursGoalWeekly;
  const hourlyRate = userSettings.hourlyRate;

  // Closeout state
  const { closeouts, closeOutPeriod, isRangeClosed, getCloseoutForRange } = useCloseouts();
  const [showCloseoutConfirm, setShowCloseoutConfirm] = useState(false);
  const [showAlreadyClosed, setShowAlreadyClosed] = useState(false);
  const [closeoutLoading, setCloseoutLoading] = useState(false);
  const [snapshotProofPack, setSnapshotProofPack] = useState<CloseoutSnapshot | null>(null);
  const [detailCloseout, setDetailCloseout] = useState<CloseoutSnapshot | null>(null);

  // Compare state
  const [compareStart1, setCompareStart1] = useState<Date | undefined>();
  const [compareEnd1, setCompareEnd1] = useState<Date | undefined>();
  const [compareStart2, setCompareStart2] = useState<Date | undefined>();
  const [compareEnd2, setCompareEnd2] = useState<Date | undefined>();

  const today = new Date();
  const todayStr = localDateStr(today);
  const todayForRange = useMemo(() => new Date(`${todayStr}T12:00:00`), [todayStr]);

  const dateRange = useMemo(() => {
    if (rangeMode === 'custom' && customStart && customEnd) {
      return { start: localDateStr(customStart), end: localDateStr(customEnd) };
    }
    if (rangeMode === 'pay_period' && hasCustomPayPeriod) {
      return getCustomPayPeriodRange(payPeriodEndDates!, todayForRange);
    }
    if (rangeMode === 'day') return getDayRange();
    if (rangeMode === 'last_week') return getLastWeekRange(weekStartDay);
    if (rangeMode === 'month') return getMonthRange();
    if (rangeMode === 'two_weeks') return getTwoWeekRange(weekStartDay);
    return getWeekRange(weekStartDay);
  }, [rangeMode, customStart, customEnd, hasCustomPayPeriod, payPeriodEndDates, weekStartDay, todayForRange]);

  const report = usePayPeriodReport(dateRange.start, dateRange.end);

  const viewModeLabel = useMemo(() => {
    const s = new Date(dateRange.start + 'T12:00:00');
    const e = new Date(dateRange.end + 'T12:00:00');
    if (dateRange.start === dateRange.end) return format(s, 'MMM d, yyyy');
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`;
  }, [dateRange]);

  const handleCopySummary = async () => {
    const text = generateSummaryText(report);
    await navigator.clipboard.writeText(text);
    toast.success('Summary copied');
  };

  const handleExportCSV = () => {
    const csv = generateLineCSV(report);
    downloadCSV(csv, `ro-lines-${dateRange.start}-to-${dateRange.end}.csv`);
    toast.success('CSV downloaded');
  };

  const rangeTypeForCloseout: CloseoutRangeType = rangeMode === 'pay_period' ? 'pay_period'
    : rangeMode === 'two_weeks' ? 'two_weeks'
    : rangeMode === 'last_week' ? 'last_week'
    : rangeMode === 'month' ? 'month'
    : rangeMode === 'custom' ? 'custom'
    : rangeMode === 'day' ? 'day' : 'week';

  const periodAlreadyClosed = isRangeClosed(dateRange.start, dateRange.end);
  const existingCloseout = getCloseoutForRange(dateRange.start, dateRange.end);

  const rangeEndDate = new Date(dateRange.end + 'T23:59:59');
  const msUntilEnd = rangeEndDate.getTime() - today.getTime();
  const isNearEnd = msUntilEnd >= 0 && msUntilEnd <= 24 * 60 * 60 * 1000;

  const closeoutLabel = rangeMode === 'pay_period' ? 'Close Out Pay Period' : 'Close Out';

  const handleCloseOutClick = () => {
    if (periodAlreadyClosed) {
      setShowAlreadyClosed(true);
    } else {
      setShowCloseoutConfirm(true);
    }
  };

  const handleCloseOut = async () => {
    setCloseoutLoading(true);
    const ok = await closeOutPeriod(report, rangeTypeForCloseout);
    if (ok) {
      await clearFlagsForPeriod(report.rosInRange.map(r => r.id));
      toast.success('Closed out');
    } else {
      toast.error('Failed to close out');
    }
    setCloseoutLoading(false);
    setShowCloseoutConfirm(false);
  };

  const visibleAdvisors = showAllAdvisors ? report.byAdvisor : report.byAdvisor.slice(0, 5);
  const hasMoreAdvisors = report.byAdvisor.length > 5;
  const maxDayHours = Math.max(...report.byDay.map(d => d.totalHours), 1);

  const avgPerRO = report.totalROs > 0 ? Math.round((report.totalHours / report.totalROs) * 10) / 10 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* ══ Sticky Header: Tabs + Range ══ */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/60">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none bg-transparent h-10 gap-0 p-0">
            <TabsTrigger value="summary" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">Summary</TabsTrigger>
            {isPro ? (
              <TabsTrigger value="compare" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">Compare</TabsTrigger>
            ) : (
              <button
                onClick={() => openUpgrade('compare')}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent"
              >
                Compare
                <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  <Crown className="h-2.5 w-2.5" />PRO
                </span>
              </button>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* ══ Content ══ */}
      <div className={cn('flex-1 overflow-y-auto', isMobile && 'pb-32')}>
        {activeTab === 'summary' && (
          <HideTotalsContext.Provider value={hideTotals}>
          <div className="space-y-3">

            {/* ── Alerts: Pay period reminder / Discrepancy ── */}
            {isPro && isNearEnd && !periodAlreadyClosed && (
              <div className="mx-4 mt-3 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/25 dark:border-amber-800/50 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 leading-snug">Pay period ends soon</p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-snug">Close out to lock your hours before the period ends.</p>
                </div>
                <Button size="sm" variant="default" onClick={handleCloseOutClick} className="flex-shrink-0 h-8 text-xs self-start">
                  Close Out
                </Button>
              </div>
            )}

            {periodAlreadyClosed && existingCloseout && Math.abs(report.totalHours - existingCloseout.totals.totalHours) > 0.1 && (
              <div className="mx-4 mt-3 flex gap-3 rounded-2xl border border-yellow-200 bg-yellow-50/70 dark:bg-yellow-950/25 dark:border-yellow-800/50 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 leading-snug">Hours changed since closeout</p>
                  <p className="text-[11px] text-yellow-700/80 dark:text-yellow-400/80 mt-0.5 leading-snug">
                    Snapshot {maskHours(existingCloseout.totals.totalHours, hideTotals)}h → Current {maskHours(report.totalHours, hideTotals)}h
                    {!hideTotals && (
                      <span className="font-semibold ml-1">
                        ({(report.totalHours - existingCloseout.totals.totalHours) > 0 ? '+' : ''}{(report.totalHours - existingCloseout.totals.totalHours).toFixed(1)}h)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* ── Range selector strip ── */}
            <div className="px-4 pt-3">
              <div className="flex items-center gap-2.5">
                <Select value={rangeMode} onValueChange={(v) => { setRangeMode(v); setShowAllAdvisors(false); }}>
                  <SelectTrigger className="w-auto h-8 border border-border/50 bg-card shadow-none focus:ring-1 focus:ring-primary/30 px-3 gap-1 flex-shrink-0 text-xs font-semibold rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="two_weeks">2 Weeks</SelectItem>
                    {hasCustomPayPeriod && <SelectItem value="pay_period">Pay Period</SelectItem>}
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm font-semibold text-foreground truncate flex-1">{viewModeLabel}</span>
                {isPro && (
                  periodAlreadyClosed ? (
                    <button
                      onClick={() => existingCloseout && setDetailCloseout(existingCloseout)}
                      className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2.5 py-1.5 rounded-xl border border-border/50 hover:text-foreground transition-colors"
                    >
                      <Lock className="h-3 w-3" />
                      Closed
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      variant={isNearEnd ? 'default' : 'outline'}
                      onClick={handleCloseOutClick}
                      className="flex-shrink-0 h-8 px-3 text-xs cursor-pointer gap-1 rounded-xl"
                    >
                      <Lock className="h-3 w-3" />
                      {closeoutLabel}
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Custom date pickers */}
            {rangeMode === 'custom' && (
              <div className="px-4 flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left text-xs', !customStart && 'text-muted-foreground')}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {customStart ? format(customStart, 'MMM d, yyyy') : 'Start'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-xs">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left text-xs', !customEnd && 'text-muted-foreground')}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                      {customEnd ? format(customEnd, 'MMM d, yyyy') : 'End'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* ══════════ HERO KPI ══════════ */}
            <div className="px-4">
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>

                {/* Primary zone — subtle tinted header */}
                <div className="px-5 pt-5 pb-4" style={{ background: 'linear-gradient(160deg, hsl(var(--primary) / 0.045) 0%, transparent 55%)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/55 mb-2">Total Hours</div>
                  <div className="flex items-baseline gap-2 mb-5">
                    <span className="text-[52px] font-bold tabular-nums tracking-tight leading-none text-primary font-mono">
                      {maskHours(report.totalHours, hideTotals)}
                    </span>
                    <span className="text-2xl font-bold text-primary/25 font-mono">h</span>
                  </div>

                  {/* Secondary stat grid — 3 distinct KPIs */}
                  <div className="grid grid-cols-3 gap-0 divide-x divide-border/30">
                    <div className="pr-4">
                      <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.09em] mb-0.5">ROs</div>
                      <div className="text-xl font-bold tabular-nums leading-tight">{report.totalROs}</div>
                    </div>
                    <div className="px-4">
                      <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.09em] mb-0.5">Avg / RO</div>
                      <div className="text-xl font-bold tabular-nums leading-tight">
                        {maskHours(avgPerRO, hideTotals)}<span className="text-sm font-normal text-muted-foreground/45">h</span>
                      </div>
                    </div>
                    <div className="pl-4">
                      <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.09em] mb-0.5">Lines</div>
                      <div className="text-xl font-bold tabular-nums leading-tight">{report.totalLines}</div>
                    </div>
                  </div>
                </div>

                {/* Labor type + attention items strip */}
                <div className="border-t border-border/25 px-5 py-3 flex items-center gap-2.5 flex-wrap">
                  {report.byLaborType.length > 0 ? report.byLaborType.map(lt => (
                    <StatusPill key={lt.laborType} type={lt.laborType} hours={lt.totalHours} size="sm" />
                  )) : (
                    <span className="text-[11px] text-muted-foreground/55">No data</span>
                  )}
                  {(report.flaggedCount > 0 || report.tbdLineCount > 0) && (
                    <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                      {report.flaggedCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Flag className="h-3 w-3 text-orange-500" />
                          <span className="text-[11px] font-bold tabular-nums text-orange-500">{report.flaggedCount} flagged</span>
                        </div>
                      )}
                      {report.tbdLineCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span className="text-[11px] font-bold tabular-nums text-amber-500">
                            {report.tbdLineCount} TBD{!hideTotals && ` · ${report.tbdHours.toFixed(1)}h excl.`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Goals + Earnings */}
                {(hoursGoalDaily > 0 || hoursGoalWeekly > 0 || hourlyRate > 0) && (
                  <div className="border-t border-border/25 px-5 py-4 space-y-3">
                    {hoursGoalDaily > 0 && rangeMode === 'day' && (
                      <GoalBar label="Daily Goal" current={report.totalHours} goal={hoursGoalDaily} hide={hideTotals} />
                    )}
                    {hoursGoalWeekly > 0 && rangeMode !== 'day' && (
                      <GoalBar label="Weekly Goal" current={report.totalHours} goal={hoursGoalWeekly} hide={hideTotals} />
                    )}
                    {hourlyRate > 0 && !hideTotals && (
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground/60">Est. Earnings</span>
                        </div>
                        <span className="text-lg font-bold tabular-nums text-green-600">${(report.totalHours * hourlyRate).toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ══════════ BREAKDOWN ══════════ */}
            <SectionDivider>Breakdown</SectionDivider>

            <div className="px-4 space-y-3">

              {/* ── Hours by Day ── */}
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-border/20">
                  <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55">Hours by Day</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/40">{report.byDay.length}d</span>
                </div>
                <div className="divide-y divide-border/20">
                  {report.byDay.map((day) => {
                    const date = new Date(day.date + 'T12:00:00');
                    const isToday = day.date === todayStr;
                    const barWidth = maxDayHours > 0 ? (day.totalHours / maxDayHours) * 100 : 0;
                    const isEmpty = day.totalHours === 0;
                    return (
                      <div
                        key={day.date}
                        className={cn('flex items-center gap-3 px-4 py-2.5', isToday && 'bg-primary/[0.035]', isEmpty && 'opacity-40')}
                      >
                        {/* Day + date */}
                        <div className="flex-shrink-0 w-9 text-left">
                          <div className={cn('text-[10px] font-bold uppercase tracking-wide leading-tight', isToday ? 'text-primary' : 'text-muted-foreground/50')}>
                            {dayNames[date.getDay()]}
                          </div>
                          <div className={cn('text-[15px] font-bold tabular-nums leading-tight', isToday ? 'text-primary' : 'text-foreground/80')}>
                            {date.getDate()}
                          </div>
                        </div>
                        {/* Inline bar */}
                        <div className="flex-1 min-w-0 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', isToday ? 'bg-primary' : 'bg-primary/45')}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        {/* Hours */}
                        <div className="flex-shrink-0 text-right w-12">
                          <span className={cn('text-sm font-bold tabular-nums', isEmpty ? 'text-muted-foreground/30' : isToday ? 'text-primary' : '')}>
                            {maskHours(day.totalHours, hideTotals)}h
                          </span>
                        </div>
                        {/* RO count */}
                        <div className="flex-shrink-0 text-right w-8">
                          <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                            {day.roCount > 0 ? day.roCount : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Footer */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border/20 bg-muted/15">
                  <div className="flex-shrink-0 w-9">
                    <span className="text-[10px] font-bold text-muted-foreground/45 uppercase tracking-wide">Total</span>
                  </div>
                  <div className="flex-1" />
                  <div className="flex-shrink-0 text-right w-12">
                    <span className="text-sm font-bold tabular-nums text-primary">{maskHours(report.totalHours, hideTotals)}h</span>
                  </div>
                  <div className="flex-shrink-0 text-right w-8">
                    <span className="text-[10px] text-muted-foreground/45 tabular-nums">{report.totalROs}</span>
                  </div>
                </div>
              </div>

              {/* ── Hours by Advisor ── */}
              <div className="bg-card rounded-2xl border border-border/50 overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="px-4 pt-3.5 pb-2.5 border-b border-border/20">
                  <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55">Hours by Advisor</span>
                </div>
                {report.byAdvisor.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-muted-foreground/55">No data for this range</div>
                ) : (
                  <>
                    <div className="divide-y divide-border/20">
                      {visibleAdvisors.map((adv, idx) => (
                        <div key={adv.advisor} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex-shrink-0 w-5 text-center">
                            <span className="text-[11px] font-bold text-muted-foreground/25 tabular-nums">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{adv.advisor || '—'}</div>
                            {!hideTotals && (adv.warrantyHours > 0 || adv.customerPayHours > 0 || adv.internalHours > 0) && (
                              <div className="flex gap-2 mt-0.5 flex-wrap">
                                {adv.warrantyHours > 0 && (
                                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'hsl(var(--status-warranty))' }}>
                                    W {adv.warrantyHours.toFixed(1)}h
                                  </span>
                                )}
                                {adv.customerPayHours > 0 && (
                                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'hsl(var(--status-customer-pay))' }}>
                                    CP {adv.customerPayHours.toFixed(1)}h
                                  </span>
                                )}
                                {adv.internalHours > 0 && (
                                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'hsl(var(--status-internal))' }}>
                                    I {adv.internalHours.toFixed(1)}h
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-[10px] text-muted-foreground/45 tabular-nums">{adv.roCount} RO{adv.roCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex-shrink-0 text-right w-12">
                            <span className="text-sm font-bold tabular-nums">{maskHours(adv.totalHours, hideTotals)}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMoreAdvisors && (
                      <button
                        onClick={() => setShowAllAdvisors(!showAllAdvisors)}
                        className="w-full py-2.5 text-[11px] font-semibold text-primary hover:bg-primary/5 transition-colors border-t border-border/20"
                      >
                        {showAllAdvisors ? 'Show less' : `View all ${report.byAdvisor.length} advisors`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Labor Detail (collapsed) ── */}
            <div className="px-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="more" className="bg-card rounded-2xl border border-border/50 overflow-hidden [&>*:last-child]:rounded-b-2xl">
                  <AccordionTrigger className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55 hover:no-underline hover:bg-muted/20 transition-colors [&>svg]:text-muted-foreground/30 [&>svg]:h-3.5 [&>svg]:w-3.5">
                    Labor Detail
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-border/20">
                    <div className="px-4 pb-4 pt-3 space-y-4">
                      {/* Labor Type Breakdown */}
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground/45 uppercase tracking-[0.10em] mb-2">By Labor Type</h4>
                        <div className="divide-y divide-border/20">
                          {report.byLaborType.map(lt => (
                            <div key={lt.laborType} className="flex items-center justify-between py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                                  backgroundColor: lt.laborType === 'warranty'
                                    ? 'hsl(var(--status-warranty))'
                                    : lt.laborType === 'internal'
                                      ? 'hsl(var(--status-internal))'
                                      : 'hsl(var(--status-customer-pay))'
                                }} />
                                <span className="text-sm font-medium">{lt.label}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground/50 tabular-nums">{lt.lineCount} lines</span>
                                <span className="text-sm font-bold tabular-nums">{maskHours(lt.totalHours, hideTotals)}h</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Labor Reference Breakdown */}
                      {report.byLaborRef.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-muted-foreground/45 uppercase tracking-[0.10em] mb-2">By Preset / Reference</h4>
                          <div className="divide-y divide-border/20">
                            {report.byLaborRef.map(r => (
                              <div key={r.referenceId} className="flex items-center justify-between py-2.5">
                                <span className="text-sm font-medium truncate flex-1 mr-3">{r.referenceName}</span>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <span className="text-[10px] text-muted-foreground/50 tabular-nums">{r.lineCount} lines</span>
                                  <span className="text-sm font-bold tabular-nums">{maskHours(r.totalHours, hideTotals)}h</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.flaggedCount > 0 && (
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-orange-200 bg-orange-50/60 dark:bg-orange-950/20 dark:border-orange-800/40">
                          <Flag className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                            {report.flaggedCount} flagged {report.flaggedCount !== 1 ? 'items' : 'item'} in this range
                          </span>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* ══════════ EXPORT & HISTORY ══════════ */}
            <SectionDivider>Export & History</SectionDivider>

            <div className="px-4 space-y-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full h-10 cursor-pointer text-sm gap-2 rounded-xl">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-3.5 w-3.5 ml-auto opacity-40" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isPro && (
                    <>
                      <DropdownMenuItem onClick={() => { setSnapshotProofPack(null); setShowProofPack(true); }}>
                        <FileText className="h-4 w-4 mr-2" />
                        Proof Pack
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleCopySummary}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy summary
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!isPro) {
                      openUpgrade('export');
                      return;
                    }
                    handleExportCSV();
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Lines CSV (paid only)
                    {!isPro && <Lock className="h-3 w-3 ml-auto text-muted-foreground" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-[10px] text-muted-foreground/40 text-center">
                Exports use the selected date range
              </p>
            </div>

            {isPro && (
              <div className="pb-4">
                <ClosedPeriodsList
                  closeouts={closeouts}
                  hideTotals={hideTotals}
                  onViewProofPack={(c) => { setSnapshotProofPack(c); setShowProofPack(true); }}
                  onViewDetail={(c) => setDetailCloseout(c)}
                />
              </div>
            )}
          </div>
          </HideTotalsContext.Provider>
        )}

        {activeTab === 'compare' && isPro && (
          <div className="p-4">
            <HideTotalsContext.Provider value={hideTotals}>
              <MultiPeriodComparison
                weekStartDay={weekStartDay}
                start1={compareStart1} end1={compareEnd1}
                start2={compareStart2} end2={compareEnd2}
                onStart1Change={setCompareStart1} onEnd1Change={setCompareEnd1}
                onStart2Change={setCompareStart2} onEnd2Change={setCompareEnd2}
              />
            </HideTotalsContext.Provider>
          </div>
        )}
      </div>

      <ProofPack
        open={showProofPack}
        onClose={() => { setShowProofPack(false); setSnapshotProofPack(null); }}
        report={snapshotProofPack ? undefined : report}
        snapshot={snapshotProofPack || undefined}
      />

      {/* Closeout Confirm Dialog */}
      <Dialog open={showCloseoutConfirm} onOpenChange={setShowCloseoutConfirm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Close out {viewModeLabel}?</DialogTitle>
            <DialogDescription>
              This freezes your totals as a snapshot — future edits to ROs in this range won't change it.
            </DialogDescription>
          </DialogHeader>

          {(report.tbdLineCount > 0 || report.flaggedCount > 0) && (
            <div className="space-y-2">
              {report.tbdLineCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-semibold">{report.tbdLineCount} TBD {report.tbdLineCount === 1 ? 'line' : 'lines'}</span> will be excluded. Consider resolving them first.
                  </p>
                </div>
              )}
              {report.flaggedCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <Flag className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 leading-relaxed">
                    <span className="font-semibold">{report.flaggedCount} active {report.flaggedCount === 1 ? 'flag' : 'flags'}</span> will be cleared on close out.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCloseoutConfirm(false)}>Cancel</Button>
            <Button onClick={handleCloseOut} disabled={closeoutLoading}>
              {closeoutLoading ? 'Closing…' : 'Close Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Already Closed Dialog */}
      <Dialog open={showAlreadyClosed} onOpenChange={setShowAlreadyClosed}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Already closed</DialogTitle>
            <DialogDescription>
              This period ({viewModeLabel}) is already closed out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAlreadyClosed(false)}>Dismiss</Button>
            <Button onClick={() => { setShowAlreadyClosed(false); if (existingCloseout) setDetailCloseout(existingCloseout); }}>
              View Closeout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Closeout Detail View */}
      {detailCloseout && (
        <CloseoutDetailView
          open={!!detailCloseout}
          onClose={() => setDetailCloseout(null)}
          closeout={detailCloseout}
        />
      )}

      <ProUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} trigger={upgradeTrigger} />
    </div>
  );
}
