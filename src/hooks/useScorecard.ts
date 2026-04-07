import { useMemo } from 'react';
import { useRO } from '@/contexts/ROContext';
import { useCloseouts } from '@/hooks/useCloseouts';
import { useFlagContext } from '@/contexts/FlagContext';
import { effectiveDate as effectiveDateOf } from '@/lib/roDisplay';
import type { RepairOrder } from '@/types/ro';

export interface ScorecardData {
  // Identity
  displayName: string;
  shopName: string;
  avatarInitial: string;
  memberSince: string | null;

  // All-time totals
  lifetimeHours: number;
  lifetimeROs: number;
  lifetimeEstimatedEarnings: number;

  // Records
  bestDayHours: number;
  bestDayDate: string | null;
  bestWeekHours: number;
  bestWeekLabel: string | null;

  // Labor mix (0–100)
  warrantyPct: number;
  customerPayPct: number;
  internalPct: number;

  // Goal performance
  weeklyGoalAchievementRate: number;
  closedPeriodsCount: number;
  weeklyGoalMetCount: number;

  // Top advisors
  topAdvisors: { name: string; hours: number }[];

  // Current settings for context
  weeklyGoal: number;
  hourlyRate: number;
}

function roPaidHours(ro: RepairOrder): number {
  if (ro.lines?.length) {
    return ro.lines.reduce((sum, l) => sum + (l.hoursPaid || 0), 0);
  }
  return ro.paidHours || 0;
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function useScorecard(): ScorecardData {
  const { ros } = useRO();
  const { closeouts } = useCloseouts();
  const { userSettings } = useFlagContext();

  return useMemo(() => {
    const displayName = userSettings.displayName || '';
    const shopName = userSettings.shopName || '';
    const hourlyRate = userSettings.hourlyRate || 0;
    const weeklyGoal = userSettings.hoursGoalWeekly || 0;

    const avatarInitial = displayName.trim().charAt(0).toUpperCase() || '?';

    // ── Member since ──────────────────────────────────────────
    let memberSince: string | null = null;
    if (ros.length > 0) {
      const sorted = [...ros].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      try {
        memberSince = new Date(sorted[0].createdAt).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      } catch {
        memberSince = null;
      }
    }

    // ── Lifetime totals ───────────────────────────────────────
    let lifetimeHours = 0;
    let warrantyH = 0;
    let cpH = 0;
    let internalH = 0;

    for (const ro of ros) {
      if (ro.lines?.length) {
        for (const line of ro.lines) {
          const h = line.hoursPaid || 0;
          lifetimeHours += h;
          const lt = line.laborType || 'customer-pay';
          if (lt === 'warranty') warrantyH += h;
          else if (lt === 'internal') internalH += h;
          else cpH += h;
        }
      } else {
        const h = ro.paidHours || 0;
        lifetimeHours += h;
        const lt = ro.laborType || 'customer-pay';
        if (lt === 'warranty') warrantyH += h;
        else if (lt === 'internal') internalH += h;
        else cpH += h;
      }
    }

    const lifetimeROs = ros.length;
    const lifetimeEstimatedEarnings = hourlyRate > 0 ? lifetimeHours * hourlyRate : 0;

    const totalLaborH = warrantyH + cpH + internalH;
    const warrantyPct = totalLaborH > 0 ? Math.round((warrantyH / totalLaborH) * 100) : 0;
    const customerPayPct = totalLaborH > 0 ? Math.round((cpH / totalLaborH) * 100) : 0;
    const internalPct = totalLaborH > 0 ? 100 - warrantyPct - customerPayPct : 0;

    // ── Best day (from all ROs, grouped by effective date) ────
    const dayMap = new Map<string, number>();
    for (const ro of ros) {
      const date = effectiveDateOf(ro);
      const h = roPaidHours(ro);
      dayMap.set(date, (dayMap.get(date) || 0) + h);
    }

    let bestDayHours = 0;
    let bestDayDate: string | null = null;
    for (const [date, hours] of dayMap) {
      if (hours > bestDayHours) {
        bestDayHours = hours;
        bestDayDate = date;
      }
    }

    // ── Best week (from closeouts — immutable snapshots) ──────
    let bestWeekHours = 0;
    let bestWeekLabel: string | null = null;
    for (const c of closeouts) {
      if (c.totals.totalHours > bestWeekHours) {
        bestWeekHours = c.totals.totalHours;
        bestWeekLabel = `${formatShortDate(c.periodStart)} – ${formatShortDate(c.periodEnd)}`;
      }
    }

    // ── Goal achievement (from closed periods) ────────────────
    const relevantCloseouts = closeouts.filter(
      c => c.rangeType === 'week' || c.rangeType === 'pay_period' || c.rangeType === 'two_weeks',
    );
    const closedPeriodsCount = relevantCloseouts.length;
    const weeklyGoalMetCount =
      weeklyGoal > 0
        ? relevantCloseouts.filter(c => c.totals.totalHours >= weeklyGoal).length
        : 0;
    const weeklyGoalAchievementRate =
      closedPeriodsCount > 0 && weeklyGoal > 0
        ? Math.round((weeklyGoalMetCount / closedPeriodsCount) * 100)
        : 0;

    // ── Top advisors (from all ROs) ───────────────────────────
    const advisorMap = new Map<string, number>();
    for (const ro of ros) {
      const name = (ro.advisor || '').trim();
      if (!name || name === '—') continue;
      advisorMap.set(name, (advisorMap.get(name) || 0) + roPaidHours(ro));
    }
    const topAdvisors = [...advisorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, hours]) => ({ name, hours }));

    return {
      displayName,
      shopName,
      avatarInitial,
      memberSince,
      lifetimeHours,
      lifetimeROs,
      lifetimeEstimatedEarnings,
      bestDayHours,
      bestDayDate,
      bestWeekHours,
      bestWeekLabel,
      warrantyPct,
      customerPayPct,
      internalPct,
      weeklyGoalAchievementRate,
      closedPeriodsCount,
      weeklyGoalMetCount,
      topAdvisors,
      weeklyGoal,
      hourlyRate,
    };
  }, [ros, closeouts, userSettings]);
}
