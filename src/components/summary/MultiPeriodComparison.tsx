import { useMemo, useCallback } from 'react';
import { CalendarIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { usePayPeriodReport } from '@/hooks/usePayPeriodReport';
import { localDateStr } from '@/lib/utils';
import { maskHours } from '@/lib/maskHours';
import { cn } from '@/lib/utils';
import { useHideTotals } from '@/contexts/HideTotalsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

interface MultiPeriodComparisonProps {
  weekStartDay: number;
  start1?: Date; end1?: Date; start2?: Date; end2?: Date;
  onStart1Change: (d?: Date) => void; onEnd1Change: (d?: Date) => void;
  onStart2Change: (d?: Date) => void; onEnd2Change: (d?: Date) => void;
}

export function MultiPeriodComparison({
  weekStartDay,
  start1, end1, start2, end2,
  onStart1Change, onEnd1Change, onStart2Change, onEnd2Change,
}: MultiPeriodComparisonProps) {
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
  const isMobile = useIsMobile();
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
  const tableColumns = isMobile
    ? '2.25rem 1fr 3rem 3rem 3.5rem'
    : '3rem 1fr 4.5rem 4.5rem 5rem';

  return (
    <div className="space-y-3">
      {/* Quick presets */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => applyPreset('this-vs-last-week')}
          className="tap-target flex items-center justify-center text-[11px] font-bold px-2 rounded-xl bg-secondary border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary text-foreground quiet-transition text-center leading-tight">
          This vs Last Week
        </button>
        <button onClick={() => applyPreset('this-vs-last-month')}
          className="tap-target flex items-center justify-center text-[11px] font-bold px-2 rounded-xl bg-secondary border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary text-foreground quiet-transition text-center leading-tight">
          This vs Last Month
        </button>
        <button onClick={() => applyPreset('today-vs-yesterday')}
          className="tap-target flex items-center justify-center text-[11px] font-bold px-2 rounded-xl bg-secondary border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary text-foreground quiet-transition text-center leading-tight">
          Today vs Yesterday
        </button>
      </div>

      {/* Period pickers */}
      <div className={isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-2'}>
        <PeriodDatePicker label="Period A" start={start1} end={end1} onStartChange={onStart1Change} onEndChange={onEnd1Change} accentClass="bg-primary" />
        <PeriodDatePicker label="Period B" start={start2} end={end2} onStartChange={onStart2Change} onEndChange={onEnd2Change} accentStyle={{ backgroundColor: 'hsl(var(--chart-period-b))' }} />
      </div>

      {!hasData && (
        <div className={cn('card-mobile p-8 flex flex-col items-center gap-2 text-center', !isMobile && 'max-w-sm mx-auto')}>
          <CalendarIcon className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Select two date ranges to compare</p>
          <p className="text-xs text-muted-foreground/70">Or pick a quick preset above</p>
        </div>
      )}

      {hasData && (
        <>
          {/* Summary hero row */}
          <div className="grid grid-cols-3 gap-2">
            <div className={cn('card-mobile text-center space-y-0.5 border-l-4 border-primary bg-gradient-to-b from-primary/[0.1] to-card', isMobile ? 'p-3' : 'p-4')}>
              <div className="text-[10px] font-bold text-primary uppercase tracking-wide">Period A</div>
              {start1 && end1 && (
                <div className="text-[9px] text-muted-foreground/60">{format(start1, 'MMM d')}–{format(end1, 'MMM d')}</div>
              )}
              <div className={cn('font-bold tabular-nums leading-tight', isMobile ? 'text-2xl' : 'text-3xl')}>
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
            <div className={cn('card-mobile text-center space-y-0.5 border-l-4 to-card', isMobile ? 'p-3' : 'p-4')} style={{ borderLeftColor: 'hsl(var(--chart-period-b))', background: 'linear-gradient(to bottom, hsl(var(--chart-period-b) / 0.12), hsl(var(--card)))' }}>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--chart-period-b))' }}>Period B</div>
              {start2 && end2 && (
                <div className="text-[9px] text-muted-foreground/60">{format(start2, 'MMM d')}–{format(end2, 'MMM d')}</div>
              )}
              <div className={cn('font-bold tabular-nums leading-tight', isMobile ? 'text-2xl' : 'text-3xl')}>
                {maskHours(report2.totalHours, hide)}<span className="text-base font-semibold opacity-50">h</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{report2.totalROs} ROs · {report2.totalLines} lines</div>
            </div>
          </div>

          {/* Chart */}
          <div className="card-mobile p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Daily Hours Comparison</h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                  <span className="text-[11px] font-semibold text-muted-foreground">Period A</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-period-b))' }} />
                  <span className="text-[11px] font-semibold text-muted-foreground">Period B</span>
                </div>
              </div>
            </div>
            <div className={isMobile ? 'h-64' : 'h-80'}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} barGap={4} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))', strokeOpacity: 0.6 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', radius: 6, opacity: 0.6 }}
                    contentStyle={{ borderRadius: '0.75rem', fontSize: '0.8rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', boxShadow: '0 4px 12px -4px hsl(220 20% 10% / 0.15)' }}
                    formatter={(value: number, name: string) => [hide ? '--.-h' : `${value.toFixed(1)}h`, name]}
                    labelFormatter={(_label, payload) => {
                      if (!payload || payload.length === 0) return _label;
                      const d = payload[0]?.payload;
                      const parts = [d?.aDateFmt && `A: ${d.aDateFmt}`, d?.bDateFmt && `B: ${d.bDateFmt}`].filter(Boolean);
                      return parts.join('  ·  ') || _label;
                    }}
                  />
                  <Bar dataKey="periodA" name="Period A" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="periodB" name="Period B" fill="hsl(var(--chart-period-b))" radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Day-by-day breakdown */}
          <div className="card-mobile overflow-hidden bg-gradient-to-b from-card to-secondary/25">
            {/* Column headers */}
            <div className={cn('grid items-center py-2 border-b-2 border-border bg-secondary/80 gap-2', isMobile ? 'px-4' : 'px-6')}
              style={{ gridTemplateColumns: tableColumns }}>
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
                    className={cn('grid items-center py-2.5 gap-2', idx % 2 !== 0 && 'bg-muted/20', isMobile ? 'px-4' : 'px-6')}
                    style={{ gridTemplateColumns: tableColumns }}>
                    <div className="flex-shrink-0">
                      <span className="text-sm font-bold">{row.dayLabel}</span>
                    </div>
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
                    <div className="text-right">
                      <span className="text-xs font-semibold tabular-nums text-primary">
                        {hide ? '--' : `${row.periodA.toFixed(1)}h`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'hsl(var(--chart-period-b))' }}>
                        {hide ? '--' : `${row.periodB.toFixed(1)}h`}
                      </span>
                    </div>
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
            <div className={cn('grid items-center py-3 border-t-2 border-border gap-2 bg-muted/40', isMobile ? 'px-4' : 'px-6')}
              style={{ gridTemplateColumns: tableColumns }}>
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
