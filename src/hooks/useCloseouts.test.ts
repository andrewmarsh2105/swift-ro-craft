import { describe, expect, it } from 'vitest';
import { buildROSnapshot } from '@/hooks/useCloseouts';
import type { PayPeriodReport } from '@/hooks/usePayPeriodReport';

const baseReport: PayPeriodReport = {
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  totalHours: 0,
  totalROs: 0,
  totalLines: 0,
  tbdLineCount: 0,
  tbdHours: 0,
  byDay: [],
  byAdvisor: [],
  byLaborType: [],
  byLaborRef: [],
  missingHoursCount: 0,
  needsReviewCount: 0,
  flaggedCount: 0,
  rosInRange: [],
  linesInRange: [],
};

describe('buildROSnapshot', () => {
  it('preserves simple-mode RO paid hours in snapshot totals', () => {
    const report: PayPeriodReport = {
      ...baseReport,
      rosInRange: [
        {
          id: 'ro-simple',
          roNumber: '2001',
          date: '2026-03-10',
          paidDate: undefined,
          advisor: 'Alex',
          paidHours: 2.5,
          laborType: 'warranty',
          workPerformed: 'Diag only',
          lines: [],
          isSimpleMode: true,
          photos: [],
          createdAt: '2026-03-10T00:00:00Z',
          updatedAt: '2026-03-10T00:00:00Z',
        },
      ],
    };

    const [snap] = buildROSnapshot(report);
    expect(snap.totalPaidHours).toBe(2.5);
    expect(snap.wHours).toBe(2.5);
    expect(snap.cpHours).toBe(0);
    expect(snap.iHours).toBe(0);
  });
});
