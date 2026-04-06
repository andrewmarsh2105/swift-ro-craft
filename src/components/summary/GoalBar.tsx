import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalBarProps {
  label: string;
  current: number;
  goal: number;
  hide: boolean;
}

export function GoalBar({ label, current, goal, hide }: GoalBarProps) {
  const pct = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target className={cn('h-3 w-3', isComplete ? 'text-green-600' : 'text-primary/60')} />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        </div>
        <span className={cn('text-xs font-bold tabular-nums', isComplete ? 'text-green-600' : 'text-foreground')}>
          {hide ? '--.-' : current.toFixed(1)} / {goal}h
          {isComplete && !hide && <span className="ml-1 text-green-600">✓</span>}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', isComplete ? 'bg-green-500' : 'bg-primary')}
          style={{ width: `${hide ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}
