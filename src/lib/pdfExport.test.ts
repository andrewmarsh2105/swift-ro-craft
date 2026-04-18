import { describe, expect, it } from 'vitest';
import { buildSpiffSummaryData } from '@/lib/pdfExport';
import type { RepairOrder } from '@/types/ro';
import type { SpiffRule } from '@/types/spiff';

const baseRO: RepairOrder = {
  id: 'ro-1',
  roNumber: '5001',
  date: '2026-04-10',
  paidDate: '2026-04-10',
  advisor: 'Alex',
  customerName: 'Taylor',
  vehicle: { year: 2024, make: 'Toyota', model: 'Camry' },
  mileage: '10000',
  paidHours: 1.2,
  laborType: 'customer-pay',
  workPerformed: 'Flush',
  notes: '',
  lines: [{
    id: 'line-1',
    lineNo: 1,
    description: 'Cabin filter replacement',
    hoursPaid: 1.2,
    laborType: 'customer-pay',
    createdAt: '2026-04-10T00:00:00Z',
    updatedAt: '2026-04-10T00:00:00Z',
  }],
  isSimpleMode: false,
  photos: [],
  createdAt: '2026-04-10T00:00:00Z',
  updatedAt: '2026-04-10T00:00:00Z',
};

const rule: SpiffRule = {
  id: 'rule-1',
  name: 'Cabin Filter',
  matchText: 'cabin filter',
  unitPay: 10,
  scheduleType: 'forever',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('buildSpiffSummaryData', () => {
  it('returns rollup totals and rule breakdown', () => {
    const summary = buildSpiffSummaryData({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      rosInRange: [baseRO],
      spiffRules: [rule],
      spiffManualEntries: [{
        id: 'manual-1',
        date: '2026-04-15',
        label: 'Walk-in upsell',
        quantity: 2,
        unitPay: 5,
        createdAt: '2026-04-15T00:00:00Z',
        updatedAt: '2026-04-15T00:00:00Z',
      }],
    });

    expect(summary.hasSpiffs).toBe(true);
    expect(summary.totalAutoCount).toBe(1);
    expect(summary.totalManualCount).toBe(2);
    expect(summary.totalCount).toBe(3);
    expect(summary.totalPay).toBe(20);
    expect(summary.byRule[0]).toMatchObject({ ruleName: 'Cabin Filter', totalCount: 1, totalPay: 10 });
  });

  it('returns empty state when no spiffs in range', () => {
    const summary = buildSpiffSummaryData({
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      rosInRange: [baseRO],
      spiffRules: [],
      spiffManualEntries: [],
    });

    expect(summary.hasSpiffs).toBe(false);
    expect(summary.totalCount).toBe(0);
    expect(summary.byRule).toHaveLength(0);
  });
});
