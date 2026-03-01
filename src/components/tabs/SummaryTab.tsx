import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import { Download, Copy, FileText, Flag, CalendarIcon, TrendingUp, TrendingDown, Minus, Clock, AlertCircle, ChevronDown, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
import { ClosedPeriodsList } from '@/components/reports/ClosedPeriodsList';
import { CloseoutDetailView } from '@/components/reports/CloseoutDetailView';
import type { CloseoutSnapshot, CloseoutRangeType } from '@/hooks/useCloseouts';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';
import type { DayBreakdown, AdvisorBreakdown } from '@/hooks/usePayPeriodReport';
import type { SummaryRange } from '@/hooks/useUserSettings';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HideTotalsContext = createContext(false);
const useHideTotals = () => useContext(HideTotalsContext);

// ── Date range helpers ────────────────────────────────────
function getDayRange(): { start: string; end: string } {
  const d = new Date();
  const s = localDateStr(d);
  return { start: s, end: s };
}

function getWeekRange(weekStartDay: number): { start: string; end: string } {
  const d = new Date();
  const diff = (d.getDay() - weekStartDay + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: localDateStr(start), end: localDateStr(end) };
}

function getMonthRange(): { start: string; end: string } {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: localDateStr(start), end: localDateStr(end) };
}

function getTwoWeekRange(weekStartDay: number): { start: string; end: string } {
  const d = new Date();
  const diff = (d.getDay() - weekStartDay + 7) % 7;
  const end = new Date(d);
  end.setDate(d.getDate() + (6 - diff));
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  return { start: localDateStr(start), end: localDateStr(end) };
}

// ── Skeleton loaders ──────────────────────────────────────
function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card-mobile p-4 space-y-2">
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
    <div className="card-mobile p-4 space-y-3">
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

// ── Multi-period comparison (Pro only) ────────────────────
function PeriodDatePicker({ label, start, end, onStartChange, onEndChange, color }: {
  label: string; start?: Date; end?: Date;
  onStartChange: (d?: Date) => void; onEndChange: (d?: Date) => void;
  color: string;
}) {
  return (
    <div className="card-mobile p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className={cn('w-3 h-3 rounded-full', color)} />
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left', !start && 'text-muted-foreground')}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {start ? format(start, 'MMM d, yyyy') : 'Start'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={start} onSelect={onStartChange} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground">–</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left', !end && 'text-muted-foreground')}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {end ? format(end, 'MMM d, yyyy') : 'End'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={end} onSelect={onEndChange} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function MultiPeriodComparison({
  start1, end1, start2, end2,
  onStart1Change, onEnd1Change, onStart2Change, onEnd2Change,
}: {
  start1?: Date; end1?: Date; start2?: Date; end2?: Date;
  onStart1Change: (d?: Date) => void; onEnd1Change: (d?: Date) => void;
  onStart2Change: (d?: Date) => void; onEnd2Change: (d?: Date) => void;
}) {
  const range1 = start1 && end1 ? { start: localDateStr(start1), end: localDateStr(end1) } : null;
  const range2 = start2 && end2 ? { start: localDateStr(start2), end: localDateStr(end2) } : null;
  const report1 = usePayPeriodReport(range1?.start || '', range1?.end || '');
  const report2 = usePayPeriodReport(range2?.start || '', range2?.end || '');
  const hasData = range1 && range2;
  const delta = hasData ? report2.totalHours - report1.totalHours : 0;
  const hide = useHideTotals();
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta > 0 ? 'text-green-600 dark:text-green-400' : delta < 0 ? 'text-red-500' : 'text-muted-foreground';
  const deltaBg = delta > 0 ? 'bg-green-100 dark:bg-green-900/30' : delta < 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted';

  const dailyData = useMemo(() => {
    if (!hasData) return [];
    const maxLen = Math.max(report1.byDay.length, report2.byDay.length);
    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      const dayA = report1.byDay[i];
      const dayB = report2.byDay[i];
      const aHours = dayA?.totalHours || 0;
      const bHours = dayB?.totalHours || 0;
      const aDate = dayA ? new Date(dayA.date + 'T12:00:00') : null;
      const bDate = dayB ? new Date(dayB.date + 'T12:00:00') : null;
      const dayLabel = aDate ? dayNames[aDate.getDay()] : bDate ? dayNames[bDate.getDay()] : `Day ${i + 1}`;
      rows.push({ dayLabel, dayIndex: i, periodA: aHours, periodB: bHours, delta: bHours - aHours });
    }
    return rows;
  }, [hasData, report1.byDay, report2.byDay]);

  const totalA = hasData ? report1.totalHours : 0;
  const totalB = hasData ? report2.totalHours : 0;

  return (
    <div className="space-y-4">
      <PeriodDatePicker label="Period A" start={start1} end={end1} onStartChange={onStart1Change} onEndChange={onEnd1Change} color="bg-primary" />
      <PeriodDatePicker label="Period B" start={start2} end={end2} onStartChange={onStart2Change} onEndChange={onEnd2Change} color="bg-violet-500" />
      {!hasData && (
        <div className="card-mobile p-6 text-center text-muted-foreground text-sm">Select both date ranges above to compare periods</div>
      )}
      {hasData && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="card-mobile p-3 text-center border-t-2 border-primary">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1">Period A</div>
              <div className="text-2xl font-bold tabular-nums">{maskHours(report1.totalHours, hide)}<span className="text-lg opacity-60">h</span></div>
              <div className="text-[11px] text-muted-foreground">{report1.totalROs} ROs · {report1.totalLines} lines</div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className={cn('rounded-xl px-3 py-2 flex flex-col items-center', deltaBg)}>
                <DeltaIcon className={cn('h-5 w-5 mb-0.5', deltaColor)} />
                <span className={cn('text-lg font-bold tabular-nums', deltaColor)}>
                  {hide ? '--.-' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}h
                </span>
              </div>
            </div>
            <div className="card-mobile p-3 text-center border-t-2 border-violet-500">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1">Period B</div>
              <div className="text-2xl font-bold tabular-nums">{maskHours(report2.totalHours, hide)}<span className="text-lg opacity-60">h</span></div>
              <div className="text-[11px] text-muted-foreground">{report2.totalROs} ROs · {report2.totalLines} lines</div>
            </div>
          </div>
          <div className="card-mobile p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Daily Hours Comparison</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} barGap={2} barCategoryGap="20%">
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '0.75rem', fontSize: '0.8rem', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string) => [hide ? '--.-h' : `${value.toFixed(1)}h`, name]} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="periodA" name="Period A" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="periodB" name="Period B" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-mobile overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Day</TableHead>
                  <TableHead className="text-xs text-right">Period A</TableHead>
                  <TableHead className="text-xs text-right">Period B</TableHead>
                  <TableHead className="text-xs text-right">Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.map((row) => {
                  const dColor = row.delta > 0 ? 'text-green-600 dark:text-green-400' : row.delta < 0 ? 'text-red-500' : 'text-muted-foreground';
                  const dBg = row.delta > 0 ? 'bg-green-50 dark:bg-green-900/10' : row.delta < 0 ? 'bg-red-50 dark:bg-red-900/10' : '';
                  return (
                    <TableRow key={row.dayIndex}>
                      <TableCell className="text-sm font-medium py-2">{row.dayLabel}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums py-2">{hide ? '--.-h' : `${row.periodA.toFixed(1)}h`}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums py-2">{hide ? '--.-h' : `${row.periodB.toFixed(1)}h`}</TableCell>
                      <TableCell className={cn('text-sm text-right tabular-nums font-semibold py-2 rounded-r', dColor, dBg)}>
                        {hide ? '--.-h' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)}h`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold text-sm py-2">Total</TableCell>
                  <TableCell className="font-bold text-sm text-right tabular-nums py-2">{hide ? '--.-h' : `${totalA.toFixed(1)}h`}</TableCell>
                  <TableCell className="font-bold text-sm text-right tabular-nums py-2">{hide ? '--.-h' : `${totalB.toFixed(1)}h`}</TableCell>
                  <TableCell className={cn('font-bold text-sm text-right tabular-nums py-2', deltaColor, deltaBg, 'rounded-r')}>
                    {hide ? '--.-h' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}h`}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main SummaryTab ───────────────────────────────────────
export function SummaryTab() {
  const isMobile = useIsMobile();
  const { userSettings } = useFlagContext();
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
  const [isLoading, setIsLoading] = useState(false);

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

  const dateRange = useMemo(() => {
    if (rangeMode === 'custom' && customStart && customEnd) {
      return { start: localDateStr(customStart), end: localDateStr(customEnd) };
    }
    if (rangeMode === 'pay_period' && hasCustomPayPeriod) {
      return getCustomPayPeriodRange(payPeriodEndDates!, today);
    }
    if (rangeMode === 'day') return getDayRange();
    if (rangeMode === 'month') return getMonthRange();
    if (rangeMode === 'two_weeks') return getTwoWeekRange(weekStartDay);
    return getWeekRange(weekStartDay);
  }, [rangeMode, todayStr, customStart, customEnd, hasCustomPayPeriod, payPeriodEndDates, weekStartDay]);

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
    setCloseoutLoading(false);
    setShowCloseoutConfirm(false);
    if (ok) toast.success('Closed out');
    else toast.error('Failed to close out');
  };

  // Advisors: show top 5 by default, expand to all
  const visibleAdvisors = showAllAdvisors ? report.byAdvisor : report.byAdvisor.slice(0, 5);
  const hasMoreAdvisors = report.byAdvisor.length > 5;

  // Max hours for day mini-bars
  const maxDayHours = Math.max(...report.byDay.map(d => d.totalHours), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none bg-transparent h-11 gap-0 p-0">
            <TabsTrigger value="summary" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Summary</TabsTrigger>
            {isPro && (
              <TabsTrigger value="compare" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Compare</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-y-auto', isMobile && 'pb-32')}>
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* ── A) Top Controls ────────────────────── */}
            <div className="px-4 pt-3">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Select value={rangeMode} onValueChange={(v) => { setRangeMode(v); setShowAllAdvisors(false); }}>
                  <SelectTrigger className="w-[140px] h-8 border-0 bg-transparent shadow-none focus:ring-0 px-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="two_weeks">2 Weeks</SelectItem>
                    {hasCustomPayPeriod && <SelectItem value="pay_period">Pay Period</SelectItem>}
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <span className="font-semibold text-sm text-muted-foreground truncate">{viewModeLabel}</span>
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

            {/* ── B) KPI Row ─────────────────────────── */}
            <div className="px-4">
              <HideTotalsContext.Provider value={hideTotals}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Total Hours */}
                  <div className="card-mobile p-4 border-l-4 border-l-primary">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Hours</div>
                    <div className="text-3xl font-bold tabular-nums tracking-tight">{maskHours(report.totalHours, hideTotals)}<span className="text-xl ml-0.5 opacity-60">h</span></div>
                    <div className="text-xs text-muted-foreground mt-1">{report.totalROs} ROs · {report.totalLines} lines</div>
                  </div>

                  {/* CP / W / I Breakdown */}
                  <div className="card-mobile p-4">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Type</div>
                    <div className="space-y-1.5">
                      {report.byLaborType.length > 0 ? report.byLaborType.map(lt => (
                        <div key={lt.laborType} className="flex items-center justify-between text-sm">
                          <StatusPill type={lt.laborType} hours={lt.totalHours} size="sm" />
                        </div>
                      )) : (
                        <span className="text-xs text-muted-foreground">No data</span>
                      )}
                    </div>
                  </div>

                  {/* Flagged */}
                  <div className="card-mobile p-4">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flagged</div>
                    <div className="flex items-baseline gap-1.5">
                      <Flag className={cn('h-4 w-4 flex-shrink-0', report.flaggedCount > 0 ? 'text-orange-500' : 'text-muted-foreground/40')} />
                      <span className="text-3xl font-bold tabular-nums">{report.flaggedCount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">items in range</div>
                  </div>

                  {/* TBD */}
                  <div className="card-mobile p-4">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">TBD</div>
                    <div className="flex items-baseline gap-1.5">
                      <Clock className={cn('h-4 w-4 flex-shrink-0', report.tbdLineCount > 0 ? 'text-yellow-500' : 'text-muted-foreground/40')} />
                      <span className="text-3xl font-bold tabular-nums">{report.tbdLineCount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {report.tbdLineCount > 0 ? `${hideTotals ? '--.-' : report.tbdHours.toFixed(1)}h excluded` : 'none excluded'}
                    </div>
                  </div>
                </div>
              </HideTotalsContext.Provider>
            </div>

            {/* ── C) Breakdown Row (2 cards) ─────────── */}
            <div className="px-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Hours by Day */}
              <div className="card-mobile overflow-hidden">
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
              <div className="card-mobile overflow-hidden">
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

            {/* ── D) More Breakdowns (collapsed) ─────── */}
            <div className="px-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="more" className="border rounded-lg bg-card">
                  <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-muted-foreground hover:no-underline">
                    More Breakdowns
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

            {/* ── Close Out Button (all ranges) ──── */}
            <div className="px-4">
              {periodAlreadyClosed ? (
                <div className="flex items-center gap-2 py-2.5 px-3 bg-muted/50 rounded-lg border border-border">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">This period is closed</span>
                  <button
                    onClick={() => existingCloseout && setDetailCloseout(existingCloseout)}
                    className="ml-auto text-xs font-semibold text-primary"
                  >View</button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Button
                    variant={isNearEnd ? 'default' : 'outline'}
                    onClick={handleCloseOutClick}
                    className="w-full h-11 cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                    {closeoutLabel}
                  </Button>
                  {isNearEnd && (
                    <p className="text-[11px] text-muted-foreground text-center">period ending</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Closed Periods List ─────────────────── */}
            <ClosedPeriodsList
              closeouts={closeouts}
              hideTotals={hideTotals}
              onViewProofPack={(c) => { setSnapshotProofPack(c); setShowProofPack(true); }}
              onViewDetail={(c) => setDetailCloseout(c)}
            />

            {/* ── Export + Proof Pack ─────────────────── */}
            <div className="px-4 space-y-3 pt-2 pb-4">
              <Button onClick={() => { setSnapshotProofPack(null); setShowProofPack(true); }} className="w-full h-12 cursor-pointer">
                <FileText className="h-5 w-5" />
                Proof Pack
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={handleCopySummary} className="h-11 cursor-pointer">
                  <Copy className="h-4 w-4" />
                  Copy Summary
                </Button>
                <Button variant="secondary" onClick={handleExportCSV} className="h-11 cursor-pointer">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compare' && isPro && (
          <div className="p-4">
            <HideTotalsContext.Provider value={hideTotals}>
              <MultiPeriodComparison
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
            <DialogTitle>Close out?</DialogTitle>
            <DialogDescription>
              Close out {viewModeLabel}? This freezes totals as a snapshot — future edits to ROs in this range won't change it.
            </DialogDescription>
          </DialogHeader>
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
    </div>
  );
}
