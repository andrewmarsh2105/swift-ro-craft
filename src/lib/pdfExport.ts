import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ALL_COLUMNS, type ColumnId } from '@/components/shared/spreadsheet/types';
import { typeCode } from '@/lib/csvUtils';
import { formatVehicleChip } from '@/types/ro';
import type { RepairOrder } from '@/types/ro';
import type { CloseoutSnapshot } from '@/hooks/useCloseouts';

/* ─── Shared helpers ─── */

function addPageNumbers(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 5);
  }
}

/** Format a YYYY-MM-DD string to a readable short date like "Mar 1, 2025" */
function fmtDate(d?: string | null): string {
  if (!d) return '';
  try {
    const parts = d.split('-');
    if (parts.length === 3) {
      return format(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])), 'MMM d, yyyy');
    }
    return d;
  } catch { return d; }
}

function applyTypeColors(data: any, typeColIdx: number) {
  if (data.section === 'body' && data.column.index === typeColIdx) {
    const val = typeof data.cell.raw === 'string' ? data.cell.raw : '';
    if (val === 'W') data.cell.styles.textColor = [37, 99, 235];
    else if (val === 'CP') data.cell.styles.textColor = [22, 163, 74];
    else if (val === 'I') data.cell.styles.textColor = [234, 88, 12];
  }
}

const BOLD = { fontStyle: 'bold' as const };
const PERIOD_STYLE = { fontStyle: 'bold' as const, fillColor: [230, 240, 255] as any };

/* ─── Live Spreadsheet PDF ─── */

interface FlatRow {
  ro: RepairOrder;
  lineIndex: number;
  roTotal: number;
}

function getPlainValue(colId: ColumnId, row: FlatRow): string {
  const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
  const laborType = line?.laborType ?? row.ro.laborType;
  switch (colId) {
    case 'roNumber': return row.ro.roNumber;
    case 'date': return fmtDate(row.ro.paidDate || row.ro.date);
    case 'advisor': return row.ro.advisor || '';
    case 'customer': return row.ro.customerName || '';
    case 'vehicle': return formatVehicleChip(row.ro.vehicle) || '';
    case 'lineNo': return String(line ? line.lineNo : 1);
    case 'description': return line ? line.description : (row.ro as any).workPerformed || '';
    case 'hours': return (line ? line.hoursPaid : row.ro.paidHours).toFixed(2);
    case 'type': return typeCode(laborType);
    case 'roTotal': return row.roTotal.toFixed(2);
    case 'tbd': return line?.isTbd ? 'Y' : 'N';
    case 'notes': return row.ro.notes || '';
    case 'mileage': return row.ro.mileage || '';
    case 'vin': return row.ro.vehicle?.vin || '';
    default: return '';
  }
}

export function exportPDF(
  ros: RepairOrder[],
  columns: ColumnId[],
  filename: string,
  title: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 21);
  doc.setTextColor(0);

  const sorted = [...ros].sort((a, b) => {
    const aD = a.paidDate || a.date, bD = b.paidDate || b.date;
    return aD.localeCompare(bD) || a.roNumber.localeCompare(b.roNumber);
  });

  const flatRows: FlatRow[] = [];
  for (const ro of sorted) {
    const hasL = ro.lines?.length > 0;
    const roTotal = hasL
      ? ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + l.hoursPaid, 0)
      : ro.paidHours;
    if (hasL) {
      ro.lines.forEach((_, i) => {
        if (!ro.lines[i].isTbd) flatRows.push({ ro, lineIndex: i, roTotal });
      });
    } else {
      flatRows.push({ ro, lineIndex: -1, roTotal });
    }
  }

  const headers = columns.map(id => ALL_COLUMNS.find(c => c.id === id)!.label);
  const body: (string | { content: string; styles: Record<string, any> })[][] = [];
  let currentDate = '';
  let dayTotal = 0;

  for (const row of flatRows) {
    const dateKey = (row.ro.paidDate || row.ro.date).slice(0, 10);
    if (currentDate && dateKey !== currentDate) {
      body.push(columns.map(id => {
        if (id === 'date') return { content: fmtDate(currentDate), styles: BOLD };
        if (id === 'description') return { content: 'DAY TOTAL', styles: BOLD };
        if (id === 'hours') return { content: dayTotal.toFixed(2), styles: BOLD };
        return '';
      }));
      dayTotal = 0;
    }
    currentDate = dateKey;
    const line = row.lineIndex >= 0 ? row.ro.lines[row.lineIndex] : null;
    dayTotal += line ? line.hoursPaid : row.ro.paidHours;
    body.push(columns.map(id => getPlainValue(id, row)));
  }

  if (currentDate) {
    body.push(columns.map(id => {
      if (id === 'date') return { content: fmtDate(currentDate), styles: BOLD };
      if (id === 'description') return { content: 'DAY TOTAL', styles: BOLD };
      if (id === 'hours') return { content: dayTotal.toFixed(2), styles: BOLD };
      return '';
    }));
  }

  const periodTotal = flatRows.reduce((sum, r) => {
    const line = r.lineIndex >= 0 ? r.ro.lines[r.lineIndex] : null;
    return sum + (line ? line.hoursPaid : r.ro.paidHours);
  }, 0);
  body.push(columns.map(id => {
    if (id === 'description') return { content: 'PERIOD TOTAL', styles: PERIOD_STYLE };
    if (id === 'hours') return { content: periodTotal.toFixed(2), styles: PERIOD_STYLE };
    return { content: '', styles: { fillColor: [230, 240, 255] as any } };
  }));

  const typeColIdx = columns.indexOf('type');
  autoTable(doc, {
    head: [headers],
    body,
    startY: 25,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: columns.reduce((acc, id, i) => {
      if (id === 'hours' || id === 'roTotal') acc[i] = { halign: 'right' };
      if (id === 'description') acc[i] = { cellWidth: 50 };
      return acc;
    }, {} as Record<number, any>),
    didParseCell: (data) => applyTypeColors(data, typeColIdx),
    margin: { left: 10, right: 10 },
  });

  addPageNumbers(doc);
  doc.save(filename);
}

/* ─── Closeout PDF ─── */

export function exportCloseoutPDF(
  closeout: CloseoutSnapshot,
  mode: 'payroll' | 'audit',
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const ros = closeout.roSnapshot || [];
  const t = closeout.totals;

  const rangeLabels: Record<string, string> = {
    day: 'Day', week: 'Week', two_weeks: '2 Weeks',
    pay_period: 'Pay Period', month: 'Month', custom: 'Custom',
  };
  const rangeLabel = rangeLabels[closeout.rangeType] || closeout.rangeType;
  const title = `${rangeLabel} Closeout — ${mode === 'payroll' ? 'Payroll' : 'Audit'}`;

  doc.setFontSize(14);
  doc.text(title, 14, 12);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`${fmtDate(closeout.periodStart)} to ${fmtDate(closeout.periodEnd)}`, 14, 18);
  doc.text(
    `Total: ${t.totalHours.toFixed(1)}h  |  CP: ${t.customerPayHours.toFixed(1)}h  |  W: ${t.warrantyHours.toFixed(1)}h  |  I: ${t.internalHours.toFixed(1)}h  |  ${t.totalROs} ROs  |  ${t.totalLines} lines`,
    14, 23,
  );
  doc.setFontSize(7);
  doc.text(`Closed: ${format(new Date(closeout.closedAt), 'MMM d, yyyy h:mm a')}`, 14, 27);
  doc.setTextColor(0);

  const payrollHeaders = ['RO#', 'Date', 'Advisor', 'Customer', 'Vehicle', 'Work Performed', 'Hours', 'Type'];
  const auditHeaders = [...payrollHeaders, 'Line#', 'Mileage'];
  const headers = mode === 'audit' ? auditHeaders : payrollHeaders;

  const sorted = [...ros].sort((a, b) => a.roDate.localeCompare(b.roDate) || a.roNumber.localeCompare(b.roNumber));

  const body: (string | { content: string; styles: Record<string, any> })[][] = [];
  let currentDate = '';
  let dayTotal = 0;

  for (const ro of sorted) {
    const paidLines = ro.lines.filter(l => !l.isTbd);
    if (paidLines.length === 0) continue;

    if (currentDate && ro.roDate !== currentDate) {
      body.push(headers.map(h => {
        if (h === 'Date') return { content: fmtDate(currentDate), styles: BOLD };
        if (h === 'Work Performed') return { content: 'DAY TOTAL', styles: BOLD };
        if (h === 'Hours') return { content: dayTotal.toFixed(2), styles: BOLD };
        return '';
      }));
      dayTotal = 0;
    }
    currentDate = ro.roDate;

    for (const l of paidLines) {
      dayTotal += l.hours;
      const tc = l.laborType === 'warranty' ? 'W' : l.laborType === 'internal' ? 'I' : 'CP';
      const base: string[] = [
        ro.roNumber, fmtDate(ro.roDate), ro.advisor, ro.customerName || '',
        ro.vehicle || '', l.description, l.hours.toFixed(2), tc,
      ];
      if (mode === 'audit') {
        base.push(String(l.lineNo), ro.mileage || '');
      }
      body.push(base);
    }
  }

  if (currentDate) {
    body.push(headers.map(h => {
      if (h === 'Date') return { content: currentDate, styles: BOLD };
      if (h === 'Work Performed') return { content: 'DAY TOTAL', styles: BOLD };
      if (h === 'Hours') return { content: dayTotal.toFixed(2), styles: BOLD };
      return '';
    }));
  }

  const periodTotal = sorted.reduce((sum, ro) => sum + ro.totalPaidHours, 0);
  body.push(headers.map(h => {
    if (h === 'Work Performed') return { content: 'PERIOD TOTAL', styles: PERIOD_STYLE };
    if (h === 'Hours') return { content: periodTotal.toFixed(2), styles: PERIOD_STYLE };
    return { content: '', styles: { fillColor: [230, 240, 255] as any } };
  }));

  const typeColIdx = headers.indexOf('Type');
  autoTable(doc, {
    head: [headers],
    body,
    startY: 31,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      ...(headers.indexOf('Date') >= 0 ? { [headers.indexOf('Date')]: { cellWidth: 28 } } : {}),
      ...(headers.indexOf('Hours') >= 0 ? { [headers.indexOf('Hours')]: { halign: 'right' } } : {}),
      ...(headers.indexOf('Work Performed') >= 0 ? { [headers.indexOf('Work Performed')]: { cellWidth: 50 } } : {}),
    },
    didParseCell: (data) => applyTypeColors(data, typeColIdx),
    margin: { left: 10, right: 10 },
  });

  addPageNumbers(doc);
  doc.save(`closeout-${mode}-${closeout.periodStart}-to-${closeout.periodEnd}.pdf`);
}
