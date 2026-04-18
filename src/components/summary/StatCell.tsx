import { cn } from '@/lib/utils';

interface StatCellProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatCell({ label, value, sub, accent }: StatCellProps) {
  return (
    <div className="flex flex-col">
      <span className="data-header">{label}</span>
      <span className={cn('text-base font-bold tabular-nums font-mono leading-tight', accent && 'text-primary')}>{value}</span>
      {sub && <span className="text-[9px] text-muted-foreground/40">{sub}</span>}
    </div>
  );
}
