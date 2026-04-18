import { describe, expect, it } from 'vitest';
import { generateSummaryText } from '@/lib/exportUtils';
import type { PayPeriodReport } from '@/hooks/usePayPeriodReport';

describe('exportUtils', () => {
  it('generateSummaryText includes warnings section when flags exist', () => {
    const report = {
      startDate: '2026-03-01',
      endDate: '2026-03-15',
      totalHours: 10.5,
      totalROs: 4,
      totalLines: 7,
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

    expect(text).toContain('WARNINGS:');
    expect(text).toContain('🚩 3 flagged items');
  });

  it('generateSummaryText omits warnings section when there are no flags', () => {
    const report = {
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      totalHours: 6.7,
      totalROs: 1,
      totalLines: 1,
      byDay: [],
      byAdvisor: [],
      byLaborType: [],
      byLaborRef: [],
      missingHoursCount: 0,
      needsReviewCount: 0,
      flaggedCount: 0,
      rosInRange: [],
      linesInRange: [],
    } satisfies PayPeriodReport;

    const text = generateSummaryText(report);
    expect(text).not.toContain('WARNINGS:');
  });
});
