import { useMemo } from 'react';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import type { RepairOrder, LaborType, ROLine } from '@/types/ro';
import { normalizeAdvisorName } from '@/lib/roFilters';

export interface DayBreakdown {
  date: string;
  totalHours: number;
  roCount: number;
  warrantyHours: number;
  customerPayHours: number;
  internalHours: number;
}

export interface AdvisorBreakdown {
  advisor: string;
  totalHours: number;
  roCount: number;
  warrantyHours: number;
  customerPayHours: number;
  internalHours: number;
}

export interface LaborTypeBreakdown {
  laborType: LaborType;
  label: string;
  totalHours: number;
  lineCount: number;
}

export interface LaborRefBreakdown {
  referenceId: string;
  referenceName: string;
  totalHours: number;
  lineCount: number;
}

export interface PayPeriodReport {
  startDate: string;
  endDate: string;
  // Top-level
  totalHours: number;
  totalROs: number;
  totalLines: number;
  tbdLineCount: number;
  tbdHours: number;
  // Breakdowns
  byDay: DayBreakdown[];
  byAdvisor: AdvisorBreakdown[];
  byLaborType: LaborTypeBreakdown[];
  byLaborRef: LaborRefBreakdown[];
  // Warnings
  missingHoursCount: number;
  needsReviewCount: number;
  flaggedCount: number;
  // Filtered data
  rosInRange: RepairOrder[];
  linesInRange: { ro: RepairOrder; line: ROLine }[];
}

const LABOR_TYPE_LABELS: Record<LaborType, string> = {
  warranty: 'Warranty',
  'customer-pay': 'Customer Pay',
  internal: 'Internal',
};

/** Convert a date string to a local-day numeric key (no timezone shift). */
function toDayKey(s: string): number {
  if (!s) return NaN;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const d = new Date(s);
  if (isNaN(d.getTime())) return NaN;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Resolve effective date string for an RO (paidDate overrides ro.date). */
function effectiveDateOf(ro: RepairOrder): string {
  const pd = ro.paidDate?.trim();
  return (pd && pd !== '—') ? pd : ro.date;
}

export function usePayPeriodReport(startDate: string, endDate: string): PayPeriodReport {
  const { ros, settings } = useRO();
  const { flags } = useFlagContext();

  return useMemo(() => {
    const startKey = toDayKey(startDate);
    const endKey = toDayKey(endDate);

    const rosInRange = ros.filter(ro => {
      const raw = effectiveDateOf(ro);
      const key = toDayKey(raw);
      return !isNaN(key) && key >= startKey && key <= endKey;
    });

    // Dev-only debug when report seems empty
    if (import.meta.env.DEV && rosInRange.length === 0 && ros.length > 0) {
      console.debug('[PayPeriodReport] 0 ROs in range', startDate, '→', endDate,
        'sample:', ros.slice(0, 3).map(r => ({
          roNumber: r.roNumber, date: r.date, paidDate: r.paidDate,
          effective: effectiveDateOf(r), key: toDayKey(effectiveDateOf(r)),
        })),
        'startKey:', startKey, 'endKey:', endKey,
      );
    }

    // Collect all lines
    const linesInRange: { ro: RepairOrder; line: ROLine }[] = [];
    rosInRange.forEach(ro => {
      (ro.lines || []).forEach(line => {
        linesInRange.push({ ro, line });
      });
    });

    // Paid lines = lines with description (non-TBD/empty) and not TBD
    const paidLines = linesInRange.filter(({ line }) => line.description.trim() !== '' && !line.isTbd);
    const tbdLines = linesInRange.filter(({ line }) => line.isTbd);

    // Simple-mode ROs (no lines) — fall back to ro.paidHours
    const simpleROs = rosInRange.filter(ro => !ro.lines || ro.lines.length === 0);
    const simpleHours = simpleROs.reduce((s, ro) => s + (ro.paidHours || 0), 0);

    const totalHours = paidLines.reduce((s, { line }) => s + line.hoursPaid, 0) + simpleHours;
    const tbdHours = tbdLines.reduce((s, { line }) => s + line.hoursPaid, 0);

    // By day
    const dayMap = new Map<string, DayBreakdown>();
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayMap.set(ds, { date: ds, totalHours: 0, roCount: 0, warrantyHours: 0, customerPayHours: 0, internalHours: 0 });
    }
    rosInRange.forEach(ro => {
      const effectiveDate = effectiveDateOf(ro);
      const day = dayMap.get(effectiveDate);
      if (!day) return;
      day.roCount += 1;
    });
    paidLines.forEach(({ ro, line }) => {
      const effectiveDate = effectiveDateOf(ro);
      const day = dayMap.get(effectiveDate);
      if (!day) return;
      day.totalHours += line.hoursPaid;
      const lt = line.laborType || 'customer-pay';
      if (lt === 'warranty') day.warrantyHours += line.hoursPaid;
      else if (lt === 'customer-pay') day.customerPayHours += line.hoursPaid;
      else if (lt === 'internal') day.internalHours += line.hoursPaid;
    });
    // Include simple-mode ROs in day breakdown
    simpleROs.forEach(ro => {
      const effectiveDate = effectiveDateOf(ro);
      const day = dayMap.get(effectiveDate);
      if (!day) return;
      const h = ro.paidHours || 0;
      day.totalHours += h;
      const lt = ro.laborType || 'customer-pay';
      if (lt === 'warranty') day.warrantyHours += h;
      else if (lt === 'customer-pay') day.customerPayHours += h;
      else if (lt === 'internal') day.internalHours += h;
    });
    const byDay = Array.from(dayMap.values());

    // By advisor
    const advMap = new Map<string, AdvisorBreakdown>();
    const displayAdvisorByKey = new Map<string, string>();
    const advisorKey = (name?: string) => {
      const normalized = normalizeAdvisorName(name);
      return normalized || '—';
    };

    rosInRange.forEach((ro) => {
      const key = advisorKey(ro.advisor);
      if (!displayAdvisorByKey.has(key)) {
        displayAdvisorByKey.set(key, ro.advisor?.trim() || '—');
      }
    });

    paidLines.forEach(({ ro, line }) => {
      const key = advisorKey(ro.advisor);
      const adv = displayAdvisorByKey.get(key) || '—';
      const existing = advMap.get(key);
      const lt = line.laborType || 'customer-pay';
      if (existing) {
        existing.totalHours += line.hoursPaid;
        if (lt === 'warranty') existing.warrantyHours += line.hoursPaid;
        else if (lt === 'customer-pay') existing.customerPayHours += line.hoursPaid;
        else if (lt === 'internal') existing.internalHours += line.hoursPaid;
      } else {
        advMap.set(key, {
          advisor: adv,
          totalHours: line.hoursPaid,
          roCount: 0,
          warrantyHours: lt === 'warranty' ? line.hoursPaid : 0,
          customerPayHours: lt === 'customer-pay' ? line.hoursPaid : 0,
          internalHours: lt === 'internal' ? line.hoursPaid : 0,
        });
      }
    });
    // Include simple-mode ROs in advisor breakdown
    simpleROs.forEach(ro => {
      const key = advisorKey(ro.advisor);
      const adv = displayAdvisorByKey.get(key) || '—';
      const h = ro.paidHours || 0;
      const lt = ro.laborType || 'customer-pay';
      const existing = advMap.get(key);
      if (existing) {
        existing.totalHours += h;
        if (lt === 'warranty') existing.warrantyHours += h;
        else if (lt === 'customer-pay') existing.customerPayHours += h;
        else if (lt === 'internal') existing.internalHours += h;
      } else {
        advMap.set(key, {
          advisor: adv, totalHours: h, roCount: 0,
          warrantyHours: lt === 'warranty' ? h : 0,
          customerPayHours: lt === 'customer-pay' ? h : 0,
          internalHours: lt === 'internal' ? h : 0,
        });
      }
    });
    // Set RO counts
    rosInRange.forEach(ro => {
      const key = advisorKey(ro.advisor);
      const adv = displayAdvisorByKey.get(key) || '—';
      const existing = advMap.get(key);
      if (existing) existing.roCount += 1;
      else advMap.set(key, { advisor: adv, totalHours: 0, roCount: 1, warrantyHours: 0, customerPayHours: 0, internalHours: 0 });
    });
    const byAdvisor = Array.from(advMap.values()).sort((a, b) => b.totalHours - a.totalHours);

    // By labor type
    const ltMap = new Map<LaborType, { totalHours: number; lineCount: number }>();
    paidLines.forEach(({ line }) => {
      const lt = line.laborType || 'customer-pay';
      const existing = ltMap.get(lt);
      if (existing) {
        existing.totalHours += line.hoursPaid;
        existing.lineCount += 1;
      } else {
        ltMap.set(lt, { totalHours: line.hoursPaid, lineCount: 1 });
      }
    });
    // Include simple-mode ROs in labor type breakdown
    simpleROs.forEach(ro => {
      const lt = ro.laborType || 'customer-pay';
      const h = ro.paidHours || 0;
      const existing = ltMap.get(lt);
      if (existing) {
        existing.totalHours += h;
        existing.lineCount += 1;
      } else {
        ltMap.set(lt, { totalHours: h, lineCount: 1 });
      }
    });
    const byLaborType: LaborTypeBreakdown[] = Array.from(ltMap.entries()).map(([lt, data]) => ({
      laborType: lt,
      label: LABOR_TYPE_LABELS[lt] || lt,
      ...data,
    }));

    // By labor reference
    const refMap = new Map<string, { totalHours: number; lineCount: number; name: string }>();
    paidLines.forEach(({ line }) => {
      const refId = line.matchedReferenceId || 'unmatched';
      const existing = refMap.get(refId);
      // Find ref name from presets
      const preset = settings.presets.find(p => p.id === refId);
      const name = preset?.name || (refId === 'unmatched' ? 'Unmatched' : 'Unknown');
      if (existing) {
        existing.totalHours += line.hoursPaid;
        existing.lineCount += 1;
      } else {
        refMap.set(refId, { totalHours: line.hoursPaid, lineCount: 1, name });
      }
    });
    const byLaborRef: LaborRefBreakdown[] = Array.from(refMap.entries())
      .map(([id, data]) => ({ referenceId: id, referenceName: data.name, ...data }))
      .sort((a, b) => b.totalHours - a.totalHours);

    // Missing hours removed as a warning — 0h lines are valid
    const missingHoursCount = 0;

    // Needs review: duplicate RO numbers only
    const roNumberCounts = new Map<string, number>();
    rosInRange.forEach(ro => {
      if (ro.roNumber) roNumberCounts.set(ro.roNumber, (roNumberCounts.get(ro.roNumber) || 0) + 1);
    });
    const duplicateROCount = Array.from(roNumberCounts.values()).filter(c => c > 1).reduce((s, c) => s + c, 0);
    const needsReviewCount = duplicateROCount;

    // Flagged count
    const roIds = new Set(rosInRange.map(r => r.id));
    const flaggedCount = flags.filter(f => roIds.has(f.roId)).length;

    return {
      startDate,
      endDate,
      totalHours,
      totalROs: rosInRange.length,
      totalLines: paidLines.length + simpleROs.length,
      tbdLineCount: tbdLines.length,
      tbdHours,
      byDay,
      byAdvisor,
      byLaborType,
      byLaborRef,
      missingHoursCount,
      needsReviewCount,
      flaggedCount,
      rosInRange,
      linesInRange,
    };
  }, [ros, flags, settings.presets, startDate, endDate]);
}
