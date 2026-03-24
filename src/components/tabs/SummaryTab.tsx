import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import { Download, Copy, FileText, Flag, CalendarIcon, TrendingUp, TrendingDown, Minus, Clock, AlertCircle, ChevronDown, Lock, Target, DollarSign, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
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
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
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
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { ClosedPeriodsList } from '@/components/reports/ClosedPeriodsList';
import { CloseoutDetailView } from '@/components/reports/CloseoutDetailView';
import type { CloseoutSnapshot, CloseoutRangeType } from '@/hooks/useCloseouts';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';
import type { DayBreakdown, AdvisorBreakdown } from '@/hooks/usePayPeriodReport';
import type { SummaryRange } from '@/hooks/useUserSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

function getLastWeekRange(weekStartDay: number): { start: string; end: string } {
  const d = new Date();
  const diff = (d.getDay() - weekStartDay + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff - 7);
  const end = new Date(d);
  end.setDate(d.getDate() - diff - 1);
  return { start: localDateStr(start), end: localDateStr(end) };
}

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

// ── Multi-period comparison (Pro only) ────────────────────
function PeriodDatePicker({ label, start, end, onStartChange, onEndChange, accentClass, accentStyle }: {
  label: string; start?: Date; end?: Date;
  onStartChange: (d?: Date) => void; onEndChange: (d?: Date) => void;
  accentClass?: string; accentStyle?: React.CSSProperties;
}) {
  return (
    <div className="card-mobile p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', accentClass)} style={accentStyle} />
        <span className="text-xs font-semibold">{label}</span>
        {start && end && (
          <span className="text-[11px] text-muted-foreground ml-auto">{format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}</span>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left text-xs', !start && 'text-muted-foreground')}>
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {start ? format(start, 'MMM d') : 'Start date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={start} onSelect={onStartChange} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground text-xs">to</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left text-xs', !end && 'text-muted-foreground')}>
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {end ? format(end, 'MMM d') : 'End date'}
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
  weekStartDay,
  start1, end1, start2, end2,
  onStart1Change, onEnd1Change, onStart2Change, onEnd2Change,
}: {
  weekStartDay: number;
  start1?: Date; end1?: Date; start2?: Date; end2?: Date;
  onStart1Change: (d?: Date) => void; onEnd1Change: (d?: Date) => void;
  onStart2Change: (d?: Date) => void; onEnd2Change: (d?: Date) => void;
}) {
  // Quick preset helpers
  const applyPreset = useCallback((preset: 'this-vs-last-week' | 'this-vs-last-month' | 'today-vs-yesterday') => {
    const now = new Date();
    if (preset === 'this-vs-last-week') {
      const diff = (now.getDay() - weekStartDay + 7) % 7;
      const thisStart = new Date(now); thisStart.setDate(now.getDate() - diff);
      const thisEnd = new Date(thisStart); thisEnd.setDate(thisStart.getDate() + 6);
      const lastStart = new Date(thisStart); lastStart.setDate(thisStart.getDate() - 7);
      const lastEnd = new Date(thisEnd); lastEnd.setDate(thisEnd.getDate() - 7);
      onStart1Change(lastStart); onEnd1Change(lastEnd);
      onStart2Change(thisStart); onEnd2Change(thisEnd);
    } else if (preset === 'this-vs-last-month') {
      const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      onStart1Change(lastStart); onEnd1Change(lastEnd);
      onStart2Change(thisStart); onEnd2Change(thisEnd);
    } else {
      const today = new Date(now); today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      onStart1Change(yesterday); onEnd1Change(yesterday);
      onStart2Change(today); onEnd2Change(today);
    }
  }, [weekStartDay, onStart1Change, onEnd1Change, onStart2Change, onEnd2Change]);

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
      const aDateFmt = aDate ? format(aDate, 'MMM d') : null;
      const bDateFmt = bDate ? format(bDate, 'MMM d') : null;
      rows.push({ dayLabel, dayIndex: i, periodA: aHours, periodB: bHours, delta: bHours - aHours, aDateFmt, bDateFmt });
    }
    return rows;
  }, [hasData, report1.byDay, report2.byDay]);

  const maxHours = useMemo(() => Math.max(...dailyData.map(r => Math.max(r.periodA, r.periodB)), 1), [dailyData]);
  const totalA = hasData ? report1.totalHours : 0;
  const totalB = hasData ? report2.totalHours : 0;

  return (
    <div className="space-y-3">
      {/* Quick presets */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => applyPreset('this-vs-last-week')}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground quiet-transition">
          This vs Last Week
        </button>
        <button onClick={() => applyPreset('this-vs-last-month')}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground quiet-transition">
          This vs Last Month
        </button>
        <button onClick={() => applyPreset('today-vs-yesterday')}
          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground quiet-transition">
          Today vs Yesterday
        </button>
      </div>

      {/* Period pickers */}
      <PeriodDatePicker label="Period A" start={start1} end={end1} onStartChange={onStart1Change} onEndChange={onEnd1Change} accentClass="bg-primary" />
      <PeriodDatePicker label="Period B" start={start2} end={end2} onStartChange={onStart2Change} onEndChange={onEnd2Change} accentStyle={{ backgroundColor: 'hsl(var(--chart-period-b))' }} />

      {!hasData && (
        <div className="card-mobile p-8 flex flex-col items-center gap-2 text-center">
          <CalendarIcon className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Select two date ranges to compare</p>
          <p className="text-xs text-muted-foreground/70">Or pick a quick preset above</p>
        </div>
      )}

      {hasData && (
        <>
          {/* Summary hero row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card-mobile p-3 text-center space-y-0.5 border-l-4 border-primary bg-gradient-to-b from-primary/[0.1] to-card">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Period A</div>
              {start1 && end1 && (
                <div className="text-[9px] text-muted-foreground/60">{format(start1, 'MMM d')}–{format(end1, 'MMM d')}</div>
              )}
              <div className="text-2xl font-bold tabular-nums leading-tight">
                {maskHours(report1.totalHours, hide)}<span className="text-base font-semibold opacity-50">h</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{report1.totalROs} ROs · {report1.totalLines} lines</div>
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
              <div className={cn('rounded-2xl px-3 py-2.5 flex flex-col items-center w-full', deltaBg)}>
                <DeltaIcon className={cn('h-4 w-4', deltaColor)} />
                <span className={cn('text-base font-extrabold tabular-nums mt-0.5', deltaColor)}>
                  {hide ? '--.-' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}h
                </span>
                <span className={cn('text-[10px] font-medium', deltaColor)}>
                  {delta > 0 ? 'more' : delta < 0 ? 'less' : 'same'}
                </span>
              </div>
            </div>
            <div className="card-mobile p-3 text-center space-y-0.5 border-l-4 bg-gradient-to-b from-accent/45 to-card" style={{ borderLeftColor: 'hsl(var(--chart-period-b))' }}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Period B</div>
              {start2 && end2 && (
                <div className="text-[9px] text-muted-foreground/60">{format(start2, 'MMM d')}–{format(end2, 'MMM d')}</div>
              )}
              <div className="text-2xl font-bold tabular-nums leading-tight">
                {maskHours(report2.totalHours, hide)}<span className="text-base font-semibold opacity-50">h</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{report2.totalROs} ROs · {report2.totalLines} lines</div>
            </div>
          </div>

          {/* Chart */}
          <div className="card-mobile p-4 bg-gradient-to-b from-card to-secondary/25">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Daily Hours Comparison</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} barGap={3} barCategoryGap="25%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={26} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    contentStyle={{ borderRadius: '0.75rem', fontSize: '0.8rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
                    formatter={(value: number, name: string) => [hide ? '--.-h' : `${value.toFixed(1)}h`, name]}
                    labelFormatter={(_label, payload) => {
                      if (!payload || payload.length === 0) return _label;
                      const d = payload[0]?.payload;
                      const parts = [d?.aDateFmt && `A: ${d.aDateFmt}`, d?.bDateFmt && `B: ${d.bDateFmt}`].filter(Boolean);
                      return parts.join('  ·  ') || _label;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.7rem', paddingTop: '8px' }} />
                  <Bar dataKey="periodA" name="Period A" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="periodB" name="Period B" fill="hsl(var(--chart-period-b))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Day-by-day breakdown — proper table layout */}
          <div className="card-mobile overflow-hidden bg-gradient-to-b from-card to-secondary/25">
            {/* Column headers */}
            <div className="grid items-center px-4 py-2 border-b-2 border-border bg-secondary/80 gap-2"
              style={{ gridTemplateColumns: '2.25rem 1fr 3rem 3rem 3.5rem' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trend</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary text-right">A</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'hsl(var(--chart-period-b))' }}>B</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Delta</div>
            </div>

            <div className="divide-y divide-border/40">
              {dailyData.map((row, idx) => {
                const dColor = row.delta > 0 ? 'text-green-600 dark:text-green-400' : row.delta < 0 ? 'text-red-500' : 'text-muted-foreground';
                const dBg = row.delta > 0 ? 'bg-green-50 dark:bg-green-900/20' : row.delta < 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-muted/40';
                const aWidth = maxHours > 0 ? (row.periodA / maxHours) * 100 : 0;
                const bWidth = maxHours > 0 ? (row.periodB / maxHours) * 100 : 0;
                return (
                  <div key={row.dayIndex}
                    className={cn('grid items-center px-4 py-2.5 gap-2', idx % 2 !== 0 && 'bg-muted/20')}
                    style={{ gridTemplateColumns: '2.25rem 1fr 3rem 3rem 3.5rem' }}>
                    {/* Day label */}
                    <div className="flex-shrink-0">
                      <span className="text-sm font-bold">{row.dayLabel}</span>
                    </div>
                    {/* Stacked mini bars */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${aWidth}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'hsl(var(--chart-period-b))' }} />
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${bWidth}%`, backgroundColor: 'hsl(var(--chart-period-b))' }} />
                        </div>
                      </div>
                    </div>
                    {/* Period A value */}
                    <div className="text-right">
                      <span className="text-xs font-semibold tabular-nums text-primary">
                        {hide ? '--' : `${row.periodA.toFixed(1)}h`}
                      </span>
                    </div>
                    {/* Period B value */}
                    <div className="text-right">
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'hsl(var(--chart-period-b))' }}>
                        {hide ? '--' : `${row.periodB.toFixed(1)}h`}
                      </span>
                    </div>
                    {/* Delta pill */}
                    <div className="flex justify-end">
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums whitespace-nowrap', dBg, dColor)}>
                        {hide ? '--' : `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)}h`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total row */}
            <div className="grid items-center px-4 py-3 border-t-2 border-border gap-2 bg-muted/40"
              style={{ gridTemplateColumns: '2.25rem 1fr 3rem 3rem 3.5rem' }}>
              <div>
                <span className="text-xs font-black uppercase tracking-wide">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-period-b))' }} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black tabular-nums text-primary">
                  {hide ? '--' : `${totalA.toFixed(1)}h`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black tabular-nums" style={{ color: 'hsl(var(--chart-period-b))' }}>
                  {hide ? '--' : `${totalB.toFixed(1)}h`}
                </span>
              </div>
              <div className="flex justify-end">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-black tabular-nums whitespace-nowrap', deltaBg, deltaColor)}>
                  {hide ? '--' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}h`}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
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

            {/* ── B) KPI Row ─────────────────────────── */}
            <div className="px-4">
              <HideTotalsContext.Provider value={hideTotals}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Total Hours */}
                  <div className="card-mobile p-4 border-l-4 border-l-primary bg-primary/[0.06] shadow-sm">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Hours</div>
                    <div className="text-4xl font-extrabold tabular-nums tracking-tight text-primary">{maskHours(report.totalHours, hideTotals)}<span className="text-xl ml-0.5 opacity-60">h</span></div>
                    <div className="text-xs text-muted-foreground mt-1">{report.totalROs} ROs · {report.totalLines} lines</div>
                  </div>

                  {/* Avg Hours / RO */}
                  <div className="card-mobile p-4 border border-border/70">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Avg Hours / RO</div>
                    <div className="text-3xl font-bold tabular-nums tracking-tight">
                      {report.totalROs > 0 ? maskHours(Math.round((report.totalHours / report.totalROs) * 10) / 10, hideTotals) : '0'}<span className="text-xl ml-0.5 opacity-60">h</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">per repair order</div>
                  </div>

                  {/* CP / W / I Breakdown */}
                  <div className="card-mobile p-4 border border-border/70">
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
                  <div className="card-mobile p-4 border border-orange-300/50 bg-orange-500/[0.06]">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flagged</div>
                    <div className="flex items-baseline gap-1.5">
                      <Flag className={cn('h-4 w-4 flex-shrink-0', report.flaggedCount > 0 ? 'text-orange-500' : 'text-muted-foreground/40')} />
                      <span className="text-3xl font-bold tabular-nums">{report.flaggedCount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">items in range</div>
                  </div>

                  {/* TBD */}
                  <div className="card-mobile p-4 border border-yellow-300/50 bg-yellow-500/[0.06]">
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

                {/* Hours Goal Progress + Earnings */}
                {(hoursGoalDaily > 0 || hoursGoalWeekly > 0 || hourlyRate > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
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
              </HideTotalsContext.Provider>
            </div>

            {/* ── C) Breakdown Row (2 cards) ─────────── */}
            <div className="px-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
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

            {/* ── Closed Periods List ─────────────────── */}
            {isPro && (
            <ClosedPeriodsList
              closeouts={closeouts}
              hideTotals={hideTotals}
              onViewProofPack={(c) => { setSnapshotProofPack(c); setShowProofPack(true); }}
              onViewDetail={(c) => setDetailCloseout(c)}
            />
            )}

            {/* ── Export Menu (single button) ─────────────────── */}
            <div className="px-4 space-y-2 pt-2 pb-4">
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
