import { useMemo } from 'react';
import { useRO } from '@/contexts/ROContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { RO_MONTHLY_CAP } from '@/lib/proFeatures';

/**
 * Shared hook for monthly RO cap logic.
 * Returns the current month's RO count and whether the user is at cap.
 */
export function useROCap() {
  const { ros } = useRO();
  const { isPro } = useSubscription();

  const monthlyROCount = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter((r) => r.date && r.date >= monthStart).length;
  }, [ros]);

  /** True when a free user would exceed the cap by adding a new RO */
  const isAtCap = !isPro && monthlyROCount >= RO_MONTHLY_CAP;

  /** True when nearing the cap (within 5 of limit) */
  const isNearCap = !isPro && monthlyROCount >= RO_MONTHLY_CAP - 5;

  return { monthlyROCount, isAtCap, isNearCap, cap: RO_MONTHLY_CAP, isPro } as const;
}
