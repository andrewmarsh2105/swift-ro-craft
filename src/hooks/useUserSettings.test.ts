import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockUpsert, mockMaybeSingle } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockUpsert = vi.fn();
  return { mockUpsert, mockMaybeSingle };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      upsert: mockUpsert,
    }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-abc', email: 'test@example.com' } }),
}));

import { useUserSettings } from './useUserSettings';

function setLS(key: string, value: string) {
  localStorage.setItem(key, value);
}

function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'user-abc',
    theme: 'light',
    show_scan_confidence: false,
    show_vehicle_chips: true,
    keyword_autofill: true,
    flag_inbox_date_range: 'this_week',
    flag_inbox_types: [],
    default_summary_range: 'week',
    default_template_id: null,
    week_start_day: 0,
    pay_period_type: 'week',
    pay_period_end_dates: null,
    hide_totals: false,
    spreadsheet_view_mode: 'payroll',
    spreadsheet_density: 'comfortable',
    spreadsheet_group_by: 'date',
    hours_goal_daily: 0,
    hours_goal_weekly: 0,
    hourly_rate: 0,
    display_name: '',
    shop_name: '',
    ...overrides,
  };
}

describe('useUserSettings unified persistence flow', () => {
  let dbRow: ReturnType<typeof makeDbRow> | null;

  beforeEach(() => {
    localStorage.clear();
    dbRow = makeDbRow();

    mockMaybeSingle.mockReset();
    mockUpsert.mockReset();

    mockMaybeSingle.mockImplementation(async () => ({ data: dbRow }));
    mockUpsert.mockImplementation(async (payload: Record<string, unknown>) => {
      dbRow = { ...(dbRow || makeDbRow()), ...payload } as ReturnType<typeof makeDbRow>;
      return { error: null };
    });
  });

  it('saves displayName successfully', async () => {
    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      const res = await result.current.updateSetting('displayName', 'Mike');
      expect(res.status).toBe('success');
    });

    expect(result.current.settings.displayName).toBe('Mike');
    expect(dbRow?.display_name).toBe('Mike');
  });

  it('saves shopName successfully', async () => {
    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      const res = await result.current.updateSetting('shopName', "Smith's Auto");
      expect(res.status).toBe('success');
    });

    expect(result.current.settings.shopName).toBe("Smith's Auto");
    expect(dbRow?.shop_name).toBe("Smith's Auto");
  });

  it('saves daily goal successfully', async () => {
    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      const res = await result.current.updateSetting('hoursGoalDaily', 8);
      expect(res.status).toBe('success');
    });

    expect(result.current.settings.hoursGoalDaily).toBe(8);
    expect(dbRow?.hours_goal_daily).toBe(8);
  });

  it('saves weekly goal successfully', async () => {
    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      const res = await result.current.updateSetting('hoursGoalWeekly', 42);
      expect(res.status).toBe('success');
    });

    expect(result.current.settings.hoursGoalWeekly).toBe(42);
    expect(dbRow?.hours_goal_weekly).toBe(42);
  });

  it('saves hourly rate successfully', async () => {
    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      const res = await result.current.updateSetting('hourlyRate', 35.5);
      expect(res.status).toBe('success');
    });

    expect(result.current.settings.hourlyRate).toBe(35.5);
    expect(dbRow?.hourly_rate).toBe(35.5);
  });

  it('reloads and confirms values persist', async () => {
    dbRow = makeDbRow({
      display_name: 'Reload Name',
      shop_name: 'Reload Shop',
      hours_goal_daily: 7,
      hours_goal_weekly: 38,
      hourly_rate: 32,
    });

    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings.displayName).toBe('Reload Name');
    expect(result.current.settings.shopName).toBe('Reload Shop');
    expect(result.current.settings.hoursGoalDaily).toBe(7);
    expect(result.current.settings.hoursGoalWeekly).toBe(38);
    expect(result.current.settings.hourlyRate).toBe(32);
  });

  it('keeps one source of truth for summary/account settings fields', async () => {
    dbRow = makeDbRow({
      display_name: 'One Source',
      shop_name: 'Truth Shop',
      hours_goal_daily: 6,
      hours_goal_weekly: 30,
      hourly_rate: 28,
    });

    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings.displayName).toBe('One Source');
    expect(result.current.settings.shopName).toBe('Truth Shop');
    expect(result.current.settings.hoursGoalDaily).toBe(6);
    expect(result.current.settings.hoursGoalWeekly).toBe(30);
    expect(result.current.settings.hourlyRate).toBe(28);
  });

  it('failed save does not leave UI state misleading', async () => {
    dbRow = makeDbRow({ display_name: 'Old Name' });
    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    mockUpsert.mockResolvedValueOnce({
      error: { message: 'network error', code: '500', details: '', hint: '' },
    });

    let saveResult: Awaited<ReturnType<typeof result.current.updateSetting>> | null = null;
    await act(async () => {
      saveResult = await result.current.updateSetting('displayName', 'New Name');
    });

    expect(saveResult?.status).toBe('failed');
    expect(result.current.settings.displayName).toBe('Old Name');
    expect(localStorage.getItem('ro-tracker-display-name')).toBe('Old Name');
  });

  it('local fallback does not overwrite valid saved values on fetch', async () => {
    setLS('ro-tracker-display-name', 'Stale Local Name');
    setLS('ro-tracker-goal-daily', '99');
    dbRow = makeDbRow({ display_name: 'Cloud Name', hours_goal_daily: 5 });

    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.settings.displayName).toBe('Cloud Name');
    expect(result.current.settings.hoursGoalDaily).toBe(5);
  });

  it('uses local-only fallback when a settings column is unavailable', async () => {
    const { result } = renderHook(() => useUserSettings());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    mockUpsert.mockResolvedValueOnce({
      error: { message: 'column "display_name" does not exist', code: '42703', details: '', hint: '' },
    });

    await act(async () => {
      const saveResult = await result.current.updateSetting('displayName', 'Local Only');
      expect(saveResult.status).toBe('local_only');
    });

    expect(result.current.settings.displayName).toBe('Local Only');
    expect(localStorage.getItem('ro-tracker-display-name')).toBe('Local Only');
  });
});
