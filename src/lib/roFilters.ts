import type { RepairOrder } from '@/types/ro';
import { calcHours, effectiveDate } from '@/lib/roDisplay';

export function normalizeAdvisorName(name?: string | null): string {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function compareAdvisorNames(a?: string | null, b?: string | null): number {
  return normalizeAdvisorName(a).localeCompare(normalizeAdvisorName(b));
}

function roNumberSortKey(roNumber?: string | null): { numeric: number | null; text: string } {
  const text = (roNumber || '').trim();
  if (!text) return { numeric: null, text: '' };
  if (/^\d+$/.test(text)) return { numeric: Number(text), text };
  return { numeric: null, text: text.toLowerCase() };
}

export function compareRONumbers(a: string, b: string): number {
  const ka = roNumberSortKey(a);
  const kb = roNumberSortKey(b);

  if (ka.numeric !== null && kb.numeric !== null) return ka.numeric - kb.numeric;
  if (ka.numeric !== null) return -1;
  if (kb.numeric !== null) return 1;
  return ka.text.localeCompare(kb.text, undefined, { numeric: true, sensitivity: 'base' });
}

export type ROListSortKey = 'date' | 'hours' | 'ro' | 'advisor' | 'customer' | 'laborType';

export function sortROs(ros: RepairOrder[], sortBy: ROListSortKey): RepairOrder[] {
  return [...ros].sort((a, b) => {
    if (sortBy === 'date') {
      return (
        effectiveDate(b).localeCompare(effectiveDate(a)) ||
        compareRONumbers(b.roNumber, a.roNumber)
      );
    }
    if (sortBy === 'hours') return calcHours(b) - calcHours(a) || compareRONumbers(a.roNumber, b.roNumber);
    if (sortBy === 'ro') return compareRONumbers(a.roNumber, b.roNumber);
    if (sortBy === 'advisor') return compareAdvisorNames(a.advisor, b.advisor) || compareRONumbers(a.roNumber, b.roNumber);
    if (sortBy === 'customer') {
      return (a.customerName || '').localeCompare(b.customerName || '', undefined, { sensitivity: 'base', numeric: true })
        || compareRONumbers(a.roNumber, b.roNumber);
    }
    if (sortBy === 'laborType') return (a.laborType || '').localeCompare(b.laborType || '') || compareRONumbers(a.roNumber, b.roNumber);
    return 0;
  });
}
