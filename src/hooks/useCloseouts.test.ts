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

  it('excludes TBD and blank-description lines from paid totals while retaining full line snapshot', () => {
    const report: PayPeriodReport = {
      ...baseReport,
      rosInRange: [
        {
          id: 'ro-lines',
          roNumber: '3001',
          date: '2026-03-12',
          paidDate: '—',
          advisor: 'Sam',
          paidHours: 0,
          laborType: 'customer-pay',
          workPerformed: '',
          lines: [
            {
              id: 'l1',
              lineNo: 1,
              description: 'Brake replacement',
              hoursPaid: 2,
              laborType: 'customer-pay',
              createdAt: '2026-03-12T00:00:00Z',
              updatedAt: '2026-03-12T00:00:00Z',
            },
            {
              id: 'l2',
              lineNo: 2,
              description: '',
              hoursPaid: 5,
              laborType: 'warranty',
              createdAt: '2026-03-12T00:00:00Z',
              updatedAt: '2026-03-12T00:00:00Z',
            },
            {
              id: 'l3',
              lineNo: 3,
              description: 'Need parts',
              hoursPaid: 1.5,
              laborType: 'internal',
              isTbd: true,
              createdAt: '2026-03-12T00:00:00Z',
              updatedAt: '2026-03-12T00:00:00Z',
            },
          ],
          isSimpleMode: false,
          photos: [],
          createdAt: '2026-03-12T00:00:00Z',
          updatedAt: '2026-03-12T00:00:00Z',
          customerName: 'Jordan',
          mileage: '130500',
          vehicle: { year: 2021, make: 'Subaru', model: 'Outback' },
        },
      ],
    };

    const [snap] = buildROSnapshot(report);

    expect(snap.roDate).toBe('2026-03-12');
    expect(snap.vehicle).toBe("'21 Subaru Outback");
    expect(snap.totalPaidHours).toBe(2);
    expect(snap.cpHours).toBe(2);
    expect(snap.wHours).toBe(0);
    expect(snap.iHours).toBe(0);
    expect(snap.lines).toHaveLength(3);
    expect(snap.lines.find(l => l.lineId === 'l3')?.isTbd).toBe(true);
  });
});
