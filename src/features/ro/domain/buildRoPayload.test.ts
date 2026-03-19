import { describe, expect, it } from 'vitest';
import { buildRoPayload, type ReturnTypeUseAddROFormState } from '@/features/ro/domain/buildRoPayload';

describe('buildRoPayload', () => {
  it('maps form fields and normalizes empty optional strings to undefined', () => {
    const form: ReturnTypeUseAddROFormState = {
      roNumber: '1234',
      date: '2026-03-19',
      advisor: 'Alex',
      customerName: '',
      mileage: '',
      notes: '',
      laborType: 'customer-pay',
      lines: [],
      vehicle: { year: 2023, make: 'Ford', model: 'F-150' },
    };

    const payload = buildRoPayload(form);

    expect(payload.customerName).toBeUndefined();
    expect(payload.mileage).toBeUndefined();
    expect(payload.notes).toBeUndefined();
    expect(payload.isSimpleMode).toBe(true);
    expect(payload.paidHours).toBe(0);
    expect(payload.paidDate).toBeUndefined();
  });

  it('renumbers lines sequentially and keeps line data stable for create/duplicate flows', () => {
    const form: ReturnTypeUseAddROFormState = {
      roNumber: '1234',
      date: '2026-03-19',
      advisor: 'Alex',
      customerName: 'Pat',
      mileage: '102000',
      notes: 'note',
      laborType: 'warranty',
      vehicle: undefined,
      lines: [
        {
          id: 'line-a',
          lineNo: 99,
          description: 'Diag',
          hoursPaid: 1.5,
          laborType: 'warranty',
          createdAt: 'x',
          updatedAt: 'x',
        },
        {
          id: 'line-b',
          lineNo: 4,
          description: 'Repair',
          hoursPaid: 2.3,
          laborType: 'internal',
          createdAt: 'x',
          updatedAt: 'x',
        },
      ],
    };

    const payload = buildRoPayload(form);

    expect(payload.isSimpleMode).toBe(false);
    expect(payload.lines.map(l => l.lineNo)).toEqual([1, 2]);
    expect(payload.lines.map(l => l.id)).toEqual(['line-a', 'line-b']);
    expect(payload.lines.map(l => l.hoursPaid)).toEqual([1.5, 2.3]);
  });
});
