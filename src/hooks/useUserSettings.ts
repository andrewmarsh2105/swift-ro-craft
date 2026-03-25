import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SummaryRange = 'week' | 'two_weeks';
export type PayPeriodType = 'week' | 'two_weeks' | 'custom';

interface UserSettings {
  theme: string;
  showScanConfidence: boolean;
  showVehicleChips: boolean;
  keywordAutofill: boolean;
  flagInboxDateRange: string;
  flagInboxTypes: string[];
  defaultSummaryRange: SummaryRange;
  defaultTemplateId: string | null;
  weekStartDay: number;
  payPeriodType: PayPeriodType;
  payPeriodEndDates: number[] | null;
  hideTotals: boolean;
  spreadsheetViewMode: string;
  spreadsheetDensity: string;
  spreadsheetGroupBy: string;
  hoursGoalDaily: number;
  hoursGoalWeekly: number;
  hourlyRate: number;
  displayName: string;
  shopName: string;
}

type SaveStatus = 'success' | 'failed' | 'local_only';
export interface SaveSettingResult {
  status: SaveStatus;
  message?: string;
}

const defaults: UserSettings = {
  theme: 'light',
  showScanConfidence: false,
  showVehicleChips: true,
  keywordAutofill: true,
  flagInboxDateRange: 'this_week',
  flagInboxTypes: [],
  defaultSummaryRange: 'week',
  defaultTemplateId: null,
  weekStartDay: 0,
  payPeriodType: 'week',
  payPeriodEndDates: null,
  hideTotals: false,
  spreadsheetViewMode: 'payroll',
  spreadsheetDensity: 'comfortable',
  spreadsheetGroupBy: 'date',
  hoursGoalDaily: 0,
  hoursGoalWeekly: 0,
  hourlyRate: 0,
  displayName: '',
  shopName: '',
};

const GOAL_LS_KEYS = {
  hoursGoalDaily: 'ro-tracker-goal-daily',
  hoursGoalWeekly: 'ro-tracker-goal-weekly',
  hourlyRate: 'ro-tracker-hourly-rate',
} as const;

type GoalKey = keyof typeof GOAL_LS_KEYS;
const PROFILE_LS_KEYS = {
  displayName: 'ro-tracker-display-name',
  shopName: 'ro-tracker-shop-name',
} as const;

type ProfileKey = keyof typeof PROFILE_LS_KEYS;
type FallbackKey = GoalKey | ProfileKey;

const fallbackDbColumns: Record<FallbackKey, string> = {
  hoursGoalDaily: 'hours_goal_daily',
  hoursGoalWeekly: 'hours_goal_weekly',
  hourlyRate: 'hourly_rate',
  displayName: 'display_name',
  shopName: 'shop_name',
};

const dbKeyMap: Record<keyof UserSettings, string> = {
  theme: 'theme',
  showScanConfidence: 'show_scan_confidence',
  showVehicleChips: 'show_vehicle_chips',
  keywordAutofill: 'keyword_autofill',
  flagInboxDateRange: 'flag_inbox_date_range',
  flagInboxTypes: 'flag_inbox_types',
  defaultSummaryRange: 'default_summary_range',
  defaultTemplateId: 'default_template_id',
  weekStartDay: 'week_start_day',
  payPeriodType: 'pay_period_type',
  payPeriodEndDates: 'pay_period_end_dates',
  hideTotals: 'hide_totals',
  spreadsheetViewMode: 'spreadsheet_view_mode',
  spreadsheetDensity: 'spreadsheet_density',
  spreadsheetGroupBy: 'spreadsheet_group_by',
  hoursGoalDaily: 'hours_goal_daily',
  hoursGoalWeekly: 'hours_goal_weekly',
  hourlyRate: 'hourly_rate',
  displayName: 'display_name',
  shopName: 'shop_name',
};

function isMissingColumnError(error: { message?: string; details?: string; hint?: string; code?: string }) {
  const errorText = [error.message, error.details, error.hint].filter(Boolean).join(' ');
  return /column .* does not exist/i.test(errorText)
    || /could not find the .* column/i.test(errorText)
    || error.code === 'PGRST204';
}

export function useUserSettings() {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const settingsRef = useRef<UserSettings>(defaults);
  settingsRef.current = settings;
  const [loaded, setLoaded] = useState(false);

  const getLocalGoal = useCallback((key: GoalKey): number => {
    const raw = localStorage.getItem(GOAL_LS_KEYS[key]);
    return raw !== null ? parseFloat(raw) || 0 : 0;
  }, []);

  const persistLocalGoal = useCallback((key: GoalKey, value: number) => {
    localStorage.setItem(GOAL_LS_KEYS[key], String(value));
  }, []);

  const persistProfileSettingLocally = useCallback((key: ProfileKey, value: string) => {
    localStorage.setItem(PROFILE_LS_KEYS[key], value);
  }, []);

  const getLocalProfileSetting = useCallback((key: ProfileKey) => {
    return localStorage.getItem(PROFILE_LS_KEYS[key]) || '';
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) {
      setSettings(prev => ({
        ...prev,
        displayName: getLocalProfileSetting('displayName'),
        shopName: getLocalProfileSetting('shopName'),
        hoursGoalDaily: getLocalGoal('hoursGoalDaily'),
        hoursGoalWeekly: getLocalGoal('hoursGoalWeekly'),
        hourlyRate: getLocalGoal('hourlyRate'),
      }));
      setLoaded(true);
      return;
    }

    const row = data as typeof data & Record<string, unknown>;
    setSettings({
      theme: data.theme || 'light',
      showScanConfidence: data.show_scan_confidence ?? false,
      showVehicleChips: (row.show_vehicle_chips as boolean | undefined) ?? true,
      keywordAutofill: (row.keyword_autofill as boolean | undefined) ?? true,
      flagInboxDateRange: data.flag_inbox_date_range || 'this_week',
      flagInboxTypes: data.flag_inbox_types || [],
      defaultSummaryRange: (data.default_summary_range as SummaryRange) || 'week',
      defaultTemplateId: (row.default_template_id as string | null | undefined) ?? null,
      weekStartDay: (row.week_start_day as number | undefined) ?? 0,
      payPeriodType: (row.pay_period_type as PayPeriodType | undefined) || 'week',
      payPeriodEndDates: (row.pay_period_end_dates as number[] | null | undefined) ?? null,
      hideTotals: (row.hide_totals as boolean | undefined) ?? false,
      spreadsheetViewMode: (row.spreadsheet_view_mode as string | undefined) || 'payroll',
      spreadsheetDensity: (row.spreadsheet_density as string | undefined) || 'comfortable',
      spreadsheetGroupBy: (row.spreadsheet_group_by as string | undefined) || 'date',
      hoursGoalDaily: (row.hours_goal_daily as number | null | undefined) ?? getLocalGoal('hoursGoalDaily'),
      hoursGoalWeekly: (row.hours_goal_weekly as number | null | undefined) ?? getLocalGoal('hoursGoalWeekly'),
      hourlyRate: (row.hourly_rate as number | null | undefined) ?? getLocalGoal('hourlyRate'),
      displayName: (row.display_name as string | null | undefined) ?? getLocalProfileSetting('displayName'),
      shopName: (row.shop_name as string | null | undefined) ?? getLocalProfileSetting('shopName'),
    });
    setLoaded(true);
  }, [getLocalGoal, getLocalProfileSetting, userId]);

  useEffect(() => {
    if (!userId) {
      setSettings(defaults);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    fetchSettings();
  }, [fetchSettings, userId]);

  const updateSetting = useCallback(async (key: keyof UserSettings, value: UserSettings[keyof UserSettings]): Promise<SaveSettingResult> => {
    if (!userId) {
      return { status: 'failed', message: 'No authenticated user.' };
    }

    const previousValue = settingsRef.current[key];
    if (Object.is(previousValue, value)) {
      return { status: 'success' };
    }

    if (key in GOAL_LS_KEYS) {
      persistLocalGoal(key as GoalKey, Number(value) || 0);
    }
    if (key in PROFILE_LS_KEYS) {
      persistProfileSettingLocally(key as ProfileKey, String(value ?? ''));
    }

    const dbKey = dbKeyMap[key];
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        [dbKey]: value,
      }, { onConflict: 'user_id' });

    if (error) {
      const fallbackKeys = Object.keys(fallbackDbColumns) as FallbackKey[];
      const fallbackKey = fallbackKeys.find(k => fallbackDbColumns[k] === dbKey);

      if (fallbackKey && isMissingColumnError(error)) {
        setSettings(prev => ({ ...prev, [key]: value }));
        return {
          status: 'local_only',
          message: 'Saved on this device. Cloud sync for this setting is not available yet.',
        };
      }

      if (key in GOAL_LS_KEYS) {
        persistLocalGoal(key as GoalKey, Number(previousValue) || 0);
      }
      if (key in PROFILE_LS_KEYS) {
        persistProfileSettingLocally(key as ProfileKey, String(previousValue ?? ''));
      }

      return { status: 'failed', message: 'Failed to save setting. Please try again.' };
    }

    setSettings(prev => ({ ...prev, [key]: value }));
    return { status: 'success' };
  }, [persistLocalGoal, persistProfileSettingLocally, userId]);

  return { settings, loaded, updateSetting };
}
