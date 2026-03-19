import { describe, expect, it } from 'vitest';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';

describe('getCustomPayPeriodRange', () => {
  it('returns fallback current month when no end dates provided', () => {
    const range = getCustomPayPeriodRange([], new Date(2026, 2, 19));
    expect(range).toEqual({ start: '2026-03-01', end: '2026-03-31' });
  });

  it('handles standard semimonthly periods', () => {
    const range = getCustomPayPeriodRange([15, 30], new Date(2026, 2, 19));
    expect(range).toEqual({ start: '2026-03-16', end: '2026-03-30' });
  });

  it('correctly clamps month-end boundaries across short months', () => {
    // February 2026 has 28 days. End dates [15, 31] means the period ending
    // on Feb 15 should start the day after Jan 31 => Feb 1.
    const range = getCustomPayPeriodRange([15, 31], new Date(2026, 1, 2));
    expect(range).toEqual({ start: '2026-02-01', end: '2026-02-15' });
  });

  it('returns wrap period after the last end day', () => {
    const range = getCustomPayPeriodRange([10, 25], new Date(2026, 2, 28));
    expect(range).toEqual({ start: '2026-03-26', end: '2026-04-10' });
  });
});
