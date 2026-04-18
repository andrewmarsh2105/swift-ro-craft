import { Flag } from 'lucide-react';
import { StatusPill } from '@/components/mobile/StatusPill';
import { maskHours } from '@/lib/maskHours';
import { cn } from '@/lib/utils';
import type { LaborType } from '@/types/ro';

interface HeroKPIProps {
  totalHours: number;
  totalROs: number;
  totalLines: number;
  avgPerRO: number;
  byLaborType: { laborType: LaborType; totalHours: number }[];
  flaggedCount: number;
  hideTotals: boolean;
  compact?: boolean;
}

export function HeroKPI({ totalHours, totalROs, totalLines, avgPerRO, byLaborType, flaggedCount, hideTotals, compact }: HeroKPIProps) {
  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 'calc(var(--radius) + 2px)',
        border: '1px solid hsl(var(--primary) / 0.24)',
        background: 'linear-gradient(165deg, hsl(var(--card)) 0%, hsl(var(--accent) / 0.55) 40%, hsl(var(--primary) / 0.06) 100%)',
        boxShadow: 'var(--shadow-raised)',
      }}
    >
      <div className={cn('px-4 pt-3', compact ? 'pb-1.5' : 'pb-2')}>
        <div className="flex items-center justify-between">
          <div className="data-header mb-0.5" style={{ color: 'hsl(var(--primary) / 0.68)' }}>Total Hours</div>
          <span className="text-[10px] font-semibold text-muted-foreground/65">
            {totalROs} ROs
          </span>
        </div>
        <div className="flex items-end gap-1.5">
          <span className={cn('font-bold tabular-nums tracking-tight text-primary leading-none font-mono', compact ? 'text-[34px]' : 'text-[38px]')}>
            {maskHours(totalHours, hideTotals)}
          </span>
          <span className="text-base font-bold text-primary/35 font-mono">h</span>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="px-4 pb-2 grid grid-cols-3 gap-1.5">
        <div className="rounded-md border border-border/45 bg-card/80 px-2 py-1 text-center shadow-[0_2px_8px_-8px_hsl(var(--foreground)/0.25)]">
          <div className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground/65">ROs</div>
          <div className="text-[12px] font-bold tabular-nums">{totalROs}</div>
        </div>
        <div className="rounded-md border border-border/45 bg-card/80 px-2 py-1 text-center shadow-[0_2px_8px_-8px_hsl(var(--foreground)/0.25)]">
          <div className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground/65">Lines</div>
          <div className="text-[12px] font-bold tabular-nums">{totalLines}</div>
        </div>
        <div className="rounded-md border border-border/45 bg-card/80 px-2 py-1 text-center shadow-[0_2px_8px_-8px_hsl(var(--foreground)/0.25)]">
          <div className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground/65">Avg / RO</div>
          <div className="text-[12px] font-bold tabular-nums">{maskHours(avgPerRO, hideTotals)}h</div>
        </div>
      </div>

      {/* Status strip */}
      <div className="border-t px-4 py-2.5 flex items-center gap-2 flex-wrap" style={{ borderColor: 'hsl(var(--primary) / 0.12)', background: 'hsl(var(--primary) / 0.045)' }}>
        {byLaborType.length > 0 ? byLaborType.map(lt => (
          <div key={lt.laborType} className="inline-flex h-7 items-center justify-center rounded-full border border-border/50 bg-card/70 px-2">
            <StatusPill type={lt.laborType as import('@/types/ro').LaborType} hours={lt.totalHours} size="sm" className="h-5 items-center justify-center px-2.5 py-0 leading-none font-mono tabular-nums tracking-normal" />
          </div>
        )) : (
          <span className="text-[10px] text-muted-foreground/40">No type data</span>
        )}

        {flaggedCount > 0 && (
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-0.5">
              <Flag className="h-2.5 w-2.5 text-orange-500" />
              <span className="text-[10px] font-bold tabular-nums text-orange-500">{flaggedCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
