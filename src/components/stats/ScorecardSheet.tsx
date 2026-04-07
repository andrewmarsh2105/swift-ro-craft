import { Copy, Trophy, TrendingUp, Users, Target, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScorecard } from '@/hooks/useScorecard';

interface ScorecardSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatHours(h: number): string {
  return h % 1 === 0 ? `${h}` : h.toFixed(1);
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ── Stat tile ─────────────────────────────────────── */
function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center p-3 bg-muted/40 rounded-xl">
      <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide mb-1">
        {label}
      </span>
      <span className={cn('text-lg font-bold tabular-nums leading-tight', accent && 'text-primary')}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</span>}
    </div>
  );
}

/* ── Section header ────────────────────────────────── */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-primary/70">{icon}</span>
      <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">
        {label}
      </h3>
    </div>
  );
}

/* ── Labor mix bar ─────────────────────────────────── */
function LaborMixBar({
  warrantyPct,
  customerPayPct,
  internalPct,
}: {
  warrantyPct: number;
  customerPayPct: number;
  internalPct: number;
}) {
  const hasData = warrantyPct + customerPayPct + internalPct > 0;
  if (!hasData) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-5 rounded-lg overflow-hidden gap-px">
        {warrantyPct > 0 && (
          <div
            className="bg-blue-500/80 flex items-center justify-center"
            style={{ width: `${warrantyPct}%` }}
            title={`Warranty ${warrantyPct}%`}
          />
        )}
        {customerPayPct > 0 && (
          <div
            className="bg-emerald-500/80 flex items-center justify-center"
            style={{ width: `${customerPayPct}%` }}
            title={`Customer Pay ${customerPayPct}%`}
          />
        )}
        {internalPct > 0 && (
          <div
            className="bg-orange-400/80 flex items-center justify-center"
            style={{ width: `${internalPct}%` }}
            title={`Internal ${internalPct}%`}
          />
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {warrantyPct > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500/80" />
            <span className="text-[11px] text-muted-foreground">Warranty {warrantyPct}%</span>
          </div>
        )}
        {customerPayPct > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
            <span className="text-[11px] text-muted-foreground">Cust. Pay {customerPayPct}%</span>
          </div>
        )}
        {internalPct > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-orange-400/80" />
            <span className="text-[11px] text-muted-foreground">Internal {internalPct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScorecardSheet({ isOpen, onClose }: ScorecardSheetProps) {
  const data = useScorecard();

  const handleCopyStats = () => {
    const lines: string[] = ['── RO Navigator Tech Profile ──'];

    if (data.displayName) lines.push(`Tech: ${data.displayName}`);
    if (data.shopName) lines.push(`Shop: ${data.shopName}`);
    if (data.memberSince) lines.push(`Member since: ${data.memberSince}`);

    lines.push('');
    lines.push(`All-Time Hours: ${formatHours(data.lifetimeHours)} hrs`);
    lines.push(`Total ROs: ${data.lifetimeROs.toLocaleString()}`);
    if (data.lifetimeEstimatedEarnings > 0) {
      lines.push(`Est. Earned: ${formatMoney(data.lifetimeEstimatedEarnings)}`);
    }

    if (data.bestDayHours > 0) {
      lines.push('');
      lines.push(`Best Day: ${formatHours(data.bestDayHours)} hrs (${formatDate(data.bestDayDate)})`);
    }
    if (data.bestWeekHours > 0) {
      lines.push(`Best Period: ${formatHours(data.bestWeekHours)} hrs (${data.bestWeekLabel})`);
    }

    if (data.weeklyGoal > 0 && data.closedPeriodsCount > 0) {
      lines.push('');
      lines.push(
        `Goal Achievement: ${data.weeklyGoalMetCount}/${data.closedPeriodsCount} periods (${data.weeklyGoalAchievementRate}%)`,
      );
    }

    if (data.topAdvisors.length > 0) {
      lines.push('');
      lines.push('Top Advisors:');
      data.topAdvisors.forEach((a, i) => {
        lines.push(`  ${i + 1}. ${a.name} — ${formatHours(a.hours)} hrs`);
      });
    }

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => toast.success('Stats copied to clipboard'))
      .catch(() => toast.error('Failed to copy'));
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Tech Profile">
      <div className="p-4 space-y-5">

        {/* ── Identity header ──────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground text-xl font-bold select-none bg-primary">
            {data.avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold truncate">
              {data.displayName || (
                <span className="text-muted-foreground font-normal italic text-[13px]">No name set</span>
              )}
            </div>
            {data.shopName && (
              <div className="text-[12px] text-muted-foreground/70 truncate">{data.shopName}</div>
            )}
            {data.memberSince && (
              <div className="text-[11px] text-muted-foreground/50 mt-0.5">
                Member since {data.memberSince}
              </div>
            )}
          </div>
        </div>

        {/* ── All-Time Overview ────────────────────── */}
        <div>
          <SectionHeader
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="All-Time"
          />
          <div
            className={cn(
              'grid gap-2',
              data.hourlyRate > 0 ? 'grid-cols-3' : 'grid-cols-2',
            )}
          >
            <StatTile
              label="Hours"
              value={formatHours(data.lifetimeHours)}
              sub="lifetime"
              accent
            />
            <StatTile
              label="ROs"
              value={data.lifetimeROs.toLocaleString()}
              sub="total"
            />
            {data.hourlyRate > 0 && (
              <StatTile
                label="Est. Earned"
                value={formatMoney(data.lifetimeEstimatedEarnings)}
                sub="lifetime"
                accent
              />
            )}
          </div>
        </div>

        {/* ── Personal Records ─────────────────────── */}
        {(data.bestDayHours > 0 || data.bestWeekHours > 0) && (
          <div>
            <SectionHeader
              icon={<Trophy className="h-3.5 w-3.5" />}
              label="Personal Records"
            />
            <div className="grid grid-cols-2 gap-2">
              {data.bestDayHours > 0 && (
                <StatTile
                  label="Best Day"
                  value={`${formatHours(data.bestDayHours)} hrs`}
                  sub={formatDate(data.bestDayDate)}
                />
              )}
              {data.bestWeekHours > 0 && (
                <StatTile
                  label="Best Period"
                  value={`${formatHours(data.bestWeekHours)} hrs`}
                  sub={data.bestWeekLabel ?? undefined}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Labor Mix ────────────────────────────── */}
        {(data.warrantyPct + data.customerPayPct + data.internalPct) > 0 && (
          <div>
            <SectionHeader
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Labor Mix"
            />
            <LaborMixBar
              warrantyPct={data.warrantyPct}
              customerPayPct={data.customerPayPct}
              internalPct={data.internalPct}
            />
          </div>
        )}

        {/* ── Goal Performance ─────────────────────── */}
        {data.weeklyGoal > 0 && data.closedPeriodsCount > 0 && (
          <div>
            <SectionHeader
              icon={<Target className="h-3.5 w-3.5" />}
              label="Goal Performance"
            />
            <div
              className="bg-card border border-border/50 rounded-xl px-4 py-3"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[13px] font-medium">Weekly goal met</span>
                <span className="text-[20px] font-bold tabular-nums text-primary leading-none">
                  {data.weeklyGoalAchievementRate}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${data.weeklyGoalAchievementRate}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                {data.weeklyGoalMetCount} of {data.closedPeriodsCount} closed{' '}
                {data.closedPeriodsCount === 1 ? 'period' : 'periods'} ≥{' '}
                {formatHours(data.weeklyGoal)} hrs
              </p>
            </div>
          </div>
        )}

        {/* ── Top Advisors ─────────────────────────── */}
        {data.topAdvisors.length > 0 && (
          <div>
            <SectionHeader
              icon={<Users className="h-3.5 w-3.5" />}
              label="Top Advisors"
            />
            <div
              className="bg-card border border-border/50 overflow-hidden divide-y divide-border/40"
              style={{ borderRadius: 'var(--radius)' }}
            >
              {data.topAdvisors.map((advisor, i) => {
                const maxHours = data.topAdvisors[0]?.hours || 1;
                const barPct = (advisor.hours / maxHours) * 100;
                return (
                  <div key={advisor.name} className="px-4 py-2.5 relative overflow-hidden">
                    {/* Subtle background bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/5 pointer-events-none"
                      style={{ width: `${barPct}%` }}
                    />
                    <div className="relative flex items-center gap-2.5">
                      <span className="text-[11px] font-bold text-muted-foreground/40 w-4 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-medium flex-1 truncate">{advisor.name}</span>
                      <span className="text-[12px] font-bold tabular-nums text-primary shrink-0">
                        {formatHours(advisor.hours)} hrs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Copy Stats ───────────────────────────── */}
        <Button
          variant="outline"
          className="w-full h-10 gap-2 text-[13px]"
          onClick={handleCopyStats}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy Stats Summary
        </Button>

        {data.lifetimeROs === 0 && (
          <p className="text-center text-[12px] text-muted-foreground/50 pb-2">
            Log your first RO to start building your stats.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
