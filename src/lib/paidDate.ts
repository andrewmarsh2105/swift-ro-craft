import type { RepairOrder } from '@/types/ro';

export function normalizePaidDate(paidDate?: string | null): string | null {
  const normalized = paidDate?.trim();
  return normalized && normalized !== '—' ? normalized : null;
}

export function hasPaidDate(ro: Pick<RepairOrder, 'paidDate'>): boolean {
  return normalizePaidDate(ro.paidDate) !== null;
}
