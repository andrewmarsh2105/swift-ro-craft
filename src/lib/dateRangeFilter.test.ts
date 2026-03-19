import { describe, expect, it } from 'vitest';
import { effectiveDate, filterROsByDateRange, type DateRangeBounds } from '@/lib/dateRangeFilter';
import type { RepairOrder } from '@/types/ro';

function makeRO(partial: Partial<RepairOrder>): RepairOrder {
  return {
    id: partial.id || 'ro-1',
    roNumber: partial.roNumber || '1001',
    date: partial.date || '2026-03-01',
    paidDate: partial.paidDate,
    advisor: partial.advisor || 'Advisor',
    customerName: partial.customerName,
    mileage: partial.mileage,
    vehicle: partial.vehicle,
    paidHours: partial.paidHours ?? 0,
    laborType: partial.laborType || 'customer-pay',
    workPerformed: partial.workPerformed || '',
    notes: partial.notes,
    lines: partial.lines || [],
    isSimpleMode: partial.isSimpleMode ?? false,
    photos: partial.photos || [],
    createdAt: partial.createdAt || '2026-03-01T00:00:00Z',
    updatedAt: partial.updatedAt || '2026-03-01T00:00:00Z',
  };
}

describe('dateRangeFilter', () => {
  it('falls back to RO date when paidDate is em dash placeholder', () => {
    const ro = makeRO({ date: '2026-03-05', paidDate: '—' });
    expect(effectiveDate(ro)).toBe('2026-03-05');
  });

  it('filters by parsed day values (not lexical string ordering)', () => {
    const bounds: DateRangeBounds = { start: '2026-03-10', end: '2026-03-10', label: 'Mar 10' };
    const ros = [
      makeRO({ id: 'a', paidDate: '2026-3-9' }),
      makeRO({ id: 'b', paidDate: '2026-3-10' }),
      makeRO({ id: 'c', paidDate: '2026-3-11' }),
    ];

    const filtered = filterROsByDateRange(ros, bounds);
    expect(filtered.map(r => r.id)).toEqual(['b']);
  });
});
