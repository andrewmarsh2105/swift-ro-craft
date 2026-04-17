import { describe, expect, it } from 'vitest';
import { buildSpiffReport, normalizeSpiffManualEntries, normalizeSpiffRules } from '@/lib/spiffUtils';
import type { RepairOrder } from '@/types/ro';

const ro: RepairOrder = {
  id: 'ro-1',
  roNumber: '101',
  date: '2026-04-14',
  paidDate: '2026-04-14',
  advisor: 'A',
  paidHours: 2,
  laborType: 'customer-pay',
  workPerformed: 'x',
  notes: '',
  photos: [],
  lines: [
    { id: 'line-1', lineNo: 1, description: 'Cabin Filter replacement', hoursPaid: 1, laborType: 'customer-pay', createdAt: '', updatedAt: '' },
    { id: 'line-2', lineNo: 2, description: 'Brake flush', hoursPaid: 1, laborType: 'customer-pay', createdAt: '', updatedAt: '' },
  ],
  isSimpleMode: false,
  createdAt: '',
  updatedAt: '',
};

describe('spiffUtils', () => {
  it('builds automatic + manual totals', () => {
    const rules = normalizeSpiffRules([
      { id: 'r1', name: 'Cabin', matchText: 'cabin filter', unitPay: 10, scheduleType: 'forever' },
      { id: 'r2', name: 'Brake', matchText: 'brake', unitPay: 15, scheduleType: 'weekly', activeFrom: '2026-04-13', activeTo: '2026-04-19' },
    ]);
    const manual = normalizeSpiffManualEntries([
      { id: 'm1', date: '2026-04-14', label: 'Walk-in', quantity: 2, unitPay: 7 },
      { id: 'm2', date: '2026-04-14', label: 'Extra cabin', quantity: 1, ruleId: 'r1', unitPay: 10 },
    ]);

    const report = buildSpiffReport({ ros: [ro], startDate: '2026-04-10', endDate: '2026-04-17', rules, manualEntries: manual });

    expect(report.totalAutoCount).toBe(2);
    expect(report.totalManualCount).toBe(3);
    expect(report.totalCount).toBe(5);
    expect(report.totalPay).toBe(49);
    expect(report.byRule.find((r) => r.ruleId === 'r1')?.totalCount).toBe(2);
  });
});
