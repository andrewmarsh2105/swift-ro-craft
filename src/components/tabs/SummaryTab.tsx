import { useState, useMemo } from 'react';
import { Download, Copy, FileText, Flag, CalendarIcon, Clock, AlertCircle, ChevronDown, Lock, Target, DollarSign, Crown, TrendingUp } from 'lucide-react';
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

// ── Goal bar (inline, compact) ────────────────────────────
function GoalBar({ label, current, goal, hide }: { label: string; current: number; goal: number; hide: boolean }) {
  const pct = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target className={cn('h-3 w-3', isComplete ? 'text-green-600' : 'text-primary/60')} />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        </div>
        <span className={cn('text-xs font-bold tabular-nums', isComplete ? 'text-green-600' : 'text-foreground')}>
          {hide ? '--.-' : current.toFixed(1)} / {goal}h
          {isComplete && !hide && <span className="ml-1 text-green-600">✓</span>}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', isComplete ? 'bg-green-500' : 'bg-primary')}
          style={{ width: `${hide ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Stat cell for desktop KPI row ─────────────────────────
function StatCell({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">{label}</span>
      <span className={cn('text-lg font-bold tabular-nums font-mono leading-tight', accent && 'text-green-600')}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground/50">{sub}</span>}
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

  const isDesktop = !isMobile;

  // ── Shared sub-components ──────────────────────────────

  const AlertsBlock = () => (
    <>
      {isPro && isNearEnd && !periodAlreadyClosed && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-800 flex-1 leading-snug">
            Pay period ends soon — close out to lock your hours.
          </span>
          <Button size="sm" variant="default" onClick={handleCloseOutClick} className="flex-shrink-0 h-7 text-xs">
            Close Out
          </Button>
        </div>
      )}

      {periodAlreadyClosed && existingCloseout && Math.abs(report.totalHours - existingCloseout.totals.totalHours) > 0.1 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50/80 px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800 leading-snug">
              <span className="font-semibold">Hours changed since closeout.</span>{' '}
              Snapshot: {maskHours(existingCloseout.totals.totalHours, hideTotals)}h →
              Current: {maskHours(report.totalHours, hideTotals)}h
              ({hideTotals ? '±--.-' : `${(report.totalHours - existingCloseout.totals.totalHours) > 0 ? '+' : ''}${(report.totalHours - existingCloseout.totals.totalHours).toFixed(1)}`}h)
            </div>
          </div>
        </div>
      )}
    </>
  );

  const RangeSelector = () => (
    <div className="flex items-center gap-2">
      <Select value={rangeMode} onValueChange={(v) => { setRangeMode(v); setShowAllAdvisors(false); }}>
        <SelectTrigger className="w-auto h-8 border border-border/60 bg-card shadow-none focus:ring-1 focus:ring-primary/30 px-3 gap-1 flex-shrink-0 text-xs font-semibold">
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
      <span className="text-xs font-medium text-muted-foreground truncate flex-1">{viewModeLabel}</span>
      {isPro && (
        periodAlreadyClosed ? (
          <button
            onClick={() => existingCloseout && setDetailCloseout(existingCloseout)}
            className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/80 px-2 py-1 rounded border border-border/60 hover:text-foreground transition-colors"
          >
            <Lock className="h-3 w-3" />
            Closed
          </button>
        ) : (
          <Button
            size="sm"
            variant={isNearEnd ? 'default' : 'outline'}
            onClick={handleCloseOutClick}
            className="flex-shrink-0 h-7 px-2.5 text-xs cursor-pointer gap-1"
          >
            <Lock className="h-3 w-3" />
            {closeoutLabel}
          </Button>
        )
      )}
    </div>
  );

  const CustomDatePickers = () => {
    if (rangeMode !== 'custom') return null;
    return (
      <div className="flex gap-2 items-center">
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
    );
  };

  const HeroKPI = ({ compact }: { compact?: boolean }) => (
    <div className="border border-border/60 bg-card overflow-hidden" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)' }}>
      <div className={cn('px-4 pt-4', compact ? 'pb-2' : 'pb-3')}>
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 mb-1">Total Hours</div>
        <div className="flex items-baseline gap-2">
          <span className={cn('font-bold tabular-nums tracking-tight text-primary leading-none font-mono', compact ? 'text-[36px]' : 'text-[42px]')}>
            {maskHours(report.totalHours, hideTotals)}
          </span>
          <span className="text-lg font-bold text-primary/30 font-mono">h</span>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="px-4 pb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground">{report.totalROs} ROs</span>
          <span className="text-xs text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">{report.totalLines} lines</span>
          <span className="text-xs text-muted-foreground/40">·</span>
          <span className="text-xs font-semibold tabular-nums">{maskHours(avgPerRO, hideTotals)}h avg</span>
        </div>
      </div>

      {/* Status indicators */}
      <div className="border-t border-border/40 px-4 py-2.5 flex items-center gap-2.5 flex-wrap">
        {report.byLaborType.length > 0 ? report.byLaborType.map(lt => (
          <StatusPill key={lt.laborType} type={lt.laborType} hours={lt.totalHours} size="sm" />
        )) : (
          <span className="text-[11px] text-muted-foreground">No type data</span>
        )}

        {(report.flaggedCount > 0 || report.tbdLineCount > 0) && (
          <div className="ml-auto flex items-center gap-2.5 flex-shrink-0">
            {report.flaggedCount > 0 && (
              <div className="flex items-center gap-1">
                <Flag className="h-3 w-3 text-orange-500" />
                <span className="text-[11px] font-bold tabular-nums text-orange-500">{report.flaggedCount}</span>
              </div>
            )}
            {report.tbdLineCount > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span className="text-[11px] font-bold tabular-nums text-amber-500">{report.tbdLineCount}</span>
                {!hideTotals && <span className="text-[10px] text-muted-foreground">({report.tbdHours.toFixed(1)}h excl)</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const GoalsAndEarnings = () => {
    const hasGoals = hoursGoalDaily > 0 || hoursGoalWeekly > 0;
    const hasEarnings = hourlyRate > 0 && !hideTotals;
    if (!hasGoals && !hasEarnings) return null;
    return (
      <div className="border border-border/60 bg-card overflow-hidden px-4 py-3 space-y-2.5" style={{ borderRadius: 'var(--radius)' }}>
        {hoursGoalDaily > 0 && rangeMode === 'day' && (
          <GoalBar label="Daily Goal" current={report.totalHours} goal={hoursGoalDaily} hide={hideTotals} />
        )}
        {hoursGoalWeekly > 0 && rangeMode !== 'day' && (
          <GoalBar label="Weekly Goal" current={report.totalHours} goal={hoursGoalWeekly} hide={hideTotals} />
        )}
        {hasEarnings && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-green-600" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Est. Earnings</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-green-600">${(report.totalHours * hourlyRate).toFixed(0)}</span>
          </div>
        )}
      </div>
    );
  };

  const HoursByDay = () => (
    <div className="border border-border/60 bg-card overflow-hidden" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Hours by Day</span>
        <span className="text-[10px] text-muted-foreground/40">{report.byDay.length} days</span>
      </div>
      <Table>
        <TableBody>
          {report.byDay.map((day) => {
            const date = new Date(day.date + 'T12:00:00');
            const isToday = day.date === todayStr;
            const barWidth = maxDayHours > 0 ? (day.totalHours / maxDayHours) * 100 : 0;
            return (
              <TableRow key={day.date} className={cn('border-border/30', isToday && 'bg-primary/[0.04]')}>
                <TableCell className="py-1.5 pl-4 w-12">
                  <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase">{dayNames[date.getDay()]}</div>
                  <div className={cn('text-sm font-bold tabular-nums', isToday && 'text-primary')}>{date.getDate()}</div>
                </TableCell>
                <TableCell className="py-1.5 pr-2">
                  <div className="relative h-5 flex items-center">
                    <div
                      className={cn('absolute left-0 top-0 h-full rounded-r transition-all', isToday ? 'bg-primary/20' : 'bg-primary/10')}
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="relative z-10 text-xs font-bold tabular-nums ml-1.5">
                      {maskHours(day.totalHours, hideTotals)}h
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-1.5 pr-4 text-right">
                  <span className="text-[10px] text-muted-foreground/60">{day.roCount} RO{day.roCount !== 1 ? 's' : ''}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-border/40">
            <TableCell className="font-bold text-xs py-1.5 pl-4 text-muted-foreground">Total</TableCell>
            <TableCell className="font-bold text-xs tabular-nums py-1.5">{maskHours(report.totalHours, hideTotals)}h</TableCell>
            <TableCell className="text-right text-[10px] text-muted-foreground py-1.5 pr-4">{report.totalROs} ROs</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );

  const HoursByAdvisor = () => (
    <div className="border border-border/60 bg-card overflow-hidden" style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-4 pt-3 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">Hours by Advisor</span>
      </div>
      {report.byAdvisor.length === 0 ? (
        <div className="px-4 pb-3 text-xs text-muted-foreground">No data for this range</div>
      ) : (
        <>
          <Table>
            <TableBody>
              {visibleAdvisors.map((adv) => (
                <TableRow key={adv.advisor} className="border-border/30">
                  <TableCell className="py-2 pl-4">
                    <div className="text-sm font-semibold">{adv.advisor}</div>
                    <div className="flex gap-1.5 mt-0.5">
                      {!hideTotals && adv.warrantyHours > 0 && <span className="text-[10px] text-muted-foreground/60">W:{adv.warrantyHours.toFixed(1)}</span>}
                      {!hideTotals && adv.customerPayHours > 0 && <span className="text-[10px] text-muted-foreground/60">CP:{adv.customerPayHours.toFixed(1)}</span>}
                      {!hideTotals && adv.internalHours > 0 && <span className="text-[10px] text-muted-foreground/60">I:{adv.internalHours.toFixed(1)}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <span className="text-[10px] text-muted-foreground/60">{adv.roCount} ROs</span>
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
              className="w-full py-2 text-[11px] font-semibold text-primary hover:bg-primary/5 transition-colors border-t border-border/40"
            >
              {showAllAdvisors ? 'Show less' : `View all ${report.byAdvisor.length} advisors`}
            </button>
          )}
        </>
      )}
    </div>
  );

  const MoreDetail = () => (
    <Accordion type="single" collapsible>
      <AccordionItem value="more" className="border border-border/60 bg-card overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
        <AccordionTrigger className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:no-underline">
          More Detail
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em]">Hours by Labor Type</h4>
            {report.byLaborType.map(lt => (
              <div key={lt.laborType} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <span className="text-xs text-foreground font-medium">{lt.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">{lt.lineCount} lines</span>
                  <span className="text-xs font-bold tabular-nums">{maskHours(lt.totalHours, hideTotals)}h</span>
                </div>
              </div>
            ))}
          </div>

          {report.byLaborRef.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em]">By Reference / Preset</h4>
              {report.byLaborRef.map(r => (
                <div key={r.referenceId} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs text-foreground font-medium">{r.referenceName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{r.lineCount} lines</span>
                    <span className="text-xs font-bold tabular-nums">{maskHours(r.totalHours, hideTotals)}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.flaggedCount > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-orange-200 bg-orange-50/80">
              <Flag className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
              <span className="text-xs font-medium text-orange-800">{report.flaggedCount} flagged item{report.flaggedCount !== 1 ? 's' : ''} in this range</span>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const ExportBlock = () => (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn('h-10 cursor-pointer text-sm gap-2', isDesktop ? 'w-auto' : 'w-full')}>
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
      <p className="text-[10px] text-muted-foreground/60 text-center">
        Exports use the selected range · CSV excludes TBD lines
      </p>
    </div>
  );

  // ── Desktop two-column layout ──────────────────────────

  const renderDesktopSummary = () => (
    <HideTotalsContext.Provider value={hideTotals}>
      <div className="desktop-sections p-5">
        {/* Alerts */}
        <AlertsBlock />

        {/* Range selector */}
        <RangeSelector />
        <CustomDatePickers />

        {/* ── Two-column grid: KPI left, breakdowns right ── */}
        <div className="grid grid-cols-[1fr_1fr] gap-4 items-start">

          {/* LEFT COLUMN: KPI + Goals + Export */}
          <div className="space-y-3">
            <HeroKPI />

            <GoalsAndEarnings />

            {/* Desktop: inline secondary stats row */}
            {(hourlyRate > 0 || report.totalROs > 0) && (
              <div className="flex items-center gap-4 px-1">
                <StatCell label="ROs" value={String(report.totalROs)} sub={`${report.totalLines} lines`} />
                <StatCell label="Avg / RO" value={`${maskHours(avgPerRO, hideTotals)}h`} />
                {hourlyRate > 0 && !hideTotals && (
                  <StatCell label="Est. Earnings" value={`$${(report.totalHours * hourlyRate).toFixed(0)}`} accent />
                )}
              </div>
            )}

            {/* Export + History grouped together on desktop */}
            <div className="flex items-center gap-2 pt-1">
              <ExportBlock />
            </div>
          </div>

          {/* RIGHT COLUMN: Breakdowns + Detail */}
          <div className="space-y-3">
            <HoursByDay />
            <HoursByAdvisor />
            <MoreDetail />
          </div>
        </div>

        {/* Closed periods — full width below */}
        {isPro && (
          <ClosedPeriodsList
            closeouts={closeouts}
            hideTotals={hideTotals}
            onViewProofPack={(c) => { setSnapshotProofPack(c); setShowProofPack(true); }}
            onViewDetail={(c) => setDetailCloseout(c)}
          />
        )}
      </div>
    </HideTotalsContext.Provider>
  );

  // ── Mobile single-column layout (preserved) ────────────

  const renderMobileSummary = () => (
    <HideTotalsContext.Provider value={hideTotals}>
      <div className="space-y-3">

        <AlertsBlock />

        {/* Range selector */}
        <div className="px-4 pt-3">
          <RangeSelector />
        </div>

        <div className="px-4">
          <CustomDatePickers />
        </div>

        {/* Hero KPI with goals inside */}
        <div className="px-4">
          <HeroKPI />
        </div>

        {/* Goals (mobile: separate card) */}
        <div className="px-4">
          <GoalsAndEarnings />
        </div>

        {/* Breakdowns */}
        <div className="px-4 space-y-3">
          <HoursByDay />
          <HoursByAdvisor />
        </div>

        {/* More detail */}
        <div className="px-4">
          <MoreDetail />
        </div>

        {/* Export & History */}
        <div className="px-4 space-y-2">
          <ExportBlock />
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
  );

  return (
    <div className="flex flex-col h-full">
      {/* ══ Sticky Header: Tabs + Range ══ */}
      <div className="panel-header">
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
          isDesktop ? renderDesktopSummary() : renderMobileSummary()
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
