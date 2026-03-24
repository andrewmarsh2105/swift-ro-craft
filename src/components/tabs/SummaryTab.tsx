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
import { Table, TableBody, TableFooter, TableRow, TableCell } from '@/components/ui/table';
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

// ── Skeleton loaders ──────────────────────────────────────
function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card-mobile p-4 space-y-2 bg-gradient-to-b from-card to-secondary/35">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function BreakdownSkeleton() {
  return (
    <div className="card-mobile p-4 space-y-3 bg-gradient-to-b from-card to-secondary/35">
      <Skeleton className="h-4 w-28" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-4">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

// ── Goal Progress Card ─────────────────────────────────────
function GoalProgressCard({ label, current, goal, hide }: { label: string; current: number; goal: number; hide: boolean }) {
  const pct = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;
  return (
    <div className="card-mobile p-4 bg-gradient-to-b from-card to-secondary/25">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className={cn('h-4 w-4', isComplete ? 'text-green-600 dark:text-green-400' : 'text-primary')} />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">
          {hide ? '--.-' : current.toFixed(1)} / {goal}h
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', isComplete ? 'bg-green-500' : 'bg-primary')}
          style={{ width: `${hide ? 0 : pct}%` }}
        />
      </div>
      {isComplete && !hide && (
        <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1.5">Goal reached!</p>
      )}
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

  // Smart emphasis: is today within last 24h of range end?
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
      // Clear all active flags for ROs in this period (silently, in bulk)
      await clearFlagsForPeriod(report.rosInRange.map(r => r.id));
      toast.success('Closed out');
    } else {
      toast.error('Failed to close out');
    }
    setCloseoutLoading(false);
    setShowCloseoutConfirm(false);
  };

  // Advisors: show top 5 by default, expand to all
  const visibleAdvisors = showAllAdvisors ? report.byAdvisor : report.byAdvisor.slice(0, 5);
  const hasMoreAdvisors = report.byAdvisor.length > 5;

  // Max hours for day mini-bars
  const maxDayHours = Math.max(...report.byDay.map(d => d.totalHours), 1);

  return (
    <div className="flex flex-col h-full bg-accent/[0.12]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/80">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none bg-transparent h-11 gap-0 p-0">
            <TabsTrigger value="summary" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Summary</TabsTrigger>
            {isPro ? (
              <TabsTrigger value="compare" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Compare</TabsTrigger>
            ) : (
              <button
                onClick={() => openUpgrade('compare')}
                className="flex-1 flex items-center justify-center gap-1.5 h-11 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent"
              >
                Compare
                <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  <Crown className="h-2.5 w-2.5" />
                  PRO
                </span>
              </button>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-y-auto', isMobile && 'pb-32')}>
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* ── Pay Period Reminder Banner ──────── */}
            {isPro && isNearEnd && !periodAlreadyClosed && (
              <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200 flex-1">
                  ⚠️ Your pay period ends soon — close it out to lock in your hours.
                </span>
                <Button size="sm" variant="default" onClick={handleCloseOutClick} className="flex-shrink-0">
                  Close Out Now
                </Button>
              </div>
            )}

            {/* ── Payroll Discrepancy Alert ───────── */}
            {periodAlreadyClosed && existingCloseout && Math.abs(report.totalHours - existingCloseout.totals.totalHours) > 0.1 && (
              <div className="mx-4 mt-3 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="font-medium">⚠️ Your hours have changed since this period was closed.</span>
                    <span className="ml-1">
                      Snapshot: {maskHours(existingCloseout.totals.totalHours, hideTotals)}h · Current: {maskHours(report.totalHours, hideTotals)}h · Difference: {hideTotals ? '±--.-' : `${(report.totalHours - existingCloseout.totals.totalHours) > 0 ? '+' : ''}${(report.totalHours - existingCloseout.totals.totalHours).toFixed(1)}`}h
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── A) Top Controls ────────────────────── */}
            <div className="px-4 pt-3">
              <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-soft">
                <Select value={rangeMode} onValueChange={(v) => { setRangeMode(v); setShowAllAdvisors(false); }}>
                  <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent shadow-none focus:ring-0 px-0 flex-shrink-0">
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
                <span className="font-semibold text-sm text-foreground/80 truncate flex-1">{viewModeLabel}</span>
                {isPro && (
                  periodAlreadyClosed ? (
                    <button
                      onClick={() => existingCloseout && setDetailCloseout(existingCloseout)}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border hover:text-foreground transition-colors"
                    >
                      <Lock className="h-3 w-3" />
                      Closed
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      variant={isNearEnd ? 'default' : 'outline'}
                      onClick={handleCloseOutClick}
                      className="flex-shrink-0 h-7 px-2.5 text-xs cursor-pointer"
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
                    <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left', !customStart && 'text-muted-foreground')}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customStart ? format(customStart, 'MMM d, yyyy') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left', !customEnd && 'text-muted-foreground')}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customEnd ? format(customEnd, 'MMM d, yyyy') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* ── B) KPI ─────────────────────────── */}
            <HideTotalsContext.Provider value={hideTotals}>
            <div className="px-4 space-y-3">
              {/* Hero row: Total Hours (dominant) + Avg/RO (secondary) */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-3 card-mobile p-4 border-l-4 border-l-primary bg-primary/[0.06] shadow-sm">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Hours</div>
                  <div className="text-4xl font-extrabold tabular-nums tracking-tight text-primary leading-none">{maskHours(report.totalHours, hideTotals)}<span className="text-xl ml-0.5 opacity-60">h</span></div>
                  <div className="text-xs text-muted-foreground mt-1.5">{report.totalROs} ROs · {report.totalLines} lines</div>
                </div>
                <div className="col-span-2 card-mobile p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Avg / RO</div>
                  <div className="text-2xl font-bold tabular-nums tracking-tight leading-none">
                    {report.totalROs > 0 ? maskHours(Math.round((report.totalHours / report.totalROs) * 10) / 10, hideTotals) : '0'}<span className="text-base ml-0.5 opacity-60">h</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">per RO</div>
                </div>
              </div>

              {/* Compact status bar: By Type | Flagged | TBD */}
              <div className="card-mobile p-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                  {report.byLaborType.length > 0 ? report.byLaborType.map(lt => (
                    <StatusPill key={lt.laborType} type={lt.laborType} hours={lt.totalHours} size="sm" />
                  )) : (
                    <span className="text-xs text-muted-foreground">No type data</span>
                  )}
                </div>
                <div className="h-4 w-px bg-border/60 flex-shrink-0" />
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Flag className={cn('h-3.5 w-3.5 flex-shrink-0', report.flaggedCount > 0 ? 'text-orange-500' : 'text-muted-foreground/30')} />
                    <span className={cn('text-sm font-bold tabular-nums', report.flaggedCount > 0 ? 'text-orange-500' : 'text-muted-foreground/40')}>{report.flaggedCount}</span>
                    <span className="text-xs text-muted-foreground">flagged</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className={cn('h-3.5 w-3.5 flex-shrink-0', report.tbdLineCount > 0 ? 'text-yellow-500' : 'text-muted-foreground/30')} />
                    <span className={cn('text-sm font-bold tabular-nums', report.tbdLineCount > 0 ? 'text-yellow-500' : 'text-muted-foreground/40')}>{report.tbdLineCount}</span>
                    <span className="text-xs text-muted-foreground">
                      {report.tbdLineCount > 0 && !hideTotals ? `TBD · ${report.tbdHours.toFixed(1)}h excl.` : 'TBD'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hours Goal Progress + Earnings */}
              {(hoursGoalDaily > 0 || hoursGoalWeekly > 0 || hourlyRate > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {hoursGoalDaily > 0 && rangeMode === 'day' && (
                    <GoalProgressCard
                      label="Daily Goal"
                      current={report.totalHours}
                      goal={hoursGoalDaily}
                      hide={hideTotals}
                    />
                  )}
                  {hoursGoalWeekly > 0 && rangeMode !== 'day' && (
                    <GoalProgressCard
                      label="Weekly Goal"
                      current={report.totalHours}
                      goal={hoursGoalWeekly}
                      hide={hideTotals}
                    />
                  )}
                  {hourlyRate > 0 && !hideTotals && (
                    <div className="card-mobile p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Est. Earnings</div>
                        <div className="text-xl font-bold tabular-nums">${(report.totalHours * hourlyRate).toFixed(0)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </HideTotalsContext.Provider>

            {/* ── C) Breakdown ─────────────────────── */}
            <SectionLabel>Breakdown</SectionLabel>
            <div className="px-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Hours by Day */}
              <div className="card-mobile overflow-hidden bg-gradient-to-b from-card to-secondary/25">
                <div className="px-4 pt-3 pb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hours by Day</h3>
                </div>
                <Table>
                  <TableBody>
                    {report.byDay.map((day) => {
                      const date = new Date(day.date + 'T12:00:00');
                      const isToday = day.date === todayStr;
                      const barWidth = maxDayHours > 0 ? (day.totalHours / maxDayHours) * 100 : 0;
                      return (
                        <TableRow key={day.date} className={cn(isToday && 'bg-primary/5')}>
                          <TableCell className="py-2 pl-4 w-16">
                            <div className="text-xs font-semibold text-muted-foreground">{dayNames[date.getDay()]}</div>
                            <div className="text-sm font-bold tabular-nums">{date.getDate()}</div>
                          </TableCell>
                          <TableCell className="py-2 pr-2">
                            <div className="relative h-5 flex items-center">
                              <div
                                className="absolute left-0 top-0 h-full rounded-r bg-primary/15 transition-all"
                                style={{ width: `${barWidth}%` }}
                              />
                              <span className="relative z-10 text-sm font-semibold tabular-nums ml-1.5">
                                {maskHours(day.totalHours, hideTotals)}h
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 pr-4 text-right">
                            <span className="text-xs text-muted-foreground">{day.roCount} RO{day.roCount !== 1 ? 's' : ''}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-bold text-sm py-2 pl-4">Total</TableCell>
                      <TableCell className="font-bold text-sm tabular-nums py-2">{maskHours(report.totalHours, hideTotals)}h</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground py-2 pr-4">{report.totalROs} ROs</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Hours by Advisor */}
              <div className="card-mobile overflow-hidden bg-gradient-to-b from-card to-secondary/25">
                <div className="px-4 pt-3 pb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hours by Advisor</h3>
                </div>
                {report.byAdvisor.length === 0 ? (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">No data</div>
                ) : (
                  <>
                    <Table>
                      <TableBody>
                        {visibleAdvisors.map((adv) => (
                          <TableRow key={adv.advisor}>
                            <TableCell className="py-2 pl-4">
                              <div className="text-sm font-medium">{adv.advisor}</div>
                              <div className="flex gap-1.5 mt-0.5">
                                {!hideTotals && adv.warrantyHours > 0 && <span className="text-[10px] font-medium text-muted-foreground">W:{adv.warrantyHours.toFixed(1)}</span>}
                                {!hideTotals && adv.customerPayHours > 0 && <span className="text-[10px] font-medium text-muted-foreground">CP:{adv.customerPayHours.toFixed(1)}</span>}
                                {!hideTotals && adv.internalHours > 0 && <span className="text-[10px] font-medium text-muted-foreground">I:{adv.internalHours.toFixed(1)}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <span className="text-xs text-muted-foreground">{adv.roCount} ROs</span>
                            </TableCell>
                            <TableCell className="py-2 pr-4 text-right">
                              <span className="text-sm font-bold tabular-nums">{maskHours(adv.totalHours, hideTotals)}h</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {hasMoreAdvisors && (
                      <button
                        onClick={() => setShowAllAdvisors(!showAllAdvisors)}
                        className="w-full py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors border-t border-border"
                      >
                        {showAllAdvisors ? 'Show less' : `View all ${report.byAdvisor.length} advisors`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── D) More Detail (collapsed) ─────── */}
            <div className="px-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="more" className="border rounded-lg bg-card">
                  <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-muted-foreground hover:no-underline">
                    More Detail
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {/* Labor Type Breakdown */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hours by Labor Type</h4>
                      {report.byLaborType.map(lt => (
                        <div key={lt.laborType} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <span className="text-sm text-foreground">{lt.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{lt.lineCount} lines</span>
                            <span className="text-sm font-bold tabular-nums">{maskHours(lt.totalHours, hideTotals)}h</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Labor Reference Breakdown */}
                    {report.byLaborRef.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By Reference / Preset</h4>
                        {report.byLaborRef.map(r => (
                          <div key={r.referenceId} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                            <span className="text-sm text-foreground">{r.referenceName}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{r.lineCount} lines</span>
                              <span className="text-sm font-bold tabular-nums">{maskHours(r.totalHours, hideTotals)}h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Flagged summary */}
                    {report.flaggedCount > 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                        <Flag className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <span className="text-sm">{report.flaggedCount} flagged item{report.flaggedCount !== 1 ? 's' : ''} in this range</span>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* ── Export & History ─────────────────────────── */}
            <SectionLabel>Export & History</SectionLabel>

            {/* Export Menu */}
            <div className="px-4 space-y-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="w-full h-12 cursor-pointer">
                    <Download className="h-5 w-5" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
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
              <p className="text-[11px] text-muted-foreground text-center">
                Exports use the selected range. CSV excludes TBD lines.
              </p>
            </div>

            {/* Closed Periods */}
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

          {/* Warnings: TBDs and Flags */}
          {(report.tbdLineCount > 0 || report.flaggedCount > 0) && (
            <div className="space-y-2">
              {report.tbdLineCount > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2.5">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <span className="font-semibold">{report.tbdLineCount} TBD {report.tbdLineCount === 1 ? 'line' : 'lines'}</span> in this period will be excluded from the snapshot. Consider resolving them first.
                  </p>
                </div>
              )}
              {report.flaggedCount > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-2.5">
                  <Flag className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                    <span className="font-semibold">{report.flaggedCount} active {report.flaggedCount === 1 ? 'flag' : 'flags'}</span> on ROs in this period will be cleared when you close out.
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
