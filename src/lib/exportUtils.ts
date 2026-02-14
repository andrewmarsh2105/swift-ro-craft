import type { PayPeriodReport } from '@/hooks/usePayPeriodReport';
import type { RepairOrder, ROLine } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';

export function generateLineCSV(report: PayPeriodReport): string {
  const headers = [
    'RO Number', 'Date', 'Advisor', 'Customer', 'Vehicle', 'Line #', 'Description',
    'Labor Type', 'Hours Paid', 'Matched Reference',
  ];

  const rows = report.linesInRange
    .filter(({ line }) => line.description.trim() !== '')
    .map(({ ro, line }) => {
      const vehicleLabel = formatVehicleChip(line.vehicleOverride ? line.lineVehicle : ro.vehicle) || '';
      return [
        ro.roNumber,
        ro.date,
        ro.advisor || '—',
        `"${(ro.customerName || '').replace(/"/g, '""')}"`,
        `"${vehicleLabel.replace(/"/g, '""')}"`,
        line.lineNo.toString(),
        `"${(line.description || '').replace(/"/g, '""')}"`,
        line.laborType || 'customer-pay',
        line.hoursPaid.toFixed(2),
        line.matchedReferenceId || '',
      ];
    });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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
