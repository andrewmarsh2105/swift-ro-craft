import { useState } from 'react';
import { FileText, Download, Copy, Share2, Flag, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFlagContext } from '@/contexts/FlagContext';
import { maskHours } from '@/lib/maskHours';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { PayPeriodReport } from '@/hooks/usePayPeriodReport';
import type { CloseoutSnapshot } from '@/hooks/useCloseouts';
import { generateLineCSV, generateSummaryText, downloadCSV, shareSummary } from '@/lib/exportUtils';

function asLaborType(value: string | undefined): 'customer-pay' | 'warranty' | 'internal' {
  if (value === 'warranty' || value === 'internal') return value;
  return 'customer-pay';
}

/** Build a minimal PayPeriodReport-compatible object from a frozen snapshot */
function snapshotToReport(snapshot: CloseoutSnapshot): PayPeriodReport {
  const rosInRange = snapshot.roSnapshot.map(ro => ({
    id: ro.roId,
    roNumber: ro.roNumber,
    date: ro.roDate,
    paidDate: undefined,
    advisor: ro.advisor,
    customerName: ro.customerName,
    mileage: ro.mileage,
    vehicle: undefined,
    vehicleLabel: ro.vehicle,
    paidHours: ro.totalPaidHours,
    laborType: 'customer-pay' as const,
    workPerformed: ro.lines.map(l => l.description).join('\n'),
    notes: undefined,
    lines: ro.lines.map(l => ({
      id: l.lineId,
      lineNo: l.lineNo,
      description: l.description,
      hoursPaid: l.hours,
      isTbd: l.isTbd,
      laborType: asLaborType(l.laborType),
      matchedReferenceId: l.matchedReferenceId,
      vehicleOverride: false,
      lineVehicle: undefined,
      createdAt: snapshot.closedAt,
      updatedAt: snapshot.closedAt,
    })),
    isSimpleMode: ro.lines.length === 0,
    photos: [],
    createdAt: snapshot.closedAt,
    updatedAt: snapshot.closedAt,
  }));
  const linesInRange = rosInRange.flatMap(ro => ro.lines.map(line => ({ ro, line })));
  const tbdHours = linesInRange.filter(({ line }) => line.isTbd).reduce((sum, { line }) => sum + line.hoursPaid, 0);

  return {
    startDate: snapshot.periodStart,
    endDate: snapshot.periodEnd,
    totalHours: snapshot.totals.totalHours,
    totalROs: snapshot.totals.totalROs,
    totalLines: snapshot.totals.totalLines,
    tbdLineCount: snapshot.totals.tbdCount,
    tbdHours,
    byDay: (snapshot.breakdowns.byDay || []).map(d => ({
      date: d.date,
      totalHours: d.totalHours,
      roCount: d.roCount,
      warrantyHours: 0,
      customerPayHours: 0,
      internalHours: 0,
    })),
    byAdvisor: snapshot.breakdowns.byAdvisor || [],
    byLaborType: (snapshot.breakdowns.byLaborType || []).map(lt => ({
      laborType: asLaborType(lt.laborType),
      label: lt.label,
      totalHours: lt.totalHours,
      lineCount: lt.lineCount,
    })),
    byLaborRef: snapshot.breakdowns.byLaborRef || [],
    missingHoursCount: 0,
    needsReviewCount: snapshot.totals.needsReviewCount,
    flaggedCount: snapshot.totals.flaggedCount,
    rosInRange,
    linesInRange,
  };
}

interface ProofPackProps {
  open: boolean;
  onClose: () => void;
  report?: PayPeriodReport;
  snapshot?: CloseoutSnapshot;
}

function ProofPackContent({ report }: { report: PayPeriodReport }) {
  const [showROs, setShowROs] = useState(false);
  const { userSettings } = useFlagContext();
  const hide = userSettings.hideTotals ?? false;

  const handleExportCSV = () => {
    try {
      const csv = generateLineCSV(report);
      downloadCSV(csv, `proof-pack-${report.startDate}-to-${report.endDate}.csv`);
      toast.success('CSV downloaded');
    } catch {
      toast.error('CSV export failed');
    }
  };

  const handleCopy = async () => {
    try {
      const text = generateSummaryText(report);
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleShare = async () => {
    try {
      const text = generateSummaryText(report);
      await shareSummary(text);
      toast.success('Shared');
    } catch {
      toast.error('Share failed');
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Period Header */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-5">
        <p className="text-primary-foreground/80 text-sm font-medium mb-1">Pay Period</p>
        <p className="text-sm text-primary-foreground/70 mb-3">
          {new Date(report.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(report.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
        <div className="text-4xl font-bold mb-2">{maskHours(report.totalHours, hide)}h</div>
        <p className="text-primary-foreground/70 text-sm">{report.totalROs} ROs · {report.totalLines} lines</p>
      </div>

      {/* Warnings */}
      {(report.missingHoursCount > 0 || report.flaggedCount > 0) && (
        <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-1">
          {report.missingHoursCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <span>{report.missingHoursCount} lines missing hours</span>
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

      {/* By Labor Type */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Labor Type</h3>
        <div className="space-y-1">
          {report.byLaborType.map(lt => (
            <div key={lt.laborType} className="flex justify-between items-center py-1.5 px-3 bg-card rounded-lg">
              <span className="text-sm font-medium">{lt.label}</span>
              <span className="text-sm font-bold">{maskHours(lt.totalHours, hide)}h <span className="text-muted-foreground font-normal">({lt.lineCount})</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* By Day */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Day by Day</h3>
        <div className="space-y-1">
          {report.byDay.filter(d => d.totalHours > 0 || d.roCount > 0).map(d => {
            const date = new Date(d.date);
            return (
              <div key={d.date} className="flex justify-between items-center py-1.5 px-3 bg-card rounded-lg">
                <span className="text-sm">{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className="text-sm font-bold">{maskHours(d.totalHours, hide)}h <span className="text-muted-foreground font-normal">({d.roCount} ROs)</span></span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Advisor */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Advisor</h3>
        <div className="space-y-1">
          {report.byAdvisor.map(a => (
            <div key={a.advisor} className="flex justify-between items-center py-1.5 px-3 bg-card rounded-lg">
              <div>
                <span className="text-sm font-medium">{a.advisor}</span>
                <span className="text-xs text-muted-foreground ml-2">{a.roCount} ROs</span>
              </div>
              <span className="text-sm font-bold">{maskHours(a.totalHours, hide)}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Labor Reference */}
      {report.byLaborRef.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Labor Reference</h3>
          <div className="space-y-1">
            {report.byLaborRef.map(r => (
              <div key={r.referenceId} className="flex justify-between items-center py-1.5 px-3 bg-card rounded-lg">
                <span className="text-sm font-medium">{r.referenceName}</span>
                <span className="text-sm font-bold">{maskHours(r.totalHours, hide)}h <span className="text-muted-foreground font-normal">({r.lineCount})</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RO List (collapsible) */}
      <div>
        <button
          onClick={() => setShowROs(!showROs)}
          className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/50 transition-colors mb-2"
        >
          <span className="text-sm font-medium flex-1">RO List</span>
          <span className="text-xs text-muted-foreground mr-1">{report.rosInRange.length}</span>
          {showROs ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        </button>
        {showROs && (
          <div className="space-y-1">
            {report.rosInRange.map(ro => {
              const roLines = (ro.lines || []).filter(l => l.description.trim() !== '' && !l.isTbd);
              const roTotal = roLines.reduce((s, l) => s + l.hoursPaid, 0);
              return (
                <div key={ro.id} className="py-2 px-3 bg-card rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">#{ro.roNumber}</span>
                    <span className="text-sm font-bold">{roTotal.toFixed(1)}h</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ro.advisor || '—'} · {ro.date}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Actions */}
      <div className="pt-2 pb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={handleCopy} className="h-11 gap-2">
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="h-11 gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
        <Button variant="outline" onClick={handleShare} className="w-full h-11 gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>
    </div>
  );
}

export function ProofPack({ open, onClose, report, snapshot }: ProofPackProps) {
  const isMobile = useIsMobile();
  const effectiveReport = snapshot ? snapshotToReport(snapshot) : report!;
  const title = snapshot ? 'Proof Pack (Closed)' : 'Proof Pack';

  if (isMobile) {
    return (
      <BottomSheet isOpen={open} onClose={onClose} title={title} fullHeight>
        <ProofPackContent report={effectiveReport} />
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          <ProofPackContent report={effectiveReport} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
