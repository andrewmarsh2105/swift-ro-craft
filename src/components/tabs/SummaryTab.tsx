import { useState, useMemo } from 'react';
import { Download, Copy, FileText, AlertTriangle, Flag, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFlagContext } from '@/contexts/FlagContext';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { StatusPill } from '@/components/mobile/StatusPill';
import { ProofPack } from '@/components/reports/ProofPack';
import { usePayPeriodReport } from '@/hooks/usePayPeriodReport';
import { generateLineCSV, generateSummaryText, downloadCSV } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import type { DayBreakdown, AdvisorBreakdown } from '@/hooks/usePayPeriodReport';
import type { SummaryRange } from '@/hooks/useUserSettings';

type ViewMode = 'default' | 'custom';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  end.setDate(end.getDate() - end.getDay() + 7); // end of current week (Sun)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  return { start: fmt(start), end: fmt(end) };
}

function DaySummaryCard({ summary, isToday }: { summary: DayBreakdown; isToday?: boolean }) {
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
          <span className="text-2xl font-bold tabular-nums">{summary.totalHours.toFixed(1)}h</span>
          <span className="text-[13px] text-muted-foreground">{summary.roCount} RO{summary.roCount !== 1 ? 's' : ''}</span>
        </div>
        {summary.totalHours > 0 && (
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
  return (
    <div className="card-mobile p-4 flex items-center justify-between w-full">
      <div>
        <div className="font-semibold text-[15px]">{summary.advisor}</div>
        <div className="text-[13px] text-muted-foreground">{summary.roCount} RO{summary.roCount !== 1 ? 's' : ''}</div>
        <div className="flex gap-2 mt-1 text-[11px] font-medium text-muted-foreground">
          {summary.warrantyHours > 0 && <span>W: {summary.warrantyHours.toFixed(1)}</span>}
          {summary.customerPayHours > 0 && <span>CP: {summary.customerPayHours.toFixed(1)}</span>}
          {summary.internalHours > 0 && <span>Int: {summary.internalHours.toFixed(1)}</span>}
        </div>
      </div>
      <span className="hours-pill text-base tabular-nums">{summary.totalHours.toFixed(1)}h</span>
    </div>
  );
}

function WeekBlock({ days, label, todayStr }: { days: DayBreakdown[]; label: string; todayStr: string }) {
  const weekTotal = days.reduce((s, d) => s + d.totalHours, 0);
  const visibleDays = days.filter(d => d.totalHours > 0 || d.date === todayStr);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{label}</h4>
        <span className="text-sm font-bold">{weekTotal.toFixed(1)}h</span>
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

export function SummaryTab() {
  const isMobile = useIsMobile();
  const { userSettings } = useFlagContext();
  const defaultRange: SummaryRange = userSettings.defaultSummaryRange || 'week';

  const [rangeOverride, setRangeOverride] = useState<'default' | 'week' | 'two_weeks' | 'custom'>('default');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [showProofPack, setShowProofPack] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const effectiveRange = rangeOverride === 'default' ? defaultRange : rangeOverride;

  const dateRange = useMemo(() => {
    if (effectiveRange === 'custom' && customStart && customEnd) {
      return { start: customStart.toISOString().split('T')[0], end: customEnd.toISOString().split('T')[0] };
    }
    if (effectiveRange === 'two_weeks') return getTwoWeekRange(today);
    return getWeekRange(today);
  }, [effectiveRange, todayStr, customStart, customEnd]);

  const report = usePayPeriodReport(dateRange.start, dateRange.end);

  // Split days into two week blocks for biweekly
  const weekBlocks = useMemo(() => {
    if (effectiveRange !== 'two_weeks') return null;
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
  }, [effectiveRange, report.byDay, dateRange]);

  const viewModeLabel = useMemo(() => {
    if (effectiveRange === 'custom' && customStart && customEnd) {
      return `${format(customStart, 'MMM d')} – ${format(customEnd, 'MMM d')}`;
    }
    if (effectiveRange === 'two_weeks') {
      const s = new Date(dateRange.start + 'T12:00:00');
      const e = new Date(dateRange.end + 'T12:00:00');
      return `${format(s, 'MMM d')} – ${format(e, 'MMM d')} (2 Weeks)`;
    }
    const s = new Date(dateRange.start + 'T12:00:00');
    const e = new Date(dateRange.end + 'T12:00:00');
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`;
  }, [effectiveRange, dateRange, customStart, customEnd]);

  const segmentValue = rangeOverride === 'default'
    ? (defaultRange === 'two_weeks' ? 'two_weeks' : 'week')
    : rangeOverride;

  const handleSegmentChange = (v: string) => {
    if (v === 'week') setRangeOverride(defaultRange === 'week' ? 'default' : 'week');
    else if (v === 'two_weeks') setRangeOverride(defaultRange === 'two_weeks' ? 'default' : 'two_weeks');
    else setRangeOverride(v as any);
  };

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

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border space-y-3">
        <SegmentedControl
          options={[
            { value: 'week', label: '1 Week' },
            { value: 'two_weeks', label: '2 Weeks' },
            { value: 'custom', label: 'Custom' },
          ]}
          value={segmentValue}
          onChange={handleSegmentChange}
        />
        {effectiveRange === 'custom' && (
          <div className="flex gap-2 items-center">
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
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">{viewModeLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-y-auto p-4 space-y-4', isMobile && 'pb-32')}>
        {/* Total Card — solid primary fill, strong hierarchy */}
        <div className="bg-primary text-primary-foreground rounded-2xl p-5" style={{ boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.5)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary-foreground/80 text-sm font-semibold uppercase tracking-wide">
              {effectiveRange === 'two_weeks' ? '2-Week Total' : effectiveRange === 'custom' ? 'Total' : 'Week Total'}
            </span>
            <span className="text-xs text-primary-foreground/65 font-medium">
              {report.totalROs} ROs · {report.totalLines} lines
              {report.tbdLineCount > 0 && ` · ${report.tbdLineCount} TBD`}
            </span>
          </div>
          <div className="text-5xl font-bold tabular-nums mb-3 tracking-tight">{report.totalHours.toFixed(1)}<span className="text-3xl ml-1 opacity-80">h</span></div>
          {report.tbdLineCount > 0 && (
            <div className="text-xs text-primary-foreground/65 mb-2 font-medium">
              ⏳ {report.tbdLineCount} TBD lines ({report.tbdHours.toFixed(1)}h) not counted
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {report.byLaborType.map(lt => (
              <span key={lt.laborType} className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold">
                {lt.label}: {lt.totalHours.toFixed(1)}h
              </span>
            ))}
          </div>
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
          <>
            <WeekBlock days={weekBlocks.week1.days} label={weekBlocks.week1.label} todayStr={todayStr} />
            <WeekBlock days={weekBlocks.week2.days} label={weekBlocks.week2.label} todayStr={todayStr} />
            <div className="bg-muted/50 rounded-xl p-3 flex justify-between items-center">
              <span className="font-semibold text-sm text-muted-foreground uppercase">Grand Total (2 Weeks)</span>
              <span className="text-lg font-bold">{report.totalHours.toFixed(1)}h</span>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">Daily Breakdown</h3>
            {report.byDay.filter(s => s.totalHours > 0 || s.date === todayStr).map((summary) => (
              <DaySummaryCard key={summary.date} summary={summary} isToday={summary.date === todayStr} />
            ))}
          </div>
        )}

        {/* Advisor Summary */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">By Advisor</h3>
          {report.byAdvisor.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">No data</p>
          ) : (
            report.byAdvisor.map((summary) => (
              <AdvisorCard key={summary.advisor} summary={summary} />
            ))
          )}
        </div>

        {/* By Labor Reference */}
        {report.byLaborRef.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide px-1">By Labor Reference</h3>
            {report.byLaborRef.map(r => (
              <div key={r.referenceId} className="card-mobile p-3 flex justify-between items-center">
                <span className="text-sm font-medium">{r.referenceName}</span>
                <span className="text-sm font-bold">{r.totalHours.toFixed(1)}h <span className="text-muted-foreground font-normal">({r.lineCount})</span></span>
              </div>
            ))}
          </div>
        )}

        {/* Export + Proof Pack Buttons */}
        <div className="space-y-3 pt-4">
          <button
            onClick={() => setShowProofPack(true)}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <FileText className="h-5 w-5" />
            Proof Pack
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopySummary}
              className="py-3 bg-secondary rounded-xl font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <Copy className="h-4 w-4" />
              Copy Summary
            </button>
            <button
              onClick={handleExportCSV}
              className="py-3 bg-secondary rounded-xl font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Proof Pack */}
      <ProofPack open={showProofPack} onClose={() => setShowProofPack(false)} report={report} />
    </div>
  );
}
