import { useState, useCallback, useEffect } from 'react';
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
};

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [loaded, setLoaded] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
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
      });
    }
    setLoaded(true);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = useCallback(async (key: keyof UserSettings, value: any) => {
    if (!user) return;
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
      : key;
    
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        [dbKey]: value,
      }, { onConflict: 'user_id' });
    if (error) console.error('Failed to save setting', error);
  }, [user]);

  return { settings, loaded, updateSetting };
}
