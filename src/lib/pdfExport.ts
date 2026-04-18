import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { CloseoutSnapshot } from '@/hooks/useCloseouts';
import type { SpiffManualEntry, SpiffRule } from '@/types/spiff';
import { buildSpiffReport } from '@/lib/spiffUtils';
import {
  type SpreadsheetRow,
  type SpreadsheetSubtotalRow,
  PAYROLL_EXPORT_HEADERS,
  rowToExportCells,
  buildSpreadsheetRows,
  buildSpreadsheetRowsFromSnapshot,
} from '@/lib/buildSpreadsheetRows';
import type { RepairOrder } from '@/types/ro';

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
const SUBTOTAL_FILL = [245, 245, 245] as const;
const DAY_FILL = [235, 240, 250] as const;
const PERIOD_FILL = [230, 240, 255] as const;
const SUBTOTAL_STYLE = { fontStyle: 'bold' as const, fillColor: [...SUBTOTAL_FILL] };
const DAY_STYLE = { fontStyle: 'bold' as const, fillColor: [...DAY_FILL] };
const PERIOD_STYLE = { fontStyle: 'bold' as const, fillColor: [...PERIOD_FILL] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jspdf-autotable CellHookData is loosely typed
function applyTypeColors(data: any, typeColIdx: number) {
  if (data.section === 'body' && data.column.index === typeColIdx) {
    const val = typeof data.cell.raw === 'string' ? data.cell.raw : '';
    if (val === 'W' || val.startsWith('W:')) data.cell.styles.textColor = [37, 99, 235];
    else if (val === 'CP' || val.startsWith('CP:')) data.cell.styles.textColor = [22, 163, 74];
    else if (val === 'I' || val.startsWith('I:')) data.cell.styles.textColor = [234, 88, 12];
  }
}

interface PDFSpiffSummaryContext {
  startDate: string;
  endDate: string;
  rosInRange: RepairOrder[];
  spiffRules: SpiffRule[];
  spiffManualEntries: SpiffManualEntry[];
}

export interface PDFSpiffSummaryData {
  totalPay: number;
  totalAutoCount: number;
  totalManualCount: number;
  totalCount: number;
  manualOnlyPay: number;
  byRule: Array<{ ruleName: string; totalCount: number; totalPay: number }>;
  hasSpiffs: boolean;
}

/* ─── Export PDF from SpreadsheetRow[] ─── */

export function exportPDFFromRows(
  rows: SpreadsheetRow[],
  filename: string,
  title: string,
  spiffContext?: PDFSpiffSummaryContext,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const headers = PAYROLL_EXPORT_HEADERS;

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 21);
  doc.setTextColor(0);

  const body: (string | { content: string; styles: Record<string, unknown> })[][] = [];

  for (const row of rows) {
    if (row.rowType === 'line') {
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
  const hoursIdx = headers.indexOf('Hours');
  const dateIdx = headers.indexOf('Date');
  const wpIdx = headers.indexOf('Work Performed');
  const roIdx = headers.indexOf('RO #');
  const advisorIdx = headers.indexOf('Advisor');
  const lineNoIdx = headers.indexOf('#');

  autoTable(doc, {
    head: [headers],
    body,
    startY: 25,
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      ...(hoursIdx >= 0 ? { [hoursIdx]: { halign: 'right', cellWidth: 18 } } : {}),
      ...(wpIdx >= 0 ? { [wpIdx]: { cellWidth: 'auto', minCellWidth: 40 } } : {}),
      ...(dateIdx >= 0 ? { [dateIdx]: { cellWidth: 26 } } : {}),
      ...(roIdx >= 0 ? { [roIdx]: { cellWidth: 22 } } : {}),
      ...(typeColIdx >= 0 ? { [typeColIdx]: { cellWidth: 20 } } : {}),
      ...(advisorIdx >= 0 ? { [advisorIdx]: { cellWidth: 28 } } : {}),
      ...(lineNoIdx >= 0 ? { [lineNoIdx]: { cellWidth: 10, halign: 'center' } } : {}),
    },
    didParseCell: (data) => applyTypeColors(data, typeColIdx),
    margin: { left: 10, right: 10 },
    tableWidth: 'auto',
  });

  const lastTableY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 25;
  const spiffStartY = Math.max(35, lastTableY + 10);
  renderSpiffSummarySection(doc, spiffContext, spiffStartY);

  addPageNumbers(doc);
  doc.save(filename);
}

function renderSpiffSummarySection(
  doc: jsPDF,
  context: PDFSpiffSummaryContext | undefined,
  startY: number,
) {
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text('Spiff Summary', 14, startY);

  if (!context) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text('No spiff data available for this export.', 14, startY + 6);
    doc.setTextColor(0);
    return;
  }

  const report = buildSpiffSummaryData(context);

  const hasSpiffs = report.totalCount > 0;
  if (!hasSpiffs) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text('No spiffs in selected range.', 14, startY + 6);
    doc.setTextColor(0);
    return;
  }

  autoTable(doc, {
    startY: startY + 3,
    head: [['Metric', 'Value']],
    body: [
      ['Total spiff pay', `$${report.totalPay.toFixed(2)}`],
      ['Auto spiffs count', String(report.totalAutoCount)],
      ['Manual spiffs count', String(report.totalManualCount)],
      ['Total spiff items', String(report.totalCount)],
      ...(report.manualOnlyPay > 0 ? [['Manual-only pay', `$${report.manualOnlyPay.toFixed(2)}`]] : []),
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: 'right', cellWidth: 24 },
    },
    margin: { left: 14 },
    tableWidth: 69,
  });

  const rulesStartY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY + 10) + 4;
  if (report.byRule.length === 0) return;

  autoTable(doc, {
    startY: rulesStartY,
    head: [['Rule', 'Count', 'Pay']],
    body: report.byRule.map((rule) => [rule.ruleName, String(rule.totalCount), `$${rule.totalPay.toFixed(2)}`]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [55, 55, 55], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'right', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 18 },
    },
    margin: { left: 14 },
    tableWidth: 84,
  });
}

export function buildSpiffSummaryData(context: PDFSpiffSummaryContext): PDFSpiffSummaryData {
  const report = buildSpiffReport({
    ros: context.rosInRange,
    startDate: context.startDate,
    endDate: context.endDate,
    rules: context.spiffRules,
    manualEntries: context.spiffManualEntries,
  });

  return {
    totalPay: report.totalPay,
    totalAutoCount: report.totalAutoCount,
    totalManualCount: report.totalManualCount,
    totalCount: report.totalCount,
    manualOnlyPay: report.manualOnlyPay,
    byRule: report.byRule.map((rule) => ({
      ruleName: rule.ruleName,
      totalCount: rule.totalCount,
      totalPay: rule.totalPay,
    })),
    hasSpiffs: report.totalCount > 0,
  };
}

/* ─── Legacy: Export PDF from RepairOrder[] (used by SpreadsheetView) ─── */

export function exportPDF(
  ros: RepairOrder[],
  filename: string,
  title: string,
) {
  const rows = buildSpreadsheetRows({ ros });
  exportPDFFromRows(rows, filename, title);
}

/* ─── Closeout PDF ─── */

export function exportCloseoutPDF(
  closeout: CloseoutSnapshot,
) {
  const rangeLabels: Record<string, string> = {
    day: 'Day', week: 'Week', two_weeks: '2 Weeks',
    pay_period: 'Pay Period', month: 'Month', custom: 'Custom',
  };
  const rangeLabel = rangeLabels[closeout.rangeType] || closeout.rangeType;
  const title = `${rangeLabel} Closeout — Payroll`;
  const periodLabel = `${fmtDate(closeout.periodStart)} – ${fmtDate(closeout.periodEnd)}`;

  const rows = buildSpreadsheetRowsFromSnapshot(closeout.roSnapshot || [], periodLabel);
  exportPDFFromRows(
    rows,
    `closeout-payroll-${closeout.periodStart}-to-${closeout.periodEnd}.pdf`,
    title,
  );
}
