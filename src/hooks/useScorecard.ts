import { useMemo } from 'react';
import { useRO } from '@/contexts/ROContext';
import { useCloseouts } from '@/hooks/useCloseouts';
import { useFlagContext } from '@/contexts/FlagContext';
import { effectiveDate as effectiveDateOf, calcHours } from '@/lib/roDisplay';
import { formatMonthYear, formatDateRange } from '@/lib/dateFormatters';

export interface ScorecardData {
  displayName: string;
  shopName: string;
  avatarInitial: string;
  memberSince: string | null;

  lifetimeHours: number;
  lifetimeROs: number;
  lifetimeEstimatedEarnings: number;

  bestDayHours: number;
  bestDayDate: string | null;
  bestWeekHours: number;
  bestWeekLabel: string | null;

  warrantyPct: number;
  customerPayPct: number;
  internalPct: number;

  weeklyGoalAchievementRate: number;
  closedPeriodsCount: number;
  weeklyGoalMetCount: number;

  topAdvisors: { name: string; hours: number }[];

  weeklyGoal: number;
  hourlyRate: number;
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

    // Single pass through all ROs: memberSince, totals, labor mix, best day, advisors
    let earliestCreatedAt = '';
    let lifetimeHours = 0;
    let warrantyH = 0, cpH = 0, internalH = 0;
    const dayMap = new Map<string, number>();
    const advisorMap = new Map<string, number>();

    for (const ro of ros) {
      if (!earliestCreatedAt || ro.createdAt < earliestCreatedAt) {
        earliestCreatedAt = ro.createdAt;
      }

      const roHours = calcHours(ro);

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
        lifetimeHours += roHours;
        const lt = ro.laborType || 'customer-pay';
        if (lt === 'warranty') warrantyH += roHours;
        else if (lt === 'internal') internalH += roHours;
        else cpH += roHours;
      }

      const date = effectiveDateOf(ro);
      dayMap.set(date, (dayMap.get(date) || 0) + roHours);

      const name = (ro.advisor || '').trim();
      if (name && name !== '—') {
        advisorMap.set(name, (advisorMap.get(name) || 0) + roHours);
      }
    }

    let memberSince: string | null = null;
    if (earliestCreatedAt) {
      try { memberSince = formatMonthYear(new Date(earliestCreatedAt)); }
      catch { /* ignore */ }
    }

    const lifetimeEstimatedEarnings = hourlyRate > 0 ? lifetimeHours * hourlyRate : 0;

    const totalLaborH = warrantyH + cpH + internalH;
    const warrantyPct = totalLaborH > 0 ? Math.round((warrantyH / totalLaborH) * 100) : 0;
    const customerPayPct = totalLaborH > 0 ? Math.round((cpH / totalLaborH) * 100) : 0;
    const internalPct = totalLaborH > 0 ? 100 - warrantyPct - customerPayPct : 0;

    let bestDayHours = 0;
    let bestDayDate: string | null = null;
    for (const [date, hours] of dayMap) {
      if (hours > bestDayHours) { bestDayHours = hours; bestDayDate = date; }
    }

    let bestWeekHours = 0;
    let bestWeekLabel: string | null = null;
    for (const c of closeouts) {
      if (c.totals.totalHours > bestWeekHours) {
        bestWeekHours = c.totals.totalHours;
        bestWeekLabel = formatDateRange(c.periodStart, c.periodEnd);
      }
    }

    const relevantCloseouts = closeouts.filter(
      c => c.rangeType === 'week' || c.rangeType === 'pay_period' || c.rangeType === 'two_weeks',
    );
    const closedPeriodsCount = relevantCloseouts.length;
    const weeklyGoalMetCount =
      weeklyGoal > 0 ? relevantCloseouts.filter(c => c.totals.totalHours >= weeklyGoal).length : 0;
    const weeklyGoalAchievementRate =
      closedPeriodsCount > 0 && weeklyGoal > 0
        ? Math.round((weeklyGoalMetCount / closedPeriodsCount) * 100)
        : 0;

    const topAdvisors = [...advisorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, hours]) => ({ name, hours }));

    return {
      displayName, shopName, avatarInitial, memberSince,
      lifetimeHours, lifetimeROs: ros.length, lifetimeEstimatedEarnings,
      bestDayHours, bestDayDate, bestWeekHours, bestWeekLabel,
      warrantyPct, customerPayPct, internalPct,
      weeklyGoalAchievementRate, closedPeriodsCount, weeklyGoalMetCount,
      topAdvisors, weeklyGoal, hourlyRate,
    };
  }, [ros, closeouts, userSettings]);
}

export { formatScorecardDate } from '@/lib/dateFormatters';
