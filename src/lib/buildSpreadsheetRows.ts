import { typeCode } from '@/lib/csvUtils';
import { formatVehicleChip } from '@/types/ro';
import type { RepairOrder } from '@/types/ro';
import type { ROSnapshot } from '@/hooks/useCloseouts';

/* ─── Row types ─── */

export type SpreadsheetRowType = 'line' | 'roSubtotal' | 'daySubtotal' | 'periodSubtotal';

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
  isTbd: boolean;
  notes: string;
  mileage: string;
  vin: string;
  /** Original RO reference for click handlers (only present for live data) */
  ro?: RepairOrder;
  lineIndex?: number;
}

export interface SpreadsheetSubtotalRow {
  rowType: 'roSubtotal' | 'daySubtotal' | 'periodSubtotal';
  groupIndex: number;
  label: string; // e.g. "RO #12345 total", "Day total (Feb 27)", "Period total (Feb 23–Mar 8)"
  hours: number;
  /** Optional type breakdown */
  cpHours?: number;
  wHours?: number;
  iHours?: number;
}

export type SpreadsheetRow = SpreadsheetLineRow | SpreadsheetSubtotalRow;

/* ─── Builder from live RepairOrder[] ─── */

export interface BuildRowsOptions {
  ros: RepairOrder[];
  periodLabel?: string; // e.g. "Feb 23–Mar 8"
}

export function buildSpreadsheetRows({ ros, periodLabel }: BuildRowsOptions): SpreadsheetRow[] {
  const sorted = [...ros].sort((a, b) => {
    const aD = a.paidDate || a.date, bD = b.paidDate || b.date;
    return aD.localeCompare(bD) || a.roNumber.localeCompare(b.roNumber);
  });

  const rows: SpreadsheetRow[] = [];
  let groupIndex = 0;

  // Group by date
  const dateMap = new Map<string, RepairOrder[]>();
  for (const ro of sorted) {
    const dateKey = (ro.paidDate || ro.date).slice(0, 10);
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
    dateMap.get(dateKey)!.push(ro);
  }

  let periodTotal = 0;
  let periodCP = 0, periodW = 0, periodI = 0;

  for (const [dateKey, dateROs] of dateMap) {
    let dayTotal = 0;
    let dayCP = 0, dayW = 0, dayI = 0;

    for (const ro of dateROs) {
      const hasLines = ro.lines?.length > 0;
      let roTotal = 0;
      let roCP = 0, roW = 0, roI = 0;

      if (hasLines) {
        for (let i = 0; i < ro.lines.length; i++) {
          const line = ro.lines[i];
          const lt = line.laborType ?? ro.laborType;
          const hrs = line.isTbd ? 0 : line.hoursPaid;
          roTotal += hrs;
          if (lt === 'warranty') roW += hrs;
          else if (lt === 'customer-pay') roCP += hrs;
          else roI += hrs;

          rows.push({
            rowType: 'line',
            groupIndex,
            roNumber: ro.roNumber,
            date: ro.paidDate || ro.date,
            advisor: ro.advisor || '',
            customer: ro.customerName || '',
            vehicle: formatVehicleChip(ro.vehicle) || '',
            lineNo: line.lineNo,
            description: line.description,
            hours: line.hoursPaid,
            type: typeCode(lt),
            laborType: lt,
            isTbd: line.isTbd || false,
            notes: ro.notes || '',
            mileage: ro.mileage || '',
            vin: ro.vehicle?.vin || '',
            ro,
            lineIndex: i,
          });
        }
      } else {
        roTotal = ro.paidHours;
        const lt = ro.laborType;
        if (lt === 'warranty') roW += ro.paidHours;
        else if (lt === 'customer-pay') roCP += ro.paidHours;
        else roI += ro.paidHours;

        rows.push({
          rowType: 'line',
          groupIndex,
          roNumber: ro.roNumber,
          date: ro.paidDate || ro.date,
          advisor: ro.advisor || '',
          customer: ro.customerName || '',
          vehicle: formatVehicleChip(ro.vehicle) || '',
          lineNo: 1,
          description: ro.workPerformed || '',
          hours: ro.paidHours,
          type: typeCode(lt),
          laborType: lt,
          isTbd: false,
          notes: ro.notes || '',
          mileage: ro.mileage || '',
          vin: ro.vehicle?.vin || '',
          ro,
          lineIndex: -1,
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
      const paidLines = ro.lines.filter(l => !l.isTbd);
      let roTotal = 0;
      let roCP = 0, roW = 0, roI = 0;

      for (const line of ro.lines) {
        const hrs = line.isTbd ? 0 : line.hours;
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
          isTbd: line.isTbd,
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
export const AUDIT_EXPORT_HEADERS = ['RO #', 'Date', 'Advisor', 'Customer', 'Vehicle', 'Line', 'Work Performed', 'Hours', 'Type', 'TBD', 'Notes', 'Mileage', 'VIN'];

/** Convert a SpreadsheetRow to an export cell array for the given headers */
export function rowToExportCells(row: SpreadsheetRow, headers: string[]): string[] {
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
        case 'TBD': return row.isTbd ? 'Y' : 'N';
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
