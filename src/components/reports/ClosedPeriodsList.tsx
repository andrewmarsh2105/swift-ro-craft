import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Lock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { maskHours } from '@/lib/maskHours';
import type { CloseoutSnapshot } from '@/hooks/useCloseouts';

const RANGE_LABELS: Record<string, string> = {
  day: 'Day',
  week: 'Week',
  last_week: 'Last Wk',
  two_weeks: '2 Wks',
  pay_period: 'Pay Period',
  month: 'Month',
  custom: 'Custom',
};

interface ClosedPeriodsListProps {
  closeouts: CloseoutSnapshot[];
  hideTotals: boolean;
  onViewProofPack: (closeout: CloseoutSnapshot) => void;
  onViewDetail: (closeout: CloseoutSnapshot) => void;
}

export function ClosedPeriodsList({ closeouts, hideTotals, onViewProofPack, onViewDetail }: ClosedPeriodsListProps) {
  const [expanded, setExpanded] = useState(false);

  if (closeouts.length === 0) return null;

  return (
    <div className="px-4 space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/50 transition-colors"
      >
        <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium flex-1">
          Closed Periods
        </span>
        <span className="text-xs text-muted-foreground mr-1">{closeouts.length}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="space-y-1.5">
          {closeouts.map(c => {
            const start = new Date(c.periodStart + 'T12:00:00');
            const end = new Date(c.periodEnd + 'T12:00:00');
            const rangeLabel = RANGE_LABELS[c.rangeType] || c.rangeType;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between py-2.5 px-3 bg-card rounded-lg border border-border"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {format(start, 'MMM d')} – {format(end, 'MMM d')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rangeLabel} · {maskHours(c.totals.totalHours, hideTotals)}h · {c.totals.totalROs} ROs
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onViewDetail(c)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  <button
                    onClick={() => onViewProofPack(c)}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Proof
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
