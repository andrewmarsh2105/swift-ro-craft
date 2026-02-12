import { useState, useMemo } from 'react';
import { Download, Copy, Filter, ChevronRight, FileText, AlertTriangle, Flag } from 'lucide-react';
import { useRO } from '@/contexts/ROContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { StatusPill } from '@/components/mobile/StatusPill';
import { Chip } from '@/components/mobile/Chip';
import { ProofPack } from '@/components/reports/ProofPack';
import { usePayPeriodReport } from '@/hooks/usePayPeriodReport';
import { generateLineCSV, generateSummaryText, downloadCSV } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { DayBreakdown, AdvisorBreakdown } from '@/hooks/usePayPeriodReport';

type ViewMode = 'day' | 'week' | 'month';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function getMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function DaySummaryCard({ summary, isToday }: { summary: DayBreakdown; isToday?: boolean }) {
  const date = new Date(summary.date);
  const dayName = dayNames[date.getDay()];
  const dayNum = date.getDate();

  return (
    <div className={cn('card-mobile p-4 flex items-center gap-4', isToday && 'ring-2 ring-primary')}>
      <div className="text-center w-12 flex-shrink-0">
        <div className="text-xs text-muted-foreground uppercase">{dayName}</div>
        <div className="text-2xl font-bold">{dayNum}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{summary.totalHours.toFixed(1)}h</span>
          <span className="text-sm text-muted-foreground">{summary.roCount} ROs</span>
        </div>
        {summary.totalHours > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
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
        <div className="font-semibold text-lg">{summary.advisor}</div>
        <div className="text-sm text-muted-foreground">{summary.roCount} ROs</div>
        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
          {summary.warrantyHours > 0 && <span>W:{summary.warrantyHours.toFixed(1)}</span>}
          {summary.customerPayHours > 0 && <span>CP:{summary.customerPayHours.toFixed(1)}</span>}
          {summary.internalHours > 0 && <span>Int:{summary.internalHours.toFixed(1)}</span>}
        </div>
      </div>
      <span className="text-xl font-bold text-primary">{summary.totalHours.toFixed(1)}h</span>
    </div>
  );
}

export function SummaryTab() {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showProofPack, setShowProofPack] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const dateRange = useMemo(() => {
    if (viewMode === 'day') return { start: todayStr, end: todayStr };
    if (viewMode === 'week') return getWeekRange(today);
    return getMonthRange(today);
  }, [viewMode, todayStr]);

  const report = usePayPeriodReport(dateRange.start, dateRange.end);

  const viewModeLabel = useMemo(() => {
    if (viewMode === 'day') return 'Today';
    if (viewMode === 'week') {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewMode, dateRange, today]);

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
            { value: 'day' as ViewMode, label: 'Day' },
            { value: 'week' as ViewMode, label: 'Week' },
            { value: 'month' as ViewMode, label: 'Month' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
        />
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">{viewModeLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-y-auto p-4 space-y-4', isMobile && 'pb-32')}>
        {/* Total Card */}
        <div className="bg-primary text-primary-foreground rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-primary-foreground/80 font-medium">
              {viewMode === 'day' ? "Today's Total" : viewMode === 'week' ? 'Week Total' : 'Month Total'}
            </span>
            <span className="text-sm text-primary-foreground/70">
              {report.totalROs} ROs · {report.totalLines} lines
              {report.tbdLineCount > 0 && ` · ${report.tbdLineCount} TBD`}
            </span>
          </div>
          <div className="text-4xl font-bold mb-3">{report.totalHours.toFixed(1)}h</div>
          {report.tbdLineCount > 0 && (
            <div className="text-sm text-primary-foreground/70 mb-2">
              ⏳ {report.tbdLineCount} TBD lines ({report.tbdHours.toFixed(1)}h) not counted
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {report.byLaborType.map(lt => (
              <span key={lt.laborType} className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
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
        {viewMode !== 'day' && (
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
