import { useMemo } from 'react';
import { useRO } from '@/contexts/ROContext';

/**
 * Legacy compatibility hook.
 *
 * Free-tier RO caps were removed with the trial + lifetime model, but some
 * components still consume this shape. We keep stable return keys and always
 * report cap checks as disabled.
 */
export function useROCap() {
  const { ros } = useRO();

  const monthlyROCount = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter((r) => r.date && r.date >= monthStart).length;
  }, [ros]);

  const isAtCap = false;
  const isNearCap = false;

  return { monthlyROCount, isAtCap, isNearCap, cap: null, isPro: true } as const;
}
