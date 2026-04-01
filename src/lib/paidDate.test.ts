import { describe, expect, it } from 'vitest';
import { hasPaidDate, normalizePaidDate } from '@/lib/paidDate';

describe('paidDate helpers', () => {
  it('normalizes empty and placeholder values to null', () => {
    expect(normalizePaidDate(undefined)).toBeNull();
    expect(normalizePaidDate('')).toBeNull();
    expect(normalizePaidDate('   ')).toBeNull();
    expect(normalizePaidDate(' — ')).toBeNull();
  });

  it('trims valid dates', () => {
    expect(normalizePaidDate(' 2026-03-10 ')).toBe('2026-03-10');
  });

  it('hasPaidDate aligns with normalized values', () => {
    expect(hasPaidDate({ paidDate: '' })).toBe(false);
    expect(hasPaidDate({ paidDate: ' — ' })).toBe(false);
    expect(hasPaidDate({ paidDate: '2026-03-10' })).toBe(true);
  });
});
