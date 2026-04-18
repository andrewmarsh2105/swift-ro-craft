import { describe, expect, it } from 'vitest';
import { buildROBackupData } from '@/lib/backupExport';
import type { RepairOrder } from '@/types/ro';

describe('buildROBackupData', () => {
  it('includes core RO archive fields and line data', () => {
    const ros: RepairOrder[] = [{
      id: 'ro-1',
      roNumber: '1001',
      date: '2026-04-01',
      advisor: 'Alex',
      customerName: 'Taylor',
      vehicle: { year: 2025, make: 'Honda', model: 'Accord', vin: 'VIN123' },
      mileage: '12345',
      paidHours: 2.5,
      laborType: 'customer-pay',
      workPerformed: 'Brake inspection',
      notes: 'Customer waiting',
      paidDate: '2026-04-02',
      photos: [],
      lines: [{
        id: 'line-1',
        lineNo: 1,
        description: 'Inspect brakes',
        hoursPaid: 2.5,
        laborType: 'customer-pay',
        createdAt: '2026-04-01T10:00:00Z',
        updatedAt: '2026-04-01T10:00:00Z',
      }],
      isSimpleMode: false,
      createdAt: '2026-04-01T10:00:00Z',
      updatedAt: '2026-04-01T10:00:00Z',
    }];

    const data = buildROBackupData(ros);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      roNumber: '1001',
      date: '2026-04-01',
      advisor: 'Alex',
      customerName: 'Taylor',
      mileage: '12345',
      notes: 'Customer waiting',
      paidDate: '2026-04-02',
    });
    expect(data[0].lines[0]).toMatchObject({
      lineNo: 1,
      laborType: 'customer-pay',
      hoursPaid: 2.5,
    });
  });
});
