import type { PayPeriodReport } from '@/hooks/usePayPeriodReport';
import type { RepairOrder, ROLine } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';

/** Wrap a CSV cell value in double-quotes, escaping any embedded quotes. */
function csvCell(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}

export function generateLineCSV(report: PayPeriodReport): string {
  const headers = [
    'RO Number', 'Date', 'Advisor', 'Customer', 'Vehicle', 'Line #', 'Description',
    'Labor Type', 'Hours Paid', 'Matched Reference',
  ];

  // Group lines by RO so we only print RO-level info on the first line
  const filtered = report.linesInRange.filter(({ line }) => line.description.trim() !== '' && !line.isTbd);
  let lastRoId = '';
  const rows = filtered.map(({ ro, line }) => {
    const isFirstLine = ro.id !== lastRoId;
    lastRoId = ro.id;
    const vehicleLabel = formatVehicleChip(line.vehicleOverride ? line.lineVehicle : ro.vehicle) || '';
    return [
      csvCell(isFirstLine ? ro.roNumber : ''),
      csvCell(isFirstLine ? ro.date : ''),
      csvCell(isFirstLine ? (ro.advisor || '—') : ''),
      csvCell(isFirstLine ? (ro.customerName || '') : ''),
      csvCell(isFirstLine ? vehicleLabel : ''),
      csvCell(line.lineNo),
      csvCell(line.description || ''),
      csvCell(line.laborType || 'customer-pay'),
      csvCell(line.hoursPaid.toFixed(2)),
      csvCell(line.matchedReferenceId || ''),
    ];
  });

  // UTF-8 BOM (\uFEFF) so Excel on Windows opens the file in the correct encoding
  return '\uFEFF' + [headers.map(csvCell).join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function generateSummaryText(report: PayPeriodReport): string {
  const lines: string[] = [];
  lines.push(`PAY PERIOD REPORT: ${report.startDate} to ${report.endDate}`);
  lines.push(`Total Paid Hours: ${report.totalHours.toFixed(1)}h | ${report.totalROs} ROs | ${report.totalLines} lines`);
  if (report.tbdLineCount > 0) {
    lines.push(`TBD: ${report.tbdLineCount} lines (${report.tbdHours.toFixed(1)}h) — not counted in totals`);
  }
  lines.push('');

  // By labor type
  lines.push('BY LABOR TYPE:');
  report.byLaborType.forEach(lt => {
    lines.push(`  ${lt.label}: ${lt.totalHours.toFixed(1)}h (${lt.lineCount} lines)`);
  });
  lines.push('');

  // By advisor
  lines.push('BY ADVISOR:');
  report.byAdvisor.forEach(a => {
    lines.push(`  ${a.advisor}: ${a.totalHours.toFixed(1)}h (${a.roCount} ROs) [W:${a.warrantyHours.toFixed(1)} CP:${a.customerPayHours.toFixed(1)} Int:${a.internalHours.toFixed(1)}]`);
  });
  lines.push('');

  // By day
  lines.push('BY DAY:');
  report.byDay.filter(d => d.totalHours > 0 || d.roCount > 0).forEach(d => {
    const [y, m, day] = d.date.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    lines.push(`  ${label}: ${d.totalHours.toFixed(1)}h (${d.roCount} ROs)`);
  });
  lines.push('');

  // Warnings
  if (report.flaggedCount > 0 || report.tbdLineCount > 0) {
    lines.push('WARNINGS:');
    if (report.tbdLineCount > 0) lines.push(`  ⏳ ${report.tbdLineCount} TBD lines (${report.tbdHours.toFixed(1)}h not counted)`);
    if (report.flaggedCount > 0) lines.push(`  🚩 ${report.flaggedCount} flagged items`);
  }

  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareSummary(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Pay Period Report', text });
    } catch {
      // User cancelled
    }
  } else {
    await navigator.clipboard.writeText(text);
  }
}
