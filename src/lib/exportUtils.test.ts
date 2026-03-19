import { describe, expect, it } from 'vitest';
import { generateLineCSV, generateSummaryText } from '@/lib/exportUtils';
import type { PayPeriodReport } from '@/hooks/usePayPeriodReport';
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

describe('exportUtils', () => {
  it('generateLineCSV includes only paid non-TBD lines and groups RO details by first line', () => {
    const ro = makeRO({
      id: 'ro-1',
      roNumber: '2001',
      date: '2026-03-03',
      advisor: 'Alex',
      customerName: 'Pat',
      vehicle: { year: 2024, make: 'Honda', model: 'Civic' },
      lines: [
        { id: 'a', lineNo: 1, description: 'Paid line', hoursPaid: 1.25, laborType: 'customer-pay', createdAt: '', updatedAt: '' },
        { id: 'b', lineNo: 2, description: '', hoursPaid: 2, laborType: 'warranty', createdAt: '', updatedAt: '' },
        { id: 'c', lineNo: 3, description: 'TBD line', hoursPaid: 0.5, laborType: 'internal', isTbd: true, createdAt: '', updatedAt: '' },
      ],
    });

    const report = {
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      totalHours: 1.25,
      totalROs: 1,
      totalLines: 3,
      tbdLineCount: 1,
      tbdHours: 0.5,
      byDay: [],
      byAdvisor: [],
      byLaborType: [],
      byLaborRef: [],
      missingHoursCount: 0,
      needsReviewCount: 0,
      flaggedCount: 0,
      rosInRange: [ro],
      linesInRange: ro.lines.map(line => ({ ro, line })),
    } satisfies PayPeriodReport;

    const csv = generateLineCSV(report);
    const rows = csv.replace(/^\uFEFF/, '').split('\n');

    expect(rows).toHaveLength(2); // header + 1 paid row
    expect(rows[1]).toContain('"2001"');
    expect(rows[1]).toContain('"1.25"');
    expect(rows[1]).toContain("\"'24 Honda Civic\"");
    expect(rows[1]).not.toContain('TBD line');
  });

  it('generateSummaryText includes TBD and warning sections when counts exist', () => {
    const report = {
      startDate: '2026-03-01',
      endDate: '2026-03-15',
      totalHours: 10.5,
      totalROs: 4,
      totalLines: 7,
      tbdLineCount: 2,
      tbdHours: 1.2,
      byDay: [{ date: '2026-03-02', totalHours: 2.5, roCount: 1, warrantyHours: 0, customerPayHours: 2.5, internalHours: 0 }],
      byAdvisor: [{ advisor: 'Alex', totalHours: 10.5, roCount: 4, warrantyHours: 1, customerPayHours: 8, internalHours: 1.5 }],
      byLaborType: [{ laborType: 'customer-pay', label: 'Customer Pay', totalHours: 8, lineCount: 5 }],
      byLaborRef: [],
      missingHoursCount: 0,
      needsReviewCount: 1,
      flaggedCount: 3,
      rosInRange: [],
      linesInRange: [],
    } satisfies PayPeriodReport;

    const text = generateSummaryText(report);

    expect(text).toContain('TBD: 2 lines (1.2h) — not counted in totals');
    expect(text).toContain('WARNINGS:');
    expect(text).toContain('🚩 3 flagged items');
  });
});
