import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SummaryRange = 'week' | 'two_weeks';

interface UserSettings {
  theme: string;
  showScanConfidence: boolean;
  showVehicleChips: boolean;
  flagInboxDateRange: string;
  flagInboxTypes: string[];
  defaultSummaryRange: SummaryRange;
  defaultTemplateId: string | null;
}

const defaults: UserSettings = {
  theme: 'light',
  showScanConfidence: false,
  showVehicleChips: true,
  flagInboxDateRange: 'this_week',
  flagInboxTypes: [],
  defaultSummaryRange: 'week',
  defaultTemplateId: null,
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
        flagInboxDateRange: data.flag_inbox_date_range || 'this_week',
        flagInboxTypes: data.flag_inbox_types || [],
        defaultSummaryRange: (data.default_summary_range as SummaryRange) || 'week',
        defaultTemplateId: (data as any).default_template_id || null,
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
      : key === 'flagInboxDateRange' ? 'flag_inbox_date_range'
      : key === 'flagInboxTypes' ? 'flag_inbox_types'
      : key === 'defaultSummaryRange' ? 'default_summary_range'
      : key === 'defaultTemplateId' ? 'default_template_id'
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
