import { typeCode } from '@/lib/csvUtils';
import { formatVehicleChip } from '@/types/ro';
import type { RepairOrder } from '@/types/ro';
import type { ROSnapshot } from '@/hooks/useCloseouts';
import { hasPaidDate, normalizePaidDate } from '@/lib/paidDate';

/* ─── Row types ─── */

export type SpreadsheetRowType = 'line' | 'roSubtotal' | 'daySubtotal' | 'advisorSubtotal' | 'periodSubtotal' | 'sectionDivider';
export type GroupByMode = 'date' | 'ro' | 'advisor' | 'none';

export interface SpreadsheetLineRow {
  rowType: 'line';
  groupIndex: number;
  roNumber: string;
  date: string;
  advisor: string;
  customer: string;
  vehicle: string;
  lineNo: number;
  description: string;
  hours: number;
  type: string; // CP, W, I
  laborType: string; // full key
  notes: string;
  mileage: string;
  vin: string;
  /** Original RO reference for click handlers (only present for live data) */
  ro?: RepairOrder;
  lineIndex?: number;
  /**
   * True when this line belongs to an unpaid/open RO.
   * These rows are shown but excluded from all totals and payroll exports.
   */
  isCarryover?: boolean;
}

export interface SpreadsheetSubtotalRow {
  rowType: 'roSubtotal' | 'daySubtotal' | 'advisorSubtotal' | 'periodSubtotal';
  groupIndex: number;
  label: string;
  hours: number;
  cpHours?: number;
  wHours?: number;
  iHours?: number;
  /** True when this subtotal belongs to an open/unpaid RO (excluded from period totals). */
  isCarryover?: boolean;
}

export interface SpreadsheetSectionDividerRow {
  rowType: 'sectionDivider';
  groupIndex: number;
  label: string;
}

export type SpreadsheetRow = SpreadsheetLineRow | SpreadsheetSubtotalRow | SpreadsheetSectionDividerRow;

/* ─── Builder from live RepairOrder[] ─── */

export interface BuildRowsOptions {
  ros: RepairOrder[];
  periodLabel?: string;
  groupBy?: GroupByMode;
  viewStart?: string;
}

export function buildSpreadsheetRows({ ros, periodLabel, groupBy = 'date', viewStart: _viewStart }: BuildRowsOptions): SpreadsheetRow[] {
  // Paid ROs are the primary payroll rows.
  // All open/unpaid ROs are shown below as secondary (muted, not counted).
  const paidROs = ros.filter(ro => hasPaidDate(ro));
  const openROs = ros.filter(ro => !hasPaidDate(ro));

  switch (groupBy) {
    case 'ro': return buildGroupedByRO(paidROs, openROs, periodLabel);
    case 'advisor': return buildGroupedByAdvisor(paidROs, openROs, periodLabel);
    case 'none': return buildFlat(paidROs, openROs, periodLabel);
    case 'date':
    default: return buildGroupedByDate(paidROs, openROs, periodLabel);
  }
}

/* ─── Shared: emit lines for a single RO, return type totals ─── */

function emitROLines(
  ro: RepairOrder,
  rows: SpreadsheetRow[],
  groupIndex: number,
  isOpen: boolean,
): { total: number; cp: number; w: number; i: number } {
  let roTotal = 0, roCP = 0, roW = 0, roI = 0;
  const hasLines = ro.lines?.length > 0;
  // Open ROs use ro.date; paid ROs show paidDate as the effective date.
  const displayDate = normalizePaidDate(ro.paidDate) ?? ro.date;

  if (hasLines) {
    for (let i = 0; i < ro.lines.length; i++) {
      const line = ro.lines[i];
      const lt = line.laborType ?? ro.laborType;
      const hrs = line.hoursPaid;
      roTotal += hrs;
      if (lt === 'warranty') roW += hrs;
      else if (lt === 'customer-pay') roCP += hrs;
      else roI += hrs;

      rows.push({
        rowType: 'line', groupIndex,
        roNumber: ro.roNumber, date: displayDate,
        advisor: ro.advisor || '', customer: ro.customerName || '',
        vehicle: formatVehicleChip(ro.vehicle) || '',
        lineNo: line.lineNo, description: line.description,
        hours: line.hoursPaid, type: typeCode(lt), laborType: lt,
        notes: ro.notes || '',
        mileage: ro.mileage || '', vin: ro.vehicle?.vin || '',
        ro, lineIndex: i,
        isCarryover: isOpen || undefined,
      });
    }
  } else {
    roTotal = ro.paidHours;
    const lt = ro.laborType;
    if (lt === 'warranty') roW += ro.paidHours;
    else if (lt === 'customer-pay') roCP += ro.paidHours;
    else roI += ro.paidHours;

    rows.push({
      rowType: 'line', groupIndex,
      roNumber: ro.roNumber, date: displayDate,
      advisor: ro.advisor || '', customer: ro.customerName || '',
      vehicle: formatVehicleChip(ro.vehicle) || '',
      lineNo: 1, description: ro.workPerformed || '',
      hours: ro.paidHours, type: typeCode(lt), laborType: lt,
      notes: ro.notes || '',
      mileage: ro.mileage || '', vin: ro.vehicle?.vin || '',
      ro, lineIndex: -1,
      isCarryover: isOpen || undefined,
    });
  }

  return { total: roTotal, cp: roCP, w: roW, i: roI };
}

function pushPeriodSubtotal(rows: SpreadsheetRow[], periodLabel: string | undefined, hours: number, cp: number, w: number, i: number) {
  rows.push({
    rowType: 'periodSubtotal', groupIndex: -1,
    label: periodLabel ? `Period total (${periodLabel})` : 'Period total',
    hours, cpHours: cp, wHours: w, iHours: i,
  });
}

function buildOpenSection(openROs: RepairOrder[], rows: SpreadsheetRow[], startGroupIndex: number): number {
  if (openROs.length === 0) return startGroupIndex;

  rows.push({ rowType: 'sectionDivider', groupIndex: -1, label: 'Open / Unpaid' });

  const sorted = [...openROs].sort((a, b) => {
    const aD = a.date, bD = b.date;
    return bD.localeCompare(aD) || a.roNumber.localeCompare(b.roNumber);
  });

  let groupIndex = startGroupIndex;
  for (const ro of sorted) {
    const t = emitROLines(ro, rows, groupIndex, true);
    rows.push({
      rowType: 'roSubtotal', groupIndex,
      label: `RO #${ro.roNumber} (open)`,
      hours: t.total, cpHours: t.cp, wHours: t.w, iHours: t.i,
      isCarryover: true,
    });
    groupIndex++;
  }
  return groupIndex;
}

/* ─── Group by Date ─── */

function buildGroupedByDate(paidROs: RepairOrder[], openROs: RepairOrder[], periodLabel?: string): SpreadsheetRow[] {
  const sorted = [...paidROs].sort((a, b) => {
    const aD = normalizePaidDate(a.paidDate) ?? a.date;
    const bD = normalizePaidDate(b.paidDate) ?? b.date;
    return aD.localeCompare(bD) || a.roNumber.localeCompare(b.roNumber);
  });

  const rows: SpreadsheetRow[] = [];
  let groupIndex = 0;

  const dateMap = new Map<string, RepairOrder[]>();
  for (const ro of sorted) {
    const dateKey = (normalizePaidDate(ro.paidDate) ?? ro.date).slice(0, 10);
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
    dateMap.get(dateKey)!.push(ro);
  }

  let pT = 0, pCP = 0, pW = 0, pI = 0;

  for (const [dateKey, dateROs] of dateMap) {
    let dT = 0, dCP = 0, dW = 0, dI = 0;

    for (const ro of dateROs) {
      const t = emitROLines(ro, rows, groupIndex, false);
      rows.push({ rowType: 'roSubtotal', groupIndex, label: `RO #${ro.roNumber} total`, hours: t.total, cpHours: t.cp, wHours: t.w, iHours: t.i });
      dT += t.total; dCP += t.cp; dW += t.w; dI += t.i;
      groupIndex++;
    }

    rows.push({ rowType: 'daySubtotal', groupIndex: -1, label: `Day total (${fmtShortDate(dateKey)})`, hours: dT, cpHours: dCP, wHours: dW, iHours: dI });
    pT += dT; pCP += dCP; pW += dW; pI += dI;
  }

  pushPeriodSubtotal(rows, periodLabel, pT, pCP, pW, pI);

  buildOpenSection(openROs, rows, groupIndex);
  return rows;
}

/* ─── Group by RO ─── */

function buildGroupedByRO(paidROs: RepairOrder[], openROs: RepairOrder[], periodLabel?: string): SpreadsheetRow[] {
  const sorted = [...paidROs].sort((a, b) => a.roNumber.localeCompare(b.roNumber));
  const rows: SpreadsheetRow[] = [];
  let groupIndex = 0;
  let pT = 0, pCP = 0, pW = 0, pI = 0;

  for (const ro of sorted) {
    const t = emitROLines(ro, rows, groupIndex, false);
    rows.push({ rowType: 'roSubtotal', groupIndex, label: `RO #${ro.roNumber} total`, hours: t.total, cpHours: t.cp, wHours: t.w, iHours: t.i });
    pT += t.total; pCP += t.cp; pW += t.w; pI += t.i;
    groupIndex++;
  }

  pushPeriodSubtotal(rows, periodLabel, pT, pCP, pW, pI);

  buildOpenSection(openROs, rows, groupIndex);
  return rows;
}

/* ─── Group by Advisor ─── */

function buildGroupedByAdvisor(paidROs: RepairOrder[], openROs: RepairOrder[], periodLabel?: string): SpreadsheetRow[] {
  const sorted = [...paidROs].sort((a, b) =>
    (a.advisor || '').localeCompare(b.advisor || '') || a.roNumber.localeCompare(b.roNumber),
  );

  const advMap = new Map<string, RepairOrder[]>();
  for (const ro of sorted) {
    const key = ro.advisor || '(none)';
    if (!advMap.has(key)) advMap.set(key, []);
    advMap.get(key)!.push(ro);
  }

  const rows: SpreadsheetRow[] = [];
  let groupIndex = 0;
  let pT = 0, pCP = 0, pW = 0, pI = 0;

  for (const [advisor, advROs] of advMap) {
    let aT = 0, aCP = 0, aW = 0, aI = 0;

    for (const ro of advROs) {
      const t = emitROLines(ro, rows, groupIndex, false);
      rows.push({ rowType: 'roSubtotal', groupIndex, label: `RO #${ro.roNumber} total`, hours: t.total, cpHours: t.cp, wHours: t.w, iHours: t.i });
      aT += t.total; aCP += t.cp; aW += t.w; aI += t.i;
      groupIndex++;
    }

    rows.push({ rowType: 'advisorSubtotal', groupIndex: -1, label: `${advisor} total`, hours: aT, cpHours: aCP, wHours: aW, iHours: aI });
    pT += aT; pCP += aCP; pW += aW; pI += aI;
  }

  pushPeriodSubtotal(rows, periodLabel, pT, pCP, pW, pI);

  buildOpenSection(openROs, rows, groupIndex);
  return rows;
}

/* ─── No grouping (flat) ─── */

function buildFlat(paidROs: RepairOrder[], openROs: RepairOrder[], periodLabel?: string): SpreadsheetRow[] {
  const sorted = [...paidROs].sort((a, b) => {
    const aD = normalizePaidDate(a.paidDate) ?? a.date;
    const bD = normalizePaidDate(b.paidDate) ?? b.date;
    return aD.localeCompare(bD) || a.roNumber.localeCompare(b.roNumber);
  });

  const rows: SpreadsheetRow[] = [];
  let groupIndex = 0;
  let pT = 0, pCP = 0, pW = 0, pI = 0;

  for (const ro of sorted) {
    const t = emitROLines(ro, rows, groupIndex, false);
    pT += t.total; pCP += t.cp; pW += t.w; pI += t.i;
    groupIndex++;
  }

  pushPeriodSubtotal(rows, periodLabel, pT, pCP, pW, pI);

  buildOpenSection(openROs, rows, groupIndex);
  return rows;
}

/* ─── Builder from frozen CloseoutSnapshot ─── */

export function buildSpreadsheetRowsFromSnapshot(
  roSnapshots: ROSnapshot[],
  periodLabel?: string,
): SpreadsheetRow[] {
  const sorted = [...roSnapshots].sort((a, b) =>
    a.roDate.localeCompare(b.roDate) || a.roNumber.localeCompare(b.roNumber),
  );

  const rows: SpreadsheetRow[] = [];
  let groupIndex = 0;

  const dateMap = new Map<string, ROSnapshot[]>();
  for (const ro of sorted) {
    if (!dateMap.has(ro.roDate)) dateMap.set(ro.roDate, []);
    dateMap.get(ro.roDate)!.push(ro);
  }

  let periodTotal = 0;
  let periodCP = 0, periodW = 0, periodI = 0;

  for (const [dateKey, dateROs] of dateMap) {
    let dayTotal = 0;
    let dayCP = 0, dayW = 0, dayI = 0;

    for (const ro of dateROs) {
      let roTotal = 0;
      let roCP = 0, roW = 0, roI = 0;

      for (const line of ro.lines) {
        const hrs = line.hours;
        const lt = line.laborType;
        if (lt === 'warranty') roW += hrs;
        else if (lt === 'customer-pay') roCP += hrs;
        else roI += hrs;
        roTotal += hrs;

        rows.push({
          rowType: 'line',
          groupIndex,
          roNumber: ro.roNumber,
          date: ro.roDate,
          advisor: ro.advisor || '',
          customer: ro.customerName || '',
          vehicle: ro.vehicle || '',
          lineNo: line.lineNo,
          description: line.description,
          hours: line.hours,
          type: typeCode(lt),
          laborType: lt,
          notes: '',
          mileage: ro.mileage || '',
          vin: '',
        });
      }

      rows.push({
        rowType: 'roSubtotal',
        groupIndex,
        label: `RO #${ro.roNumber} total`,
        hours: roTotal,
        cpHours: roCP,
        wHours: roW,
        iHours: roI,
      });

      dayTotal += roTotal;
      dayCP += roCP;
      dayW += roW;
      dayI += roI;
      groupIndex++;
    }

    rows.push({
      rowType: 'daySubtotal',
      groupIndex: -1,
      label: `Day total (${fmtShortDate(dateKey)})`,
      hours: dayTotal,
      cpHours: dayCP,
      wHours: dayW,
      iHours: dayI,
    });

    periodTotal += dayTotal;
    periodCP += dayCP;
    periodW += dayW;
    periodI += dayI;
  }

  rows.push({
    rowType: 'periodSubtotal',
    groupIndex: -1,
    label: periodLabel ? `Period total (${periodLabel})` : 'Period total',
    hours: periodTotal,
    cpHours: periodCP,
    wHours: periodW,
    iHours: periodI,
  });

  return rows;
}

/* ─── Helpers ─── */

function fmtShortDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** Column headers for payroll export */
export const PAYROLL_EXPORT_HEADERS = ['RO #', 'Date', 'Advisor', 'Customer', 'Vehicle', 'Work Performed', 'Hours', 'Type'];

/** Column headers for audit export */
export const AUDIT_EXPORT_HEADERS = ['RO #', 'Date', 'Advisor', 'Customer', 'Vehicle', 'Line', 'Work Performed', 'Hours', 'Type', 'Notes', 'Mileage', 'VIN'];

/** Convert a SpreadsheetRow to an export cell array for the given headers */
export function rowToExportCells(row: SpreadsheetRow, headers: string[]): string[] {
  if (row.rowType === 'sectionDivider') return [];
  if (row.rowType === 'line') {
    return headers.map(h => {
      switch (h) {
        case 'RO #': return row.roNumber;
        case 'Date': return row.date;
        case 'Advisor': return row.advisor;
        case 'Customer': return row.customer;
        case 'Vehicle': return row.vehicle;
        case 'Line': return String(row.lineNo);
        case 'Work Performed': return row.description;
        case 'Hours': return row.hours.toFixed(2);
        case 'Type': return row.type;
        case 'Notes': return row.notes;
        case 'Mileage': return row.mileage;
        case 'VIN': return row.vin;
        default: return '';
      }
    });
  }

  // Subtotal rows
  return headers.map(h => {
    if (h === 'Work Performed') return row.label;
    if (h === 'Hours') return row.hours.toFixed(2);
    if (h === 'Type' && row.cpHours != null) {
      const parts: string[] = [];
      if (row.cpHours) parts.push(`CP: ${row.cpHours.toFixed(1)}`);
      if (row.wHours) parts.push(`W: ${row.wHours.toFixed(1)}`);
      if (row.iHours) parts.push(`I: ${row.iHours.toFixed(1)}`);
      return parts.join(' ');
    }
    return '';
  });
}
