import { describe, expect, it } from 'vitest';
import { buildCloseoutCSV } from '@/lib/closeoutExport';
import type { CloseoutSnapshot } from '@/hooks/useCloseouts';

const baseCloseout: CloseoutSnapshot = {
  id: 'closeout-1',
  rangeType: 'pay_period',
  periodStart: '2026-03-01',
  periodEnd: '2026-03-15',
  closedAt: '2026-03-16T00:00:00Z',
  totals: {
    totalHours: 0,
    customerPayHours: 0,
    warrantyHours: 0,
    internalHours: 0,
    flaggedCount: 0,
    needsReviewCount: 0,
    tbdCount: 0,
    totalROs: 0,
    totalLines: 0,
  },
  breakdowns: {
    byDay: [],
    byAdvisor: [],
    byLaborType: [],
    byLaborRef: [],
  },
  roSnapshot: [],
  roIds: [],
};

describe('buildCloseoutCSV', () => {
  it('keeps period totals aligned with exported rows when a simple-mode RO exists', () => {
    const csv = buildCloseoutCSV({
      ...baseCloseout,
      roSnapshot: [
        {
          roId: 'ro-simple',
          roNumber: '2002',
          roDate: '2026-03-02',
          advisor: 'Alex',
          totalPaidHours: 2.5,
          cpHours: 2.5,
          wHours: 0,
          iHours: 0,
          lines: [],
        },
      ],
    }, 'payroll');

    expect(csv).toContain('"Simple entry"');
    expect(csv).toContain('"PERIOD TOTAL"');
    expect(csv).toContain('"2.50"');
  });
});
