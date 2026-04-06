import type { RepairOrder } from '@/types/ro';

/** Returns the trimmed paid date string, or null if empty/placeholder */
export function normalizePaidDate(paidDate?: string | null): string | null {
  const normalized = paidDate?.trim();
  return normalized && normalized !== '—' ? normalized : null;
}

/** Returns the trimmed paid date string, or '' if empty — for use in form fields */
export function normalizePaidDateValue(paidDate?: string | null): string {
  return normalizePaidDate(paidDate) ?? '';
}

export function hasPaidDate(ro: Pick<RepairOrder, 'paidDate'>): boolean {
  return normalizePaidDate(ro.paidDate) !== null;
}
