import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { toast } from 'sonner';
import { pushDebug } from '@/components/debug/DevDebugPanel';
import type { RepairOrder, Preset, Settings, DaySummary, AdvisorSummary, LaborType, Advisor, ROLine, VehicleInfo } from '@/types/ro';

// Map DB row to app RepairOrder
function deriveLaborType(lines: any[]): LaborType {
  if (!lines.length) return 'customer-pay';
  // Count occurrences of each labor type
  const counts: Record<string, number> = {};
  lines.forEach((l: any) => {
    const t = l.labor_type || l.laborType || 'customer-pay';
    counts[t] = (counts[t] || 0) + 1;
  });
  // Return the most common type
  let maxType: LaborType = 'customer-pay';
  let maxCount = 0;
  for (const [type, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type as LaborType;
    }
  }
  return maxType;
}

function dbToRO(row: any, lines: any[]): RepairOrder {
  const vehicle: VehicleInfo | undefined =
    (row.vehicle_year || row.vehicle_make || row.vehicle_model)
      ? { year: row.vehicle_year ?? undefined, make: row.vehicle_make ?? undefined, model: row.vehicle_model ?? undefined, trim: row.vehicle_trim ?? undefined }
      : undefined;

  return {
    id: row.id,
    roNumber: row.ro_number,
    date: row.date,
    advisor: row.advisor_name,
    customerName: row.customer_name || undefined,
    mileage: row.mileage || undefined,
    vehicle,
    paidHours: lines.filter((l: any) => !l.is_tbd).reduce((s: number, l: any) => s + Number(l.hours_paid), 0),
    laborType: deriveLaborType(lines),
    workPerformed: lines.map((l: any) => l.description).filter(Boolean).join('\n'),
    notes: row.notes || undefined,
    lines: lines.map((l: any, i: number) => ({
      id: l.id,
      lineNo: l.line_no,
      description: l.description,
      hoursPaid: Number(l.hours_paid),
      isTbd: !!l.is_tbd,
      laborType: l.labor_type as LaborType,
      matchedReferenceId: l.matched_reference_id || undefined,
      vehicleOverride: !!l.vehicle_override,
      lineVehicle: l.vehicle_override
        ? { year: l.line_vehicle_year ?? undefined, make: l.line_vehicle_make ?? undefined, model: l.line_vehicle_model ?? undefined, trim: l.line_vehicle_trim ?? undefined }
        : undefined,
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
      const totalLines = (lineRows || []).length;
      pushDebug({ action: `fetchROs OK: ${mapped.length} ROs, ${totalLines} lines` });
    } catch (err: any) {
      console.error('Failed to fetch ROs', err);
      pushDebug({ action: 'fetchROs FAIL', error: err?.message });
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
    } catch (err: any) {
      console.error('Failed to fetch presets', err);
    }
  }, [user]);

  // Derive advisors from ROs separately (no dependency on fetchPresets)
  useEffect(() => {
    const advisorSet = new Map<string, Advisor>();
    ros.forEach(ro => {
      if (ro.advisor && !advisorSet.has(ro.advisor)) {
        advisorSet.set(ro.advisor, { id: ro.advisor, name: ro.advisor });
      }
    });
    setSettings(prev => ({
      ...prev,
      advisors: Array.from(advisorSet.values()),
      recentAdvisors: Array.from(advisorSet.keys()).slice(0, 6),
    }));
  }, [ros]);

  useEffect(() => { fetchROs(); }, [fetchROs]);
  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  // Register refresh callback for offline sync
  useEffect(() => {
    registerRefresh(async () => {
      await fetchROs();
      await fetchPresets();
    });
  }, [registerRefresh, fetchROs, fetchPresets]);

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

    const paidHours = ro.isSimpleMode ? ro.paidHours : ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + l.hoursPaid, 0);

    const { data: newRow, error } = await supabase
      .from('ros')
      .insert({
        user_id: user.id,
        ro_number: ro.roNumber,
        date: ro.date,
        advisor_name: ro.advisor,
        customer_name: ro.customerName || null,
        mileage: ro.mileage || null,
        notes: ro.notes || null,
        status: 'draft',
        vehicle_year: ro.vehicle?.year ?? null,
        vehicle_make: ro.vehicle?.make ?? null,
        vehicle_model: ro.vehicle?.model ?? null,
        vehicle_trim: ro.vehicle?.trim ?? null,
      })
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
      const lineInserts = ro.lines.map((l, i) => ({
        ro_id: newRow.id,
        user_id: user.id,
        line_no: i + 1,
        description: l.description,
        labor_type: (l.laborType || ro.laborType || 'customer-pay') as any,
        hours_paid: l.hoursPaid,
        is_tbd: !!l.isTbd,
        matched_reference_id: l.matchedReferenceId || null,
        vehicle_override: !!l.vehicleOverride,
        line_vehicle_year: l.lineVehicle?.year ?? null,
        line_vehicle_make: l.lineVehicle?.make ?? null,
        line_vehicle_model: l.lineVehicle?.model ?? null,
        line_vehicle_trim: l.lineVehicle?.trim ?? null,
      }));
      const { error: lErr } = await supabase.from('ro_lines').insert(lineInserts);
      if (lErr) {
        console.error('Failed to insert lines', lErr);
        toast.error(`Lines failed to save: ${lErr.message}`);
        pushDebug({ action: 'insertLines FAIL', roId: newRow.id, error: lErr.message, lineCount: lineInserts.length });
      } else {
        pushDebug({ action: 'insertLines OK', roId: newRow.id, lineCount: lineInserts.length });
      }
    }

    await fetchROs();
    return dbToRO(newRow, ro.lines as any[]);
  }, [user, fetchROs, isOnline, queueAction]);

  const updateRO = useCallback(async (id: string, updates: Partial<RepairOrder>) => {
    if (!user) return;

    // Queue if offline
    if (!isOnline) {
      await queueAction('updateRO', { id, updates });
      toast.info('Update saved offline — will sync when back online');
      return;
    }

    const dbUpdates: any = {};
    if (updates.roNumber !== undefined) dbUpdates.ro_number = updates.roNumber;
    if (updates.advisor !== undefined) dbUpdates.advisor_name = updates.advisor;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName || null;
    if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage || null;
    if (updates.vehicle !== undefined) {
      dbUpdates.vehicle_year = updates.vehicle?.year ?? null;
      dbUpdates.vehicle_make = updates.vehicle?.make ?? null;
      dbUpdates.vehicle_model = updates.vehicle?.model ?? null;
      dbUpdates.vehicle_trim = updates.vehicle?.trim ?? null;
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('ros').update(dbUpdates).eq('id', id);
      if (error) { toast.error('Failed to update RO'); return; }
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
        const lineInserts = updates.lines.map((l, i) => ({
          ro_id: id,
          user_id: user.id,
          line_no: i + 1,
          description: l.description,
          labor_type: (l.laborType || updates.laborType || 'customer-pay') as any,
          hours_paid: l.hoursPaid,
          is_tbd: !!l.isTbd,
          matched_reference_id: l.matchedReferenceId || null,
          vehicle_override: !!l.vehicleOverride,
          line_vehicle_year: l.lineVehicle?.year ?? null,
          line_vehicle_make: l.lineVehicle?.make ?? null,
          line_vehicle_model: l.lineVehicle?.model ?? null,
          line_vehicle_trim: l.lineVehicle?.trim ?? null,
        }));
        const { error: insErr } = await supabase.from('ro_lines').insert(lineInserts);
        if (insErr) {
          console.error('Failed to insert lines', insErr);
          toast.error(`Lines failed to save: ${insErr.message}`);
        }
      }
    }

    await fetchROs();
  }, [user, fetchROs, isOnline, queueAction]);

  const deleteRO = useCallback(async (id: string) => {
    if (!user) return;

    if (!isOnline) {
      await queueAction('deleteRO', { id });
      setROs(prev => prev.filter(ro => ro.id !== id));
      toast.info('Delete saved offline — will sync when back online');
      return;
    }

    const { error } = await supabase.from('ros').delete().eq('id', id);
    if (error) { toast.error('Failed to delete RO'); return; }
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
    presetsUpdating.current = true;
    setSettings(prev => ({ ...prev, presets }));
    try {
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
    } finally {
      presetsUpdating.current = false;
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
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayROs = ros.filter(ro => ro.date === dateStr);
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
    const allLines = weekROs.flatMap(ro => ro.lines.filter(l => !l.isTbd));
    return {
      totalHours: allLines.reduce((sum, l) => sum + l.hoursPaid, 0),
      roCount: weekROs.length,
      warrantyHours: allLines.filter(l => l.laborType === 'warranty').reduce((sum, l) => sum + l.hoursPaid, 0),
      customerPayHours: allLines.filter(l => l.laborType === 'customer-pay').reduce((sum, l) => sum + l.hoursPaid, 0),
      internalHours: allLines.filter(l => l.laborType === 'internal').reduce((sum, l) => sum + l.hoursPaid, 0),
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
