import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PayPeriodReport } from '@/hooks/usePayPeriodReport';
import type { RepairOrder, ROLine } from '@/types/ro';

export type CloseoutRangeType = 'day' | 'week' | 'pay_period' | 'two_weeks' | 'month' | 'custom';

export interface ROSnapshotLine {
  lineId: string;
  lineNo: number;
  description: string;
  laborType: string;
  hours: number;
  isTbd: boolean;
  matchedReferenceId?: string;
}

export interface ROSnapshot {
  roId: string;
  roNumber: string;
  roDate: string;
  advisor: string;
  customerName?: string;
  vehicle?: string;
  mileage?: string;
  totalPaidHours: number;
  cpHours: number;
  wHours: number;
  iHours: number;
  lines: ROSnapshotLine[];
}

export interface CloseoutSnapshot {
  id: string;
  rangeType: CloseoutRangeType;
  periodStart: string;
  periodEnd: string;
  closedAt: string;
  totals: {
    totalHours: number;
    customerPayHours: number;
    warrantyHours: number;
    internalHours: number;
    flaggedCount: number;
    needsReviewCount: number;
    tbdCount: number;
    totalROs: number;
    totalLines: number;
  };
  breakdowns: {
    byDay: Array<{ date: string; totalHours: number; roCount: number }>;
    byAdvisor: Array<{ advisor: string; totalHours: number; roCount: number; warrantyHours: number; customerPayHours: number; internalHours: number }>;
    byLaborType: Array<{ laborType: string; label: string; totalHours: number; lineCount: number }>;
    byLaborRef: Array<{ referenceId: string; referenceName: string; totalHours: number; lineCount: number }>;
  };
  roSnapshot: ROSnapshot[];
  roIds: string[];
}

function buildROSnapshot(report: PayPeriodReport): ROSnapshot[] {
  return report.rosInRange.map(ro => {
    const paidLines = (ro.lines || []).filter(l => !l.isTbd && l.description.trim() !== '');
    const cpH = paidLines.filter(l => (l.laborType || 'customer-pay') === 'customer-pay').reduce((s, l) => s + l.hoursPaid, 0);
    const wH = paidLines.filter(l => l.laborType === 'warranty').reduce((s, l) => s + l.hoursPaid, 0);
    const iH = paidLines.filter(l => l.laborType === 'internal').reduce((s, l) => s + l.hoursPaid, 0);

    const vehicleParts = [ro.vehicle?.year ? `'${String(ro.vehicle.year).slice(-2)}` : '', ro.vehicle?.make, ro.vehicle?.model].filter(Boolean);

    return {
      roId: ro.id,
      roNumber: ro.roNumber,
      roDate: ro.paidDate || ro.date,
      advisor: ro.advisor || '—',
      customerName: ro.customerName,
      vehicle: vehicleParts.join(' ') || undefined,
      mileage: ro.mileage,
      totalPaidHours: paidLines.reduce((s, l) => s + l.hoursPaid, 0),
      cpHours: cpH,
      wHours: wH,
      iHours: iH,
      lines: (ro.lines || []).map(l => ({
        lineId: l.id,
        lineNo: l.lineNo,
        description: l.description,
        laborType: l.laborType || 'customer-pay',
        hours: l.hoursPaid,
        isTbd: l.isTbd || false,
        matchedReferenceId: l.matchedReferenceId,
      })),
    };
  });
}

export function useCloseouts() {
  const { user } = useAuth();
  const [closeouts, setCloseouts] = useState<CloseoutSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCloseouts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('pay_period_closeouts')
      .select('*')
      .eq('user_id', user.id)
      .order('period_end', { ascending: false });

    if (!error && data) {
      setCloseouts(data.map((row: any) => ({
        id: row.id,
        rangeType: (row.range_type || 'pay_period') as CloseoutRangeType,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        closedAt: row.closed_at,
        totals: row.totals as CloseoutSnapshot['totals'],
        breakdowns: row.breakdowns as CloseoutSnapshot['breakdowns'],
        roSnapshot: (row.ro_snapshot || []) as ROSnapshot[],
        roIds: row.ro_ids || [],
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCloseouts(); }, [fetchCloseouts]);

  const closeOutPeriod = useCallback(async (report: PayPeriodReport, rangeType: CloseoutRangeType): Promise<boolean> => {
    if (!user) return false;

    const cpHours = report.byLaborType.find(l => l.laborType === 'customer-pay')?.totalHours || 0;
    const wHours = report.byLaborType.find(l => l.laborType === 'warranty')?.totalHours || 0;
    const iHours = report.byLaborType.find(l => l.laborType === 'internal')?.totalHours || 0;

    const totals = {
      totalHours: report.totalHours,
      customerPayHours: cpHours,
      warrantyHours: wHours,
      internalHours: iHours,
      flaggedCount: report.flaggedCount,
      needsReviewCount: report.needsReviewCount,
      tbdCount: report.tbdLineCount,
      totalROs: report.totalROs,
      totalLines: report.totalLines,
    };

    const breakdowns = {
      byDay: report.byDay.map(d => ({ date: d.date, totalHours: d.totalHours, roCount: d.roCount })),
      byAdvisor: report.byAdvisor,
      byLaborType: report.byLaborType,
      byLaborRef: report.byLaborRef,
    };

    const roSnapshot = buildROSnapshot(report);
    const roIds = report.rosInRange.map(r => r.id);

    const { error } = await supabase.from('pay_period_closeouts').insert({
      user_id: user.id,
      period_start: report.startDate,
      period_end: report.endDate,
      range_type: rangeType,
      totals,
      breakdowns,
      ro_snapshot: roSnapshot,
      ro_ids: roIds,
    } as any);

    if (error) {
      console.error('Closeout insert error:', error);
      return false;
    }

    await fetchCloseouts();
    return true;
  }, [user, fetchCloseouts]);

  const deleteCloseout = useCallback(async (id: string) => {
    await supabase.from('pay_period_closeouts').delete().eq('id', id);
    setCloseouts(prev => prev.filter(c => c.id !== id));
  }, []);

  const isRangeClosed = useCallback((start: string, end: string) => {
    return closeouts.some(c => c.periodStart === start && c.periodEnd === end);
  }, [closeouts]);

  const getCloseoutForRange = useCallback((start: string, end: string) => {
    return closeouts.find(c => c.periodStart === start && c.periodEnd === end) || null;
  }, [closeouts]);

  // Back-compat aliases
  const isCurrentPeriodClosed = isRangeClosed;
  const getCloseoutForPeriod = getCloseoutForRange;

  return { closeouts, loading, closeOutPeriod, deleteCloseout, isRangeClosed, getCloseoutForRange, isCurrentPeriodClosed, getCloseoutForPeriod };
}
