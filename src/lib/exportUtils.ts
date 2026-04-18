import type { PayPeriodReport } from '@/hooks/usePayPeriodReport';

export function generateSummaryText(report: PayPeriodReport): string {
  const lines: string[] = [];
  lines.push(`PAY PERIOD REPORT: ${report.startDate} to ${report.endDate}`);
  lines.push(`Total Paid Hours: ${report.totalHours.toFixed(1)}h | ${report.totalROs} ROs | ${report.totalLines} lines`);
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
  if (report.flaggedCount > 0) {
    lines.push('WARNINGS:');
    if (report.flaggedCount > 0) lines.push(`  🚩 ${report.flaggedCount} flagged items`);
  }

  return lines.join('\n');
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
