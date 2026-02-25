import { useState, useMemo, createContext, useContext } from 'react';
import { Download, Copy, FileText, AlertTriangle, Flag, CalendarIcon, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';
import type { DayBreakdown, AdvisorBreakdown } from '@/hooks/usePayPeriodReport';
import type { SummaryRange } from '@/hooks/useUserSettings';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HideTotalsContext = createContext(false);
const useHideTotals = () => useContext(HideTotalsContext);

function getWeekRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: fmt(start), end: fmt(end) };
}

function getTwoWeekRange(date: Date): { start: string; end: string } {
  const end = new Date(date);
  end.setDate(end.getDate() - end.getDay() + 7);
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  return { start: fmt(start), end: fmt(end) };
}

function DaySummaryCard({ summary, isToday }: { summary: DayBreakdown; isToday?: boolean }) {
  const hide = useHideTotals();
  const date = new Date(summary.date + 'T12:00:00');
  const dayName = dayNames[date.getDay()];
  const dayNum = date.getDate();

  return (
    <div className={cn('card-mobile p-4 flex items-center gap-4 transition-shadow duration-200', isToday && 'ring-2 ring-primary shadow-raised')}>
      <div className="text-center w-10 flex-shrink-0">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{dayName}</div>
        <div className="text-2xl font-bold tabular-nums leading-tight">{dayNum}</div>
      </div>
      <div className="w-px h-10 bg-border flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{maskHours(summary.totalHours, hide)}h</span>
          <span className="text-[13px] text-muted-foreground">{summary.roCount} RO{summary.roCount !== 1 ? 's' : ''}</span>
        </div>
        {summary.totalHours > 0 && !hide && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {summary.warrantyHours > 0 && <StatusPill type="warranty" hours={summary.warrantyHours} size="sm" />}
            {summary.customerPayHours > 0 && <StatusPill type="customer-pay" hours={summary.customerPayHours} size="sm" />}
            {summary.internalHours > 0 && <StatusPill type="internal" hours={summary.internalHours} size="sm" />}
          </div>
        )}
      </div>
    </div>
  );
}

function AdvisorCard({ summary }: { summary: AdvisorBreakdown }) {
  const hide = useHideTotals();
  return (
    <div className="card-mobile p-4 flex items-center justify-between w-full">
      <div>
        <div className="font-semibold text-[15px]">{summary.advisor}</div>
        <div className="text-[13px] text-muted-foreground">{summary.roCount} RO{summary.roCount !== 1 ? 's' : ''}</div>
        <div className="flex gap-2 mt-1 text-[11px] font-medium text-muted-foreground">
          {!hide && summary.warrantyHours > 0 && <span>W: {summary.warrantyHours.toFixed(1)}</span>}
          {!hide && summary.customerPayHours > 0 && <span>CP: {summary.customerPayHours.toFixed(1)}</span>}
          {!hide && summary.internalHours > 0 && <span>Int: {summary.internalHours.toFixed(1)}</span>}
        </div>
      </div>
      <span className="hours-pill text-base tabular-nums">{maskHours(summary.totalHours, hide)}h</span>
    </div>
  );
}

function WeekBlock({ days, label, todayStr }: { days: DayBreakdown[]; label: string; todayStr: string }) {
  const hide = useHideTotals();
  const weekTotal = days.reduce((s, d) => s + d.totalHours, 0);
  const visibleDays = days.filter(d => d.totalHours > 0 || d.date === todayStr);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{label}</h4>
        <span className="text-sm font-bold">{maskHours(weekTotal, hide)}h</span>
      </div>
      {visibleDays.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">No entries</p>
      ) : (
        visibleDays.map(summary => (
          <DaySummaryCard key={summary.date} summary={summary} isToday={summary.date === todayStr} />
        ))
      )}
    </div>
  );
}

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
  const range1 = start1 && end1
    ? { start: localDateStr(start1), end: localDateStr(end1) }
    : null;
  const range2 = start2 && end2
    ? { start: localDateStr(start2), end: localDateStr(end2) }
    : null;

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
      rows.push({
        dayLabel,
        dayIndex: i,
        aDate: dayA?.date,
        bDate: dayB?.date,
        periodA: aHours,
        periodB: bHours,
        delta: bHours - aHours,
      });
    }
    return rows;
  }, [hasData, report1.byDay, report2.byDay]);

  const totalA = hasData ? report1.totalHours : 0;
  const totalB = hasData ? report2.totalHours : 0;

  return (
    <div className="space-y-4">
      {/* Date Pickers */}
      <PeriodDatePicker label="Period A" start={start1} end={end1} onStartChange={onStart1Change} onEndChange={onEnd1Change} color="bg-primary" />
      <PeriodDatePicker label="Period B" start={start2} end={end2} onStartChange={onStart2Change} onEndChange={onEnd2Change} color="bg-violet-500" />

      {!hasData && (
        <div className="card-mobile p-6 text-center text-muted-foreground text-sm">
          Select both date ranges above to compare periods
        </div>
      )}

      {hasData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card-mobile p-3 text-center border-t-2 border-primary">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1">Period A</div>
              <div className="text-2xl font-bold tabular-nums">{maskHours(report1.totalHours, hide)}<span className="text-lg opacity-60">h</span></div>
              <div className="text-[11px] text-muted-foreground">{report1.totalROs} ROs · {report1.totalLines} lines</div>
              {!hide && <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {report1.byLaborType.map(lt => (
                  <span key={lt.laborType} className="px-1.5 py-0.5 bg-primary/10 rounded-full text-[10px] font-medium text-primary">
                    {lt.label.slice(0, 1)}: {lt.totalHours.toFixed(1)}
                  </span>
                ))}
              </div>}
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
              {!hide && <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {report2.byLaborType.map(lt => (
                  <span key={lt.laborType} className="px-1.5 py-0.5 bg-violet-500/10 rounded-full text-[10px] font-medium text-violet-600 dark:text-violet-400">
                    {lt.label.slice(0, 1)}: {lt.totalHours.toFixed(1)}
                  </span>
                ))}
              </div>}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="card-mobile p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Daily Hours Comparison</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} barGap={2} barCategoryGap="20%">
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: '0.75rem', fontSize: '0.8rem', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string) => [hide ? '--.-h' : `${value.toFixed(1)}h`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Bar dataKey="periodA" name="Period A" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="periodB" name="Period B" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Breakdown Table */}
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

          {/* Labor Type Breakdown */}
          <div className="card-mobile p-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">By Labor Type</span>
            {['Warranty', 'Customer Pay', 'Internal'].map((label, i) => {
              const key = ['warranty', 'customer-pay', 'internal'][i];
              const a = report1.byLaborType.find(lt => lt.laborType === key)?.totalHours || 0;
              const b = report2.byLaborType.find(lt => lt.laborType === key)?.totalHours || 0;
              const d = a - b;
              if (a === 0 && b === 0) return null;
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span>{hide ? '--.-' : a.toFixed(1)}h</span>
                    {!hide && <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded',
                      d > 0 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' :
                      d < 0 ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-muted-foreground')}>
                      {d > 0 ? '+' : ''}{d.toFixed(1)}
                    </span>}
                    <span>{hide ? '--.-' : b.toFixed(1)}h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function SummaryTab() {
  const isMobile = useIsMobile();
  const { userSettings } = useFlagContext();
  const { isPro } = useSubscription();
  const hideTotals = userSettings.hideTotals ?? false;

  // Determine initial range selection from settings
  const payPeriodType = userSettings.payPeriodType || 'week';
  const payPeriodEndDates = userSettings.payPeriodEndDates;
  const hasCustomPayPeriod = payPeriodType === 'custom' && payPeriodEndDates && payPeriodEndDates.length > 0;

  const [rangeMode, setRangeMode] = useState<string>(() => {
    if (payPeriodType === 'two_weeks') return 'two_weeks';
    if (payPeriodType === 'custom' && hasCustomPayPeriod) return 'pay_period';
    return 'week';
  });
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [showProofPack, setShowProofPack] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Multi-period comparison state (Pro only)
  const [compareStart1, setCompareStart1] = useState<Date | undefined>();
  const [compareEnd1, setCompareEnd1] = useState<Date | undefined>();
  const [compareStart2, setCompareStart2] = useState<Date | undefined>();
  const [compareEnd2, setCompareEnd2] = useState<Date | undefined>();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const dateRange = useMemo(() => {
    if (rangeMode === 'custom' && customStart && customEnd) {
      return { start: localDateStr(customStart), end: localDateStr(customEnd) };
    }
    if (rangeMode === 'pay_period' && hasCustomPayPeriod) {
      return getCustomPayPeriodRange(payPeriodEndDates!, today);
    }
    if (rangeMode === 'two_weeks') return getTwoWeekRange(today);
    return getWeekRange(today);
  }, [rangeMode, todayStr, customStart, customEnd, hasCustomPayPeriod, payPeriodEndDates]);

  const report = usePayPeriodReport(dateRange.start, dateRange.end);

  // Split days into two week blocks for biweekly
  const weekBlocks = useMemo(() => {
    if (rangeMode !== 'two_weeks') return null;
    const midpoint = new Date(dateRange.start);
    midpoint.setDate(midpoint.getDate() + 7);
    const midStr = midpoint.toISOString().split('T')[0];
    const week1 = report.byDay.filter(d => d.date < midStr);
    const week2 = report.byDay.filter(d => d.date >= midStr);

    const w1Start = new Date(dateRange.start + 'T12:00:00');
    const w1End = new Date(midpoint);
    w1End.setDate(w1End.getDate() - 1);
    const w2End = new Date(dateRange.end + 'T12:00:00');

    return {
      week1: { days: week1, label: `Week 1 (${format(w1Start, 'MMM d')} – ${format(w1End, 'MMM d')})` },
      week2: { days: week2, label: `Week 2 (${format(midpoint, 'MMM d')} – ${format(w2End, 'MMM d')})` },
    };
  }, [rangeMode, report.byDay, dateRange]);

  const viewModeLabel = useMemo(() => {
    const s = new Date(dateRange.start + 'T12:00:00');
    const e = new Date(dateRange.end + 'T12:00:00');
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

  const rangeTotalLabel = rangeMode === 'two_weeks' ? '2-Week Total'
    : rangeMode === 'pay_period' ? 'Pay Period Total'
    : rangeMode === 'custom' ? 'Total'
    : 'Week Total';

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header with Tabs */}
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

      {/* Tab Content */}
      <div className={cn('flex-1 overflow-y-auto', isMobile && 'pb-32')}>
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Date Range Header */}
            <div className="px-4 pt-3">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Select value={rangeMode} onValueChange={setRangeMode}>
                  <SelectTrigger className="w-[140px] h-8 border-0 bg-transparent shadow-none focus:ring-0 px-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">1 Week</SelectItem>
                    <SelectItem value="two_weeks">2 Weeks</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    {hasCustomPayPeriod && (
                      <SelectItem value="pay_period">Pay Period</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <span className="font-semibold text-sm text-muted-foreground">{viewModeLabel}</span>
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

            {/* Main Summary Content */}
            <div className="px-4 space-y-4">
              {/* Total Card */}
              <div className="bg-primary text-primary-foreground rounded-2xl p-5" style={{ boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.5)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary-foreground/80 text-sm font-semibold uppercase tracking-wide">
                    {rangeTotalLabel}
                  </span>
                  <span className="text-xs text-primary-foreground/65 font-medium">
                    {report.totalROs} ROs · {report.totalLines} lines
                    {report.tbdLineCount > 0 && ` · ${report.tbdLineCount} TBD`}
                  </span>
                </div>
                <div className="text-5xl font-bold tabular-nums mb-3 tracking-tight">{maskHours(report.totalHours, hideTotals)}<span className="text-3xl ml-1 opacity-80">h</span></div>
                {report.tbdLineCount > 0 && (
                  <div className="text-xs text-primary-foreground/65 mb-2 font-medium">
                    ⏳ {report.tbdLineCount} TBD lines ({hideTotals ? '--.-' : report.tbdHours.toFixed(1)}h) not counted
                  </div>
                )}
                {!hideTotals && (
                <div className="flex flex-wrap gap-2">
                  {report.byLaborType.map(lt => (
                    <span key={lt.laborType} className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold">
                      {lt.label}: {lt.totalHours.toFixed(1)}h
                    </span>
                  ))}
                </div>
                )}
              </div>

              {/* Warnings */}
              {(report.missingHoursCount > 0 || report.flaggedCount > 0) && (
                <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-1">
                  {report.missingHoursCount > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      <span>{report.missingHoursCount} lines with missing hours</span>
                    </div>
                  )}
                  {report.flaggedCount > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Flag className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span>{report.flaggedCount} flagged items</span>
                    </div>
                  )}
                </div>
              )}

              {/* Day summaries */}
              {weekBlocks ? (
                <HideTotalsContext.Provider value={hideTotals}>
                  <WeekBlock days={weekBlocks.week1.days} label={weekBlocks.week1.label} todayStr={todayStr} />
                  <WeekBlock days={weekBlocks.week2.days} label={weekBlocks.week2.label} todayStr={todayStr} />
                  <div className="bg-muted/50 rounded-xl p-3 flex justify-between items-center">
                    <span className="font-semibold text-sm text-muted-foreground uppercase">Grand Total (2 Weeks)</span>
                    <span className="text-lg font-bold">{maskHours(report.totalHours, hideTotals)}h</span>
                  </div>
                </HideTotalsContext.Provider>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">Daily Breakdown</h3>
                  <HideTotalsContext.Provider value={hideTotals}>
                  {report.byDay.filter(s => s.totalHours > 0 || s.date === todayStr).map((summary) => (
                    <DaySummaryCard key={summary.date} summary={summary} isToday={summary.date === todayStr} />
                  ))}
                  </HideTotalsContext.Provider>
                </div>
              )}

              {/* Advisor Summary */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">By Advisor</h3>
                {report.byAdvisor.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1">No data</p>
                ) : (
                  <HideTotalsContext.Provider value={hideTotals}>
                  {report.byAdvisor.map((summary) => (
                    <AdvisorCard key={summary.advisor} summary={summary} />
                  ))}
                  </HideTotalsContext.Provider>
                )}
              </div>

              {/* By Labor Reference */}
              {report.byLaborRef.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">By Labor Reference</h3>
                  {report.byLaborRef.map(r => (
                    <div key={r.referenceId} className="card-mobile p-3 flex justify-between items-center">
                      <span className="text-sm font-medium">{r.referenceName}</span>
                      <span className="text-sm font-bold">{maskHours(r.totalHours, hideTotals)}h <span className="text-muted-foreground font-normal">({r.lineCount})</span></span>
                    </div>
                  ))}
                </div>
              )}

              {/* Export + Proof Pack Buttons */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => setShowProofPack(true)}
                  className="w-full h-12 cursor-pointer"
                >
                  <FileText className="h-5 w-5" />
                  Proof Pack
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleCopySummary}
                    className="h-11 cursor-pointer"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Summary
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExportCSV}
                    className="h-11 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
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

      {/* Proof Pack */}
      <ProofPack open={showProofPack} onClose={() => setShowProofPack(false)} report={report} />
    </div>
  );
}
