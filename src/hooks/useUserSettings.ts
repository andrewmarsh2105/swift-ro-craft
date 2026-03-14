import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const [loaded, setLoaded] = useState(false);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setSettings({
        theme: data.theme || 'light',
        showScanConfidence: data.show_scan_confidence ?? false,
        showVehicleChips: (data as any).show_vehicle_chips ?? true,
        keywordAutofill: (data as any).keyword_autofill ?? true,
        flagInboxDateRange: data.flag_inbox_date_range || 'this_week',
        flagInboxTypes: data.flag_inbox_types || [],
        defaultSummaryRange: (data.default_summary_range as SummaryRange) || 'week',
        defaultTemplateId: (data as any).default_template_id || null,
        weekStartDay: (data as any).week_start_day ?? 0,
        payPeriodType: ((data as any).pay_period_type as PayPeriodType) || 'week',
        payPeriodEndDates: (data as any).pay_period_end_dates || null,
        hideTotals: (data as any).hide_totals ?? false,
        spreadsheetViewMode: (data as any).spreadsheet_view_mode || 'payroll',
        spreadsheetDensity: (data as any).spreadsheet_density || 'comfortable',
        spreadsheetGroupBy: (data as any).spreadsheet_group_by || 'date',
        hoursGoalDaily: (data as any).hours_goal_daily ?? 0,
        hoursGoalWeekly: (data as any).hours_goal_weekly ?? 0,
        hourlyRate: (data as any).hourly_rate ?? 0,
        displayName: (data as any).display_name || '',
        shopName: (data as any).shop_name || '',
        accentColor: (data as any).accent_color || 'blue',
      });
    }
    setLoaded(true);
  }, [userId]);

  // When the user changes (sign-out, sign-in, or account switch), reset to defaults
  // first so the SettingsTab sync effect always detects a real value change when the
  // fresh DB data arrives, even if the new values happen to equal old stale values.
  useEffect(() => {
    if (!userId) {
      setSettings(defaults);
      setLoaded(false);
      return;
    }
    setSettings(defaults);
    setLoaded(false);
    fetchSettings();
  }, [userId]); // intentionally omit fetchSettings — userId change is the only trigger we want

  // Apply accent color CSS variables whenever accentColor or loaded changes
  useEffect(() => {
    if (!loaded) return;
    const isDark = document.documentElement.classList.contains('dark');
    const hsl = ACCENT_COLORS[settings.accentColor]?.[isDark ? 'dark' : 'light'] ?? ACCENT_COLORS.blue.light;
    document.documentElement.style.setProperty('--primary', hsl);
    document.documentElement.style.setProperty('--ring', hsl);
    localStorage.setItem('ro-tracker-accent', settings.accentColor);
  }, [settings.accentColor, loaded]);

  const updateSetting = useCallback(async (key: keyof UserSettings, value: any) => {
    if (!userId) return;
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
    if (error) console.error('Failed to save setting', error);
  }, [userId]);

  return { settings, loaded, updateSetting };
}
