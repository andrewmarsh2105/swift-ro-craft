import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type SummaryRange = 'week' | 'two_weeks';
export type PayPeriodType = 'week' | 'two_weeks' | 'custom';

export const ACCENT_COLORS: Record<string, { light: string; dark: string }> = {
  blue:   { light: '214 95% 53%', dark: '214 90% 65%' },
  green:  { light: '142 65% 42%', dark: '142 60% 52%' },
  purple: { light: '263 75% 58%', dark: '263 70% 68%' },
  orange: { light:  '24 90% 50%', dark:  '24 85% 62%' },
  rose:   { light: '346 80% 52%', dark: '346 75% 65%' },
  teal:   { light: '175 75% 40%', dark: '175 70% 52%' },
};

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
  accentColor: string;
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
  accentColor: 'blue',
};

export function useUserSettings() {
  const { user } = useAuth();
  // Use user.id (stable string) so token refreshes (which create a new user object
  // reference) don't re-trigger fetchSettings and race against pending upserts,
  // which would overwrite optimistic updates and clear text fields like displayName.
  const userId = user?.id;
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const settingsRef = useRef<UserSettings>(defaults);
  settingsRef.current = settings;
  const [loaded, setLoaded] = useState(false);

  const persistProfileSettingLocally = useCallback((key: 'displayName' | 'shopName', value: string) => {
    const storageKey = key === 'displayName' ? 'ro-tracker-display-name' : 'ro-tracker-shop-name';
    localStorage.setItem(storageKey, value);
  }, []);

  const getLocalProfileSetting = useCallback((key: 'displayName' | 'shopName') => {
    const storageKey = key === 'displayName' ? 'ro-tracker-display-name' : 'ro-tracker-shop-name';
    return localStorage.getItem(storageKey) || '';
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
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
        hoursGoalDaily: (row.hours_goal_daily as number | undefined) ?? 0,
        hoursGoalWeekly: (row.hours_goal_weekly as number | undefined) ?? 0,
        hourlyRate: (row.hourly_rate as number | undefined) ?? 0,
        displayName: (row.display_name as string | undefined) || getLocalProfileSetting('displayName'),
        shopName: (row.shop_name as string | undefined) || getLocalProfileSetting('shopName'),
        accentColor: (row.accent_color as string | undefined) || 'blue',
      });
    } else {
      setSettings(prev => ({
        ...prev,
        displayName: getLocalProfileSetting('displayName'),
        shopName: getLocalProfileSetting('shopName'),
      }));
    }
    setLoaded(true);
  }, [getLocalProfileSetting, userId]);

  // Sign-out: reset to defaults immediately so no previous user's data is visible.
  // Sign-in / token-refresh re-auth: keep current settings visible while the fetch
  // is in flight so values don't flicker to blank/zero.
  // The SettingsTab sync effect depends on `userSettingsLoaded` (false→true), so it
  // always re-runs when the fetch completes — no need to reset to defaults first.
  useEffect(() => {
    if (!userId) {
      setSettings(defaults);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    fetchSettings();
  }, [fetchSettings, userId]);

  // Apply accent color CSS variables whenever accentColor or loaded changes
  useEffect(() => {
    if (!loaded) return;
    const isDark = document.documentElement.classList.contains('dark');
    const hsl = ACCENT_COLORS[settings.accentColor]?.[isDark ? 'dark' : 'light'] ?? ACCENT_COLORS.blue.light;
    document.documentElement.style.setProperty('--primary', hsl);
    document.documentElement.style.setProperty('--ring', hsl);
    localStorage.setItem('ro-tracker-accent', settings.accentColor);
  }, [settings.accentColor, loaded]);

  const updateSetting = useCallback(async (key: keyof UserSettings, value: UserSettings[keyof UserSettings]) => {
    if (!userId) return;
    const previousValue = settingsRef.current[key];

    if (key === 'displayName' || key === 'shopName') {
      persistProfileSettingLocally(key, value);
    }

    setSettings(prev => ({ ...prev, [key]: value }));

    const dbKey = key === 'showScanConfidence' ? 'show_scan_confidence'
      : key === 'showVehicleChips' ? 'show_vehicle_chips'
      : key === 'keywordAutofill' ? 'keyword_autofill'
      : key === 'flagInboxDateRange' ? 'flag_inbox_date_range'
      : key === 'flagInboxTypes' ? 'flag_inbox_types'
      : key === 'defaultSummaryRange' ? 'default_summary_range'
      : key === 'defaultTemplateId' ? 'default_template_id'
      : key === 'weekStartDay' ? 'week_start_day'
      : key === 'payPeriodType' ? 'pay_period_type'
      : key === 'payPeriodEndDates' ? 'pay_period_end_dates'
      : key === 'hideTotals' ? 'hide_totals'
      : key === 'spreadsheetViewMode' ? 'spreadsheet_view_mode'
      : key === 'spreadsheetDensity' ? 'spreadsheet_density'
      : key === 'spreadsheetGroupBy' ? 'spreadsheet_group_by'
      : key === 'hoursGoalDaily' ? 'hours_goal_daily'
      : key === 'hoursGoalWeekly' ? 'hours_goal_weekly'
      : key === 'hourlyRate' ? 'hourly_rate'
      : key === 'displayName' ? 'display_name'
      : key === 'shopName' ? 'shop_name'
      : key === 'accentColor' ? 'accent_color'
      : key;

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        [dbKey]: value,
      }, { onConflict: 'user_id' });
    if (error) {
      const isMissingProfileColumn =
        (key === 'displayName' || key === 'shopName')
        && /column .* does not exist/i.test(error.message);

      if (isMissingProfileColumn) {
        toast.success('Saved on this device. Cloud sync for profile names is not available yet.');
        return;
      }

      if (key === 'displayName' || key === 'shopName') {
        persistProfileSettingLocally(key, String(previousValue ?? ''));
      }

      setSettings(prev => ({ ...prev, [key]: previousValue }));
      toast.error('Failed to save setting. Please try again.');
    }
  }, [persistProfileSettingLocally, userId]);

  return { settings, loaded, updateSetting };
}
