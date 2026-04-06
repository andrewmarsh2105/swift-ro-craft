import { DollarSign } from 'lucide-react';
import { GoalBar } from './GoalBar';

interface GoalsAndEarningsProps {
  hoursGoalDaily: number;
  hoursGoalWeekly: number;
  hourlyRate: number;
  totalHours: number;
  rangeMode: string;
  hideTotals: boolean;
}

export function GoalsAndEarnings({ hoursGoalDaily, hoursGoalWeekly, hourlyRate, totalHours, rangeMode, hideTotals }: GoalsAndEarningsProps) {
  const hasGoals = hoursGoalDaily > 0 || hoursGoalWeekly > 0;
  const hasEarnings = hourlyRate > 0 && !hideTotals;
  if (!hasGoals && !hasEarnings) return null;

  return (
    <div className="border border-primary/20 bg-card overflow-hidden px-4 py-3 space-y-2.5" style={{ borderRadius: 'var(--radius)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/65">Goals & Earnings</span>
        {hourlyRate > 0 && !hideTotals && (
          <span className="text-[12px] font-bold tabular-nums text-green-600">${(totalHours * hourlyRate).toFixed(0)}</span>
        )}
      </div>
      {hoursGoalDaily > 0 && rangeMode === 'day' && (
        <GoalBar label="Daily Goal" current={totalHours} goal={hoursGoalDaily} hide={hideTotals} />
      )}
      {hoursGoalWeekly > 0 && rangeMode !== 'day' && (
        <GoalBar label="Weekly Goal" current={totalHours} goal={hoursGoalWeekly} hide={hideTotals} />
      )}
      {hasEarnings && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Est. Earnings</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-green-600">${(totalHours * hourlyRate).toFixed(0)}</span>
        </div>
      )}
    </div>
  );
}
