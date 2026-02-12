import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { RepairOrder, Preset, Settings, DaySummary, AdvisorSummary, LaborType, Advisor, ROLine } from '@/types/ro';

// Map DB row to app RepairOrder
function dbToRO(row: any, lines: any[]): RepairOrder {
  return {
    id: row.id,
    roNumber: row.ro_number,
    date: row.date,
    advisor: row.advisor_name,
    paidHours: lines.reduce((s: number, l: any) => s + Number(l.hours_paid), 0),
    laborType: row.status === 'draft' ? 'customer-pay' : 'customer-pay', // default
    workPerformed: lines.map((l: any) => l.description).filter(Boolean).join('\n'),
    notes: row.notes || undefined,
    lines: lines.map((l: any, i: number) => ({
      id: l.id,
      lineNo: l.line_no,
      description: l.description,
      hoursPaid: Number(l.hours_paid),
      laborType: l.labor_type as LaborType,
      matchedReferenceId: l.matched_reference_id || undefined,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    })),
    isSimpleMode: lines.length === 0,
    photos: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Map DB labor_reference to Preset
function dbToPreset(row: any): Preset {
  return {
    id: row.id,
    name: row.name,
    laborType: row.labor_type_default as LaborType,
    defaultHours: row.default_hours ? Number(row.default_hours) : undefined,
    workTemplate: row.name,
  };
}

const defaultSettings: Settings = {
  recentAdvisors: [],
  advisors: [],
  presets: [],
  showDarkMode: false,
};

export function useROStore() {
  const { user } = useAuth();
  const [ros, setROs] = useState<RepairOrder[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loadingROs, setLoadingROs] = useState(true);

  // Fetch ROs with lines
  const fetchROs = useCallback(async () => {
    if (!user) { setROs([]); setLoadingROs(false); return; }
    setLoadingROs(true);
    try {
      const { data: roRows, error } = await supabase
        .from('ros')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;

      const { data: lineRows, error: lErr } = await supabase
        .from('ro_lines')
        .select('*')
        .order('line_no', { ascending: true });
      if (lErr) throw lErr;

      const linesByRO = new Map<string, any[]>();
      (lineRows || []).forEach((l) => {
        const arr = linesByRO.get(l.ro_id) || [];
        arr.push(l);
        linesByRO.set(l.ro_id, arr);
      });

      const mapped = (roRows || []).map(r => dbToRO(r, linesByRO.get(r.id) || []));
      setROs(mapped);
    } catch (err: any) {
      console.error('Failed to fetch ROs', err);
    } finally {
      setLoadingROs(false);
    }
  }, [user]);

  // Fetch presets (labor_references)
  const fetchPresets = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('labor_references')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const presets = (data || []).map(dbToPreset);

      // Derive unique advisors from ROs
      const advisorSet = new Map<string, Advisor>();
      ros.forEach(ro => {
        if (ro.advisor && !advisorSet.has(ro.advisor)) {
          advisorSet.set(ro.advisor, { id: ro.advisor, name: ro.advisor });
        }
      });

      setSettings(prev => ({
        ...prev,
        presets,
        advisors: Array.from(advisorSet.values()),
        recentAdvisors: Array.from(advisorSet.keys()).slice(0, 6),
      }));
    } catch (err: any) {
      console.error('Failed to fetch presets', err);
    }
  }, [user, ros]);

  useEffect(() => { fetchROs(); }, [fetchROs]);
  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  const clearAllROs = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('ros').delete().eq('user_id', user.id);
    if (error) { toast.error('Failed to clear ROs'); return; }
    setROs([]);
  }, [user]);

  const addRO = useCallback(async (ro: Omit<RepairOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const paidHours = ro.isSimpleMode ? ro.paidHours : ro.lines.reduce((s, l) => s + l.hoursPaid, 0);

    const { data: newRow, error } = await supabase
      .from('ros')
      .insert({
        user_id: user.id,
        ro_number: ro.roNumber,
        date: ro.date,
        advisor_name: ro.advisor,
        notes: ro.notes || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error || !newRow) { toast.error('Failed to create RO'); return; }

    // Insert lines
    if (ro.lines.length > 0) {
      const lineInserts = ro.lines.map((l, i) => ({
        ro_id: newRow.id,
        user_id: user.id,
        line_no: i + 1,
        description: l.description,
        labor_type: l.laborType as any,
        hours_paid: l.hoursPaid,
        matched_reference_id: l.matchedReferenceId || null,
      }));
      const { error: lErr } = await supabase.from('ro_lines').insert(lineInserts);
      if (lErr) console.error('Failed to insert lines', lErr);
    }

    await fetchROs();
    return dbToRO(newRow, ro.lines as any[]);
  }, [user, fetchROs]);

  const updateRO = useCallback(async (id: string, updates: Partial<RepairOrder>) => {
    if (!user) return;

    const dbUpdates: any = {};
    if (updates.roNumber !== undefined) dbUpdates.ro_number = updates.roNumber;
    if (updates.advisor !== undefined) dbUpdates.advisor_name = updates.advisor;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('ros').update(dbUpdates).eq('id', id);
      if (error) { toast.error('Failed to update RO'); return; }
    }

    // Replace lines if provided
    if (updates.lines) {
      await supabase.from('ro_lines').delete().eq('ro_id', id);
      if (updates.lines.length > 0) {
        const lineInserts = updates.lines.map((l, i) => ({
          ro_id: id,
          user_id: user.id,
          line_no: i + 1,
          description: l.description,
          labor_type: l.laborType as any,
          hours_paid: l.hoursPaid,
          matched_reference_id: l.matchedReferenceId || null,
        }));
        await supabase.from('ro_lines').insert(lineInserts);
      }
    }

    await fetchROs();
  }, [user, fetchROs]);

  const deleteRO = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('ros').delete().eq('id', id);
    if (error) { toast.error('Failed to delete RO'); return; }
    setROs(prev => prev.filter(ro => ro.id !== id));
  }, [user]);

  const duplicateRO = useCallback(async (id: string) => {
    const ro = ros.find(r => r.id === id);
    if (!ro) return;
    return addRO({ ...ro, roNumber: '' });
  }, [ros, addRO]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePresets = useCallback(async (presets: Preset[]) => {
    if (!user) return;
    setSettings(prev => ({ ...prev, presets }));
    // Sync to DB: delete all, re-insert
    await supabase.from('labor_references').delete().eq('user_id', user.id);
    if (presets.length > 0) {
      const rows = presets.map((p, i) => ({
        user_id: user.id,
        name: p.name,
        labor_type_default: p.laborType as any,
        default_hours: p.defaultHours || 0,
        sort_order: i,
        active: true,
      }));
      await supabase.from('labor_references').insert(rows);
    }
    await fetchPresets();
  }, [user, fetchPresets]);

  const updateAdvisors = useCallback((advisors: Advisor[]) => {
    setSettings(prev => ({ ...prev, advisors }));
  }, []);

  // Summary calculations
  const getDaySummaries = useCallback((startDate: string, endDate: string): DaySummary[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const summaries: DaySummary[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayROs = ros.filter(ro => ro.date === dateStr);
      summaries.push({
        date: dateStr,
        totalHours: dayROs.reduce((sum, ro) => sum + ro.paidHours, 0),
        roCount: dayROs.length,
        warrantyHours: dayROs.filter(ro => ro.laborType === 'warranty').reduce((sum, ro) => sum + ro.paidHours, 0),
        customerPayHours: dayROs.filter(ro => ro.laborType === 'customer-pay').reduce((sum, ro) => sum + ro.paidHours, 0),
        internalHours: dayROs.filter(ro => ro.laborType === 'internal').reduce((sum, ro) => sum + ro.paidHours, 0),
      });
    }
    return summaries;
  }, [ros]);

  const getAdvisorSummaries = useCallback((startDate?: string, endDate?: string): AdvisorSummary[] => {
    let filteredROs = ros;
    if (startDate && endDate) {
      filteredROs = ros.filter(ro => ro.date >= startDate && ro.date <= endDate);
    }
    const advisorMap = new Map<string, AdvisorSummary>();
    filteredROs.forEach(ro => {
      const existing = advisorMap.get(ro.advisor);
      if (existing) {
        existing.totalHours += ro.paidHours;
        existing.roCount += 1;
      } else {
        advisorMap.set(ro.advisor, { advisor: ro.advisor, totalHours: ro.paidHours, roCount: 1 });
      }
    });
    return Array.from(advisorMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [ros]);

  const getWeekTotal = useCallback((startDate: string, endDate: string) => {
    const weekROs = ros.filter(ro => ro.date >= startDate && ro.date <= endDate);
    return {
      totalHours: weekROs.reduce((sum, ro) => sum + ro.paidHours, 0),
      roCount: weekROs.length,
      warrantyHours: weekROs.filter(ro => ro.laborType === 'warranty').reduce((sum, ro) => sum + ro.paidHours, 0),
      customerPayHours: weekROs.filter(ro => ro.laborType === 'customer-pay').reduce((sum, ro) => sum + ro.paidHours, 0),
      internalHours: weekROs.filter(ro => ro.laborType === 'internal').reduce((sum, ro) => sum + ro.paidHours, 0),
    };
  }, [ros]);

  return {
    ros,
    settings,
    loadingROs,
    addRO,
    updateRO,
    deleteRO,
    duplicateRO,
    clearAllROs,
    updateSettings,
    updatePresets,
    updateAdvisors,
    getDaySummaries,
    getAdvisorSummaries,
    getWeekTotal,
  };
}
