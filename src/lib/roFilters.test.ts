import { describe, expect, it } from 'vitest';
import { compareRONumbers, sortROs, normalizeAdvisorName, matchesSearchQuery } from '@/lib/roFilters';
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

describe('matchesSearchQuery', () => {
  it('returns true for empty query (show all)', () => {
    expect(matchesSearchQuery(makeRO({}), '')).toBe(true);
  });

  it('matches RO number case-insensitively', () => {
    const ro = makeRO({ roNumber: 'WO-1234' });
    expect(matchesSearchQuery(ro, 'wo-1234')).toBe(true);
    expect(matchesSearchQuery(ro, 'WO')).toBe(true);
    expect(matchesSearchQuery(ro, '9999')).toBe(false);
  });

  it('matches advisor name', () => {
    const ro = makeRO({ advisor: 'Sarah Johnson' });
    expect(matchesSearchQuery(ro, 'sarah')).toBe(true);
    expect(matchesSearchQuery(ro, 'JOHNSON')).toBe(true);
    expect(matchesSearchQuery(ro, 'mike')).toBe(false);
  });

  it('matches customer name', () => {
    const ro = makeRO({ customerName: 'Jane Doe' });
    expect(matchesSearchQuery(ro, 'doe')).toBe(true);
    expect(matchesSearchQuery(ro, 'Doe')).toBe(true);
    expect(matchesSearchQuery(ro, 'smith')).toBe(false);
  });

  it('matches vehicle year, make, and model', () => {
    const ro = makeRO({ vehicle: { year: 2022, make: 'Toyota', model: 'Camry' } });
    expect(matchesSearchQuery(ro, '2022')).toBe(true);
    expect(matchesSearchQuery(ro, 'toyota')).toBe(true);
    expect(matchesSearchQuery(ro, 'camry')).toBe(true);
    expect(matchesSearchQuery(ro, 'honda')).toBe(false);
  });

  it('matches VIN substring', () => {
    const ro = makeRO({ vehicle: { vin: '1HGCM82633A004352' } });
    expect(matchesSearchQuery(ro, '004352')).toBe(true);
    expect(matchesSearchQuery(ro, 'XXXXXX')).toBe(false);
  });

  it('matches workPerformed text', () => {
    const ro = makeRO({ workPerformed: 'Oil change and tire rotation' });
    expect(matchesSearchQuery(ro, 'tire rotation')).toBe(true);
    expect(matchesSearchQuery(ro, 'brake')).toBe(false);
  });

  it('matches notes field', () => {
    const ro = makeRO({ notes: 'customer declined alignment' });
    expect(matchesSearchQuery(ro, 'alignment')).toBe(true);
  });

  it('matches mileage', () => {
    const ro = makeRO({ mileage: '87500' });
    expect(matchesSearchQuery(ro, '875')).toBe(true);
    expect(matchesSearchQuery(ro, '99999')).toBe(false);
  });

  it('matches line item descriptions', () => {
    const ro = makeRO({
      lines: [
        { id: 'l1', lineNo: 1, description: 'Valve cover gasket', hoursPaid: 2, laborType: 'customer-pay', createdAt: '', updatedAt: '' },
        { id: 'l2', lineNo: 2, description: 'Spark plugs', hoursPaid: 1, laborType: 'customer-pay', createdAt: '', updatedAt: '' },
      ],
    });
    expect(matchesSearchQuery(ro, 'gasket')).toBe(true);
    expect(matchesSearchQuery(ro, 'spark')).toBe(true);
    expect(matchesSearchQuery(ro, 'transmission')).toBe(false);
  });

  it('returns false when no field matches', () => {
    const ro = makeRO({ roNumber: '100', advisor: 'Bob', customerName: 'Alice' });
    expect(matchesSearchQuery(ro, 'xyz_no_match')).toBe(false);
  });
});

describe('roFilters', () => {
  it('sorts numeric RO numbers numerically ahead of text numbers', () => {
    const roNumbers = ['A-20', '10', '2', 'A-3'];
    const sorted = [...roNumbers].sort(compareRONumbers);
    expect(sorted).toEqual(['2', '10', 'A-3', 'A-20']);
  });

  it('normalizes advisor names for casing and repeated spaces', () => {
    expect(normalizeAdvisorName('  ALEx   sMITH  ')).toBe('alex smith');
  });

  it('sorts by effective date descending and breaks ties by most recently inputted (createdAt)', () => {
    const ros = [
      makeRO({ id: 'a', roNumber: '101', date: '2026-03-09', paidDate: '2026-03-11', createdAt: '2026-03-11T10:00:00Z' }),
      makeRO({ id: 'b', roNumber: '100', date: '2026-03-10', paidDate: '2026-03-11', createdAt: '2026-03-11T12:00:00Z' }),
      makeRO({ id: 'c', roNumber: '99', date: '2026-03-12', createdAt: '2026-03-12T00:00:00Z' }),
    ];

    const sorted = sortROs(ros, 'date');
    // c: most recent date (2026-03-12)
    // b: same date as a (2026-03-11 via paidDate), but inputted later (12:00 > 10:00)
    // a: same date as b, inputted earlier
    expect(sorted.map(r => r.id)).toEqual(['c', 'b', 'a']);
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
