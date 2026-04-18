import { useState } from 'react';
import { ChevronDown, ChevronRight, Flag, Copy } from 'lucide-react';
import { maskHours } from '@/lib/maskHours';
import { useFlagContext } from '@/contexts/FlagContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CloseoutSnapshot, ROSnapshot } from '@/hooks/useCloseouts';

interface CloseoutDetailViewProps {
  open: boolean;
  onClose: () => void;
  closeout: CloseoutSnapshot;
}

const RANGE_LABELS: Record<string, string> = {
  day: 'Day',
  week: 'Week',
  two_weeks: '2 Weeks',
  pay_period: 'Pay Period',
  month: 'Month',
  custom: 'Custom',
};

function ROItem({ ro, hide }: { ro: ROSnapshot; hide: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 p-3 text-left">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">#{ro.roNumber}</span>
            <span className="text-sm font-bold tabular-nums">{maskHours(ro.totalPaidHours, hide)}h</span>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {ro.advisor} · {ro.roDate}{ro.vehicle ? ` · ${ro.vehicle}` : ''}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border">
          {ro.lines.map((line, idx) => {
            const ltLabel = line.laborType === 'warranty' ? 'W' : line.laborType === 'internal' ? 'I' : 'CP';
            return (
              <div key={line.lineId || idx} className="flex items-center gap-2 px-3 py-2 text-sm border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-5">{line.lineNo}</span>
                <span className="flex-1 min-w-0 truncate">{line.description || '(empty)'}</span>
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                  line.laborType === 'warranty' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  line.laborType === 'internal' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                )}>{ltLabel}</span>
                <span className="text-sm font-semibold tabular-nums w-12 text-right">
                  {line.hours.toFixed(1)}h
                </span>
              </div>
            );
          })}
          <div className="flex justify-between items-center px-3 py-2 bg-muted/30 text-sm font-semibold">
            <span>Total</span>
            <span>{maskHours(ro.totalPaidHours, hide)}h</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CloseoutContent({ closeout }: { closeout: CloseoutSnapshot }) {
  const { userSettings } = useFlagContext();
  const hide = userSettings.hideTotals ?? false;
  const t = closeout.totals;

  const rangeLabel = RANGE_LABELS[closeout.rangeType] || closeout.rangeType;
  const startD = new Date(closeout.periodStart + 'T12:00:00');
  const endD = new Date(closeout.periodEnd + 'T12:00:00');
  const dateLabel = `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const ros = closeout.roSnapshot || [];
  const filteredROs = ros;

  const handleCopyText = async () => {
    const lines = [
      `${rangeLabel}: ${dateLabel}`,
      `Total: ${t.totalHours.toFixed(1)}h (${t.totalROs} ROs, ${t.totalLines} lines)`,
      `CP: ${t.customerPayHours.toFixed(1)}h | W: ${t.warrantyHours.toFixed(1)}h | I: ${t.internalHours.toFixed(1)}h`,
      '',
      ...ros.map(ro => {
        const paidLines = ro.lines;
        return [
          `#${ro.roNumber} — ${ro.advisor} — ${ro.totalPaidHours.toFixed(1)}h`,
          ...paidLines.map(l => `  ${l.lineNo}. ${l.description} (${l.laborType === 'warranty' ? 'W' : l.laborType === 'internal' ? 'I' : 'CP'}) ${l.hours.toFixed(1)}h`),
        ].join('\n');
      }),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Summary copied');
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-5">
        <p className="text-primary-foreground/80 text-sm font-medium mb-1">{rangeLabel} Closeout</p>
        <p className="text-sm text-primary-foreground/70 mb-3">{dateLabel}</p>
        <div className="text-4xl font-bold mb-2">{maskHours(t.totalHours, hide)}h</div>
        <p className="text-primary-foreground/70 text-sm">{t.totalROs} ROs · {t.totalLines} lines</p>
      </div>

      {/* Type breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">CP</div>
          <div className="text-lg font-bold tabular-nums">{maskHours(t.customerPayHours, hide)}h</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Warranty</div>
          <div className="text-lg font-bold tabular-nums">{maskHours(t.warrantyHours, hide)}h</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Internal</div>
          <div className="text-lg font-bold tabular-nums">{maskHours(t.internalHours, hide)}h</div>
        </div>
      </div>

      {/* Warnings */}
      {t.flaggedCount > 0 && (
        <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Flag className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <span>{t.flaggedCount} flagged</span>
          </div>
        </div>
      )}


      {/* RO List */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Repair Orders ({filteredROs.length})
        </h3>
        {filteredROs.map(ro => (
          <ROItem key={ro.roId} ro={ro} hide={hide} />
        ))}
        {filteredROs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No ROs match filter</p>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 pb-4">
        <div className="grid grid-cols-1 gap-2">
          <Button variant="secondary" onClick={handleCopyText} className="h-11">
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use Spreadsheet Export for downloadable payroll PDFs.
        </p>
      </div>
    </div>
  );
}

export function CloseoutDetailView({ open, onClose, closeout }: CloseoutDetailViewProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <BottomSheet isOpen={open} onClose={onClose} title="Closeout Summary" fullHeight>
        <CloseoutContent closeout={closeout} />
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <DialogTitle>Closeout Summary</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          <CloseoutContent closeout={closeout} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
