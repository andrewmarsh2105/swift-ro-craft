import { describe, expect, it } from 'vitest';
import { compareRONumbers, sortROs, normalizeAdvisorName } from '@/lib/roFilters';
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

describe('roFilters', () => {
  it('sorts numeric RO numbers numerically ahead of text numbers', () => {
    const roNumbers = ['A-20', '10', '2', 'A-3'];
    const sorted = [...roNumbers].sort(compareRONumbers);
    expect(sorted).toEqual(['2', '10', 'A-3', 'A-20']);
  });

  it('normalizes advisor names for casing and repeated spaces', () => {
    expect(normalizeAdvisorName('  ALEx   sMITH  ')).toBe('alex smith');
  });

  it('sorts by effective date descending and applies stable RO-number ordering on ties', () => {
    const ros = [
      makeRO({ id: 'a', roNumber: '101', date: '2026-03-09', paidDate: '2026-03-11' }),
      makeRO({ id: 'b', roNumber: '100', date: '2026-03-10', paidDate: '2026-03-11' }),
      makeRO({ id: 'c', roNumber: '99', date: '2026-03-12' }),
    ];

    const sorted = sortROs(ros, 'date');
    expect(sorted.map(r => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by hours descending and breaks ties with RO number ascending', () => {
    const ros = [
      makeRO({ id: 'a', roNumber: '12', lines: [{ id: 'l1', lineNo: 1, description: 'x', hoursPaid: 1, laborType: 'customer-pay', createdAt: '', updatedAt: '' }] }),
      makeRO({ id: 'b', roNumber: '11', lines: [{ id: 'l1', lineNo: 1, description: 'x', hoursPaid: 2, laborType: 'customer-pay', createdAt: '', updatedAt: '' }] }),
      makeRO({ id: 'c', roNumber: '10', lines: [{ id: 'l1', lineNo: 1, description: 'x', hoursPaid: 1, laborType: 'customer-pay', createdAt: '', updatedAt: '' }] }),
    ];

    const sorted = sortROs(ros, 'hours');
    expect(sorted.map(r => r.id)).toEqual(['b', 'c', 'a']);
  });
});
