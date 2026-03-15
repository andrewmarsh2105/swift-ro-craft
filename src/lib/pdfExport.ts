import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { typeCode } from '@/lib/csvUtils';
import type { CloseoutSnapshot } from '@/hooks/useCloseouts';
import {
  type SpreadsheetRow,
  type SpreadsheetLineRow,
  type SpreadsheetSubtotalRow,
  PAYROLL_EXPORT_HEADERS,
  AUDIT_EXPORT_HEADERS,
  rowToExportCells,
  buildSpreadsheetRows,
  buildSpreadsheetRowsFromSnapshot,
} from '@/lib/buildSpreadsheetRows';
import type { RepairOrder } from '@/types/ro';
import type { ColumnId } from '@/components/shared/spreadsheet/types';

/* ─── Shared helpers ─── */

function addPageNumbers(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 5);
  }
}

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

const BOLD = { fontStyle: 'bold' as const };
const SUBTOTAL_STYLE = { fontStyle: 'bold' as const, fillColor: [245, 245, 245] as any };
const DAY_STYLE = { fontStyle: 'bold' as const, fillColor: [235, 240, 250] as any };
const PERIOD_STYLE = { fontStyle: 'bold' as const, fillColor: [230, 240, 255] as any };

function applyTypeColors(data: any, typeColIdx: number) {
  if (data.section === 'body' && data.column.index === typeColIdx) {
    const val = typeof data.cell.raw === 'string' ? data.cell.raw : '';
    if (val === 'W' || val.startsWith('W:')) data.cell.styles.textColor = [37, 99, 235];
    else if (val === 'CP' || val.startsWith('CP:')) data.cell.styles.textColor = [22, 163, 74];
    else if (val === 'I' || val.startsWith('I:')) data.cell.styles.textColor = [234, 88, 12];
  }
}

/* ─── Export PDF from SpreadsheetRow[] ─── */

export function exportPDFFromRows(
  rows: SpreadsheetRow[],
  mode: 'payroll' | 'audit',
  filename: string,
  title: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const headers = mode === 'payroll' ? PAYROLL_EXPORT_HEADERS : AUDIT_EXPORT_HEADERS;

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 21);
  doc.setTextColor(0);

  const body: (string | { content: string; styles: Record<string, any> })[][] = [];

  for (const row of rows) {
    if (row.rowType === 'line') {
      const line = row as SpreadsheetLineRow;
      if (line.isTbd) continue; // skip TBD
      body.push(rowToExportCells(row, headers));
    } else {
      const sub = row as SpreadsheetSubtotalRow;
      const style = row.rowType === 'periodSubtotal' ? PERIOD_STYLE
        : row.rowType === 'daySubtotal' ? DAY_STYLE : SUBTOTAL_STYLE;

      body.push(headers.map(h => {
        if (h === 'Work Performed') return { content: sub.label, styles: style };
        if (h === 'Hours') return { content: sub.hours.toFixed(2), styles: style };
        if (h === 'Type' && sub.cpHours != null) {
          const parts: string[] = [];
          if (sub.cpHours) parts.push(`CP: ${sub.cpHours.toFixed(1)}`);
          if (sub.wHours) parts.push(`W: ${sub.wHours.toFixed(1)}`);
          if (sub.iHours) parts.push(`I: ${sub.iHours.toFixed(1)}`);
          return { content: parts.join(' '), styles: style };
        }
        return { content: '', styles: { fillColor: style.fillColor } };
      }));
    }
  }

  const typeColIdx = headers.indexOf('Type');
  autoTable(doc, {
    head: [headers],
    body,
    startY: 25,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      ...(headers.indexOf('Hours') >= 0 ? { [headers.indexOf('Hours')]: { halign: 'right' } } : {}),
      ...(headers.indexOf('Work Performed') >= 0 ? { [headers.indexOf('Work Performed')]: { cellWidth: 50 } } : {}),
      ...(headers.indexOf('Date') >= 0 ? { [headers.indexOf('Date')]: { cellWidth: 28 } } : {}),
    },
    didParseCell: (data) => applyTypeColors(data, typeColIdx),
    margin: { left: 10, right: 10 },
  });

  addPageNumbers(doc);
  doc.save(filename);
}

/* ─── Legacy: Export PDF from RepairOrder[] (used by SpreadsheetView) ─── */

export function exportPDF(
  ros: RepairOrder[],
  columns: ColumnId[],
  filename: string,
  title: string,
) {
  const mode = columns.includes('lineNo') ? 'audit' : 'payroll';
  const rows = buildSpreadsheetRows({ ros });
  exportPDFFromRows(rows, mode, filename, title);
}

/* ─── Closeout PDF ─── */

export function exportCloseoutPDF(
  closeout: CloseoutSnapshot,
  mode: 'payroll' | 'audit',
) {
  const rangeLabels: Record<string, string> = {
    day: 'Day', week: 'Week', two_weeks: '2 Weeks',
    pay_period: 'Pay Period', month: 'Month', custom: 'Custom',
  };
  const rangeLabel = rangeLabels[closeout.rangeType] || closeout.rangeType;
  const title = `${rangeLabel} Closeout — ${mode === 'payroll' ? 'Payroll' : 'Audit'}`;
  const periodLabel = `${fmtDate(closeout.periodStart)} – ${fmtDate(closeout.periodEnd)}`;

  const rows = buildSpreadsheetRowsFromSnapshot(closeout.roSnapshot || [], periodLabel);
  exportPDFFromRows(
    rows,
    mode,
    `closeout-${mode}-${closeout.periodStart}-to-${closeout.periodEnd}.pdf`,
    title,
  );
}
