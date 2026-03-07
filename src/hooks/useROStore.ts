import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { toast } from 'sonner';
import { pushDebug } from '@/lib/debug';
import type { RepairOrder, Preset, Settings, DaySummary, AdvisorSummary, LaborType, Advisor, ROLine } from '@/types/ro';
import {
  dbToRepairOrder,
  groupLinesByRoId,
  toRoLineInserts,
  toRosInsert,
  toRosUpdate,
  type RoLineRow,
  type RoRow,
} from '@/features/ro/data/roMapper';

type AdvisorRow = Database["public"]["Tables"]["advisors"]["Row"];
type LaborReferenceRow = Database["public"]["Tables"]["labor_references"]["Row"];
type LaborTypeDb = Database["public"]["Enums"]["labor_type"];

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

function dbToPreset(row: LaborReferenceRow): Preset {
  return {
    id: row.id,
    name: row.name,
    laborType: row.labor_type_default as unknown as LaborType,
    defaultHours: row.default_hours ? Number(row.default_hours) : undefined,
    workTemplate: row.name,
    isFavorite: !!row.is_favorite,
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
  const { isOnline, queueAction, registerRefresh } = useOffline();
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
        .order('date', { ascending: false })
        .limit(10000);
      if (error) throw error;

      const { data: lineRows, error: lErr } = await supabase
        .from('ro_lines')
        .select('*')
        .order('line_no', { ascending: true })
        .limit(10000);
      if (lErr) throw lErr;

      const linesByRO = groupLinesByRoId((lineRows || []) as RoLineRow[]);

      const mapped = (roRows || []).map((r) =>
        dbToRepairOrder(r as RoRow, linesByRO.get((r as RoRow).id) || [])
      );
      setROs(mapped);
      const totalLines = (lineRows || []).length;
      pushDebug({ action: `fetchROs OK: ${mapped.length} ROs, ${totalLines} lines` });
    } catch (err: unknown) {
      console.error('Failed to fetch ROs', err);
      pushDebug({ action: 'fetchROs FAIL', error: errorMessage(err) });
    } finally {
      setLoadingROs(false);
    }
  }, [user]);

  // Track whether an updatePresets operation is in flight to prevent races
  const presetsUpdating = useRef(false);

  // Fetch presets (labor_references)
  const fetchPresets = useCallback(async () => {
    if (!user) return;
    // Skip if an updatePresets call is in progress to prevent race conditions
    if (presetsUpdating.current) return;
    try {
      const { data, error } = await supabase
        .from('labor_references')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const presets = (data || []).map(dbToPreset);

      setSettings(prev => ({
        ...prev,
        presets,
      }));
    } catch (err: unknown) {
      console.error('Failed to fetch presets', err);
    }
  }, [user]);

  // Fetch advisors from DB
  const fetchAdvisors = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('advisors')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      const advisors: Advisor[] = (data || []).map((r) => {
        const row = r as AdvisorRow;
        return { id: row.id, name: row.name };
      });
      setSettings(prev => ({
        ...prev,
        advisors,
        recentAdvisors: advisors.map(a => a.name).slice(0, 6),
      }));
    } catch (err: unknown) {
      console.error('Failed to fetch advisors', err);
    }
  }, [user]);

  useEffect(() => { fetchROs(); }, [fetchROs]);
  useEffect(() => { fetchPresets(); }, [fetchPresets]);
  useEffect(() => { fetchAdvisors(); }, [fetchAdvisors]);

  // Register refresh callback for offline sync
  useEffect(() => {
    registerRefresh(async () => {
      await fetchROs();
      await fetchPresets();
      await fetchAdvisors();
    });
  }, [registerRefresh, fetchROs, fetchPresets, fetchAdvisors]);

  const clearAllROs = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('ros').delete().eq('user_id', user.id);
    if (error) { toast.error('Failed to clear ROs'); return; }
    setROs([]);
  }, [user]);

  const addRO = useCallback(async (ro: Omit<RepairOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    // Queue if offline
    if (!isOnline) {
      await queueAction('addRO', { ro });
      toast.info('Saved offline — will sync when back online');
      pushDebug({ action: 'addRO QUEUED (offline)', userId: user.id });
      return;
    }

    const { data: newRow, error } = await supabase
      .from('ros')
      .insert(toRosInsert(user.id, ro))
      .select()
      .single();

    if (error || !newRow) {
      const msg = error?.message || 'Unknown error';
      // If network error, queue it
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        await queueAction('addRO', { ro });
        toast.info('Network issue — saved offline');
        return;
      }
      toast.error('Failed to create RO');
      pushDebug({ action: 'addRO FAIL', userId: user.id, error: msg });
      return;
    }
    pushDebug({ action: 'addRO OK', roId: newRow.id, userId: user.id });

    // Insert lines
    if (ro.lines.length > 0) {
      const lineInserts = toRoLineInserts({
        userId: user.id,
        roId: newRow.id,
        lines: ro.lines,
        fallbackLaborType: ro.laborType || 'customer-pay',
      });
      const { error: lErr } = await supabase.from('ro_lines').insert(lineInserts);
      if (lErr) {
        console.error('Failed to insert lines', lErr);
        toast.error(`Lines failed to save: ${lErr.message}`);
        pushDebug({ action: 'insertLines FAIL', roId: newRow.id, error: lErr.message, lineCount: lineInserts.length });
      } else {
        pushDebug({ action: 'insertLines OK', roId: newRow.id, lineCount: lineInserts.length });
      }
    }

    // Optimistic update: build RO locally instead of refetching everything
    const { data: insertedLines } = await supabase
      .from('ro_lines')
      .select('*')
      .eq('ro_id', newRow.id)
      .order('line_no', { ascending: true });

    const newRO = dbToRepairOrder(newRow as RoRow, (insertedLines || []) as RoLineRow[]);
    setROs(prev => [newRO, ...prev]);
    return newRO;
  }, [user, isOnline, queueAction]);

  const updateRO = useCallback(async (id: string, updates: Partial<RepairOrder>) => {
    if (!user) return;

    // Queue if offline
    if (!isOnline) {
      await queueAction('updateRO', { id, updates });
      toast.info('Update saved offline — will sync when back online');
      return;
    }

    // Stale-edit detection: check server's updated_at before saving
    const localRO = ros.find(r => r.id === id);
    if (localRO) {
      try {
        const { data: serverRow } = await supabase
          .from('ros')
          .select('updated_at')
          .eq('id', id)
          .single();
        if (serverRow && serverRow.updated_at !== localRO.updatedAt) {
          toast.error('This RO was modified elsewhere. Please refresh before editing.');
          return;
        }
      } catch (err) {
        // If we can't check, fall back to offline queue on network error
        const msg = errorMessage(err);
        if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
          await queueAction('updateRO', { id, updates });
          toast.info('Network issue — update saved offline');
          return;
        }
      }
    }

    const dbUpdates = toRosUpdate(updates);

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('ros').update(dbUpdates).eq('id', id);
      if (error) {
        const msg = error.message || '';
        if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
          await queueAction('updateRO', { id, updates });
          toast.info('Network issue — update saved offline');
          return;
        }
        toast.error('Failed to update RO');
        return;
      }
    }

    // Replace lines if provided
    if (updates.lines) {
      const { error: delErr } = await supabase.from('ro_lines').delete().eq('ro_id', id);
      if (delErr) {
        console.error('Failed to delete old lines', delErr);
        toast.error(`Failed to update lines: ${delErr.message}`);
        return;
      }
      if (updates.lines.length > 0) {
        const lineInserts = toRoLineInserts({
          userId: user.id,
          roId: id,
          lines: updates.lines,
          fallbackLaborType: updates.laborType || 'customer-pay',
        });
        const { error: insErr } = await supabase.from('ro_lines').insert(lineInserts);
        if (insErr) {
          console.error('Failed to insert lines', insErr);
          toast.error(`Lines failed to save: ${insErr.message}`);
        }
      }
    }

    // Optimistic update: fetch only this RO's lines and update local state
    const { data: updatedRow, error: rErr } = await supabase
      .from('ros')
      .select('*')
      .eq('id', id)
      .single();

    const { data: updatedLines } = await supabase
      .from('ro_lines')
      .select('*')
      .eq('ro_id', id)
      .order('line_no', { ascending: true });

    if (updatedRow) {
      const updated = dbToRepairOrder(updatedRow as RoRow, (updatedLines || []) as RoLineRow[]);
      setROs(prev => prev.map(r => r.id === id ? updated : r));
    }
  }, [user, isOnline, queueAction, ros]);

  const deleteRO = useCallback(async (id: string) => {
    if (!user) return;

    if (!isOnline) {
      await queueAction('deleteRO', { id });
      setROs(prev => prev.filter(ro => ro.id !== id));
      toast.info('Delete saved offline — will sync when back online');
      return;
    }

    const { error } = await supabase.from('ros').delete().eq('id', id);
    if (error) {
      const msg = error.message || '';
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        await queueAction('deleteRO', { id });
        setROs(prev => prev.filter(ro => ro.id !== id));
        toast.info('Network issue — delete saved offline');
        return;
      }
      toast.error('Failed to delete RO');
      return;
    }
    setROs(prev => prev.filter(ro => ro.id !== id));
  }, [user, isOnline, queueAction]);

  const duplicateRO = useCallback(async (id: string, newRONumber?: string) => {
    const ro = ros.find(r => r.id === id);
    if (!ro) return;
    return addRO({ ...ro, roNumber: newRONumber || '' });
  }, [ros, addRO]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePresets = useCallback(async (presets: Preset[]) => {
    if (!user) return;
    // Prevent concurrent updates
    if (presetsUpdating.current) return;
    presetsUpdating.current = true;
    setSettings(prev => ({ ...prev, presets }));
    try {
      // Deduplicate by name before saving (keep first occurrence)
      const seen = new Set<string>();
      const uniquePresets = presets.filter(p => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });

      // Sync to DB: delete all, re-insert
      await supabase.from('labor_references').delete().eq('user_id', user.id);
      if (uniquePresets.length > 0) {
        const rows = uniquePresets.map((p, i) => ({
          user_id: user.id,
          name: p.name,
          labor_type_default: p.laborType as unknown as LaborTypeDb,
          default_hours: p.defaultHours || 0,
          sort_order: i,
          active: true,
          is_favorite: !!p.isFavorite,
        }));
        await supabase.from('labor_references').insert(rows);
      }
    } finally {
      presetsUpdating.current = false;
    }
    await fetchPresets();
  }, [user, fetchPresets]);

  const updateAdvisors = useCallback(async (advisors: Advisor[]) => {
    if (!user) return;
    setSettings(prev => ({ ...prev, advisors }));
    try {
      // Sync to DB: delete all, re-insert
      await supabase.from('advisors').delete().eq('user_id', user.id);
      if (advisors.length > 0) {
        const rows = advisors.map(a => ({
          user_id: user.id,
          name: a.name,
        }));
        const { error } = await supabase.from('advisors').insert(rows);
        if (error) throw error;
      }
    } catch (err: unknown) {
      console.error('Failed to persist advisors', err);
      toast.error('Failed to save advisor changes');
    }
    await fetchAdvisors();
  }, [user, fetchAdvisors]);

  const getDaySummaries = useCallback((startDate: string, endDate: string): DaySummary[] => {
    const summaries: DaySummary[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayROs = ros.filter(ro => (ro.paidDate || ro.date) === dateStr);
      const allLines = dayROs.flatMap(ro => ro.lines.filter(l => !l.isTbd));
      summaries.push({
        date: dateStr,
        totalHours: allLines.reduce((sum, l) => sum + l.hoursPaid, 0),
        roCount: dayROs.length,
        warrantyHours: allLines.filter(l => l.laborType === 'warranty').reduce((sum, l) => sum + l.hoursPaid, 0),
        customerPayHours: allLines.filter(l => l.laborType === 'customer-pay').reduce((sum, l) => sum + l.hoursPaid, 0),
        internalHours: allLines.filter(l => l.laborType === 'internal').reduce((sum, l) => sum + l.hoursPaid, 0),
      });
    }
    return summaries;
  }, [ros]);

  const getAdvisorSummaries = useCallback((startDate?: string, endDate?: string): AdvisorSummary[] => {
    let filteredROs = ros;
    if (startDate && endDate) {
      filteredROs = ros.filter(ro => (ro.paidDate || ro.date) >= startDate && (ro.paidDate || ro.date) <= endDate);
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
    const weekROs = ros.filter(ro => (ro.paidDate || ro.date) >= startDate && (ro.paidDate || ro.date) <= endDate);
    const allLines = weekROs.flatMap(ro => ro.lines.filter(l => !l.isTbd));
    return {
      totalHours: allLines.reduce((sum, l) => sum + l.hoursPaid, 0),
      roCount: weekROs.length,
      warrantyHours: allLines.filter(l => l.laborType === 'warranty').reduce((sum, l) => sum + l.hoursPaid, 0),
      customerPayHours: allLines.filter(l => l.laborType === 'customer-pay').reduce((sum, l) => sum + l.hoursPaid, 0),
      internalHours: allLines.filter(l => l.laborType === 'internal').reduce((sum, l) => sum + l.hoursPaid, 0),
    };
  }, [ros]);

  const clearAllTbdLines = useCallback(async () => {
    if (!user) return;
    // Collect all TBD line IDs
    const tbdLineIds = ros.flatMap(ro => ro.lines.filter(l => l.isTbd).map(l => l.id));
    if (tbdLineIds.length === 0) return;

    const { error } = await supabase.from('ro_lines').update({ is_tbd: false }).in('id', tbdLineIds);
    if (error) {
      toast.error('Failed to clear TBD status');
      return;
    }
    toast.success(`Cleared TBD from ${tbdLineIds.length} line(s)`);
    await fetchROs();
  }, [user, ros, fetchROs]);

  return {
    ros,
    settings,
    loadingROs,
    addRO,
    updateRO,
    deleteRO,
    duplicateRO,
    clearAllROs,
    clearAllTbdLines,
    updateSettings,
    updatePresets,
    updateAdvisors,
    getDaySummaries,
    getAdvisorSummaries,
    getWeekTotal,
  };
}
