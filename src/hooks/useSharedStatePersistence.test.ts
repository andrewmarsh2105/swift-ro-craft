import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSharedDateRange } from '@/hooks/useSharedDateRange';
import { useSharedROFilters } from '@/hooks/useSharedROFilters';

describe('shared state persistence guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to provided date filter when persisted filter is invalid', () => {
    localStorage.setItem('ui.sharedDateRange.v1', JSON.stringify({
      dateFilter: 'totally_invalid_filter',
      customStart: '2026-03-01',
      customEnd: '2026-03-15',
    }));

    const { result } = renderHook(() => useSharedDateRange('month'));
    expect(result.current.dateFilter).toBe('month');
    expect(result.current.customStart).toBeUndefined();
    expect(result.current.customEnd).toBeUndefined();
  });

  it('sanitizes persisted RO filters loaded from localStorage', () => {
    localStorage.setItem('ui.sharedROFilters.v1', JSON.stringify({
      searchQuery: 'brakes',
      advisors: ['Alex', 42, null],
      laborTypes: ['warranty', 'invalid', { laborType: 'internal' }],
      payStatus: 'broken',
    }));

    const { result } = renderHook(() => useSharedROFilters());
    expect(result.current.filters).toEqual({
      searchQuery: 'brakes',
      advisors: ['Alex'],
      laborTypes: ['warranty'],
      payStatus: 'all',
    });
  });
});
