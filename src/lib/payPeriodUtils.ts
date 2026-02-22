/**
 * Given an array of pay period end dates (day-of-month, e.g. [15, 28])
 * and a reference date (usually today), calculate the current pay period range.
 *
 * Example: endDates = [15, 28]
 *   - Period 1: 16th → 28th
 *   - Period 2: 29th → 15th (next month)
 */
export function getCustomPayPeriodRange(
  endDates: number[],
  referenceDate: Date
): { start: string; end: string } {
  if (!endDates.length) {
    // Fallback: current month
    const y = referenceDate.getFullYear();
    const m = referenceDate.getMonth();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start: fmtDate(start), end: fmtDate(end) };
  }

  const sorted = [...endDates].sort((a, b) => a - b);
  const today = referenceDate.getDate();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  // Find which period we're currently in
  // Each end date marks the last day of a period
  // The start of a period is the day after the previous end date

  for (let i = 0; i < sorted.length; i++) {
    const endDay = sorted[i];
    const prevEndDay = i === 0 ? sorted[sorted.length - 1] : sorted[i - 1];

    let periodStart: Date;
    let periodEnd: Date;

    if (i === 0) {
      // First period: starts after last end date of previous month
      periodStart = new Date(year, month - 1, prevEndDay + 1);
      periodEnd = new Date(year, month, endDay);
    } else {
      periodStart = new Date(year, month, prevEndDay + 1);
      periodEnd = new Date(year, month, endDay);
    }

    // Clamp end day to actual month length
    const lastDayOfEndMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate();
    if (endDay > lastDayOfEndMonth) {
      periodEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0);
    }

    if (today <= endDay || i === sorted.length - 1) {
      // Check if today actually falls in this period
      if (referenceDate >= periodStart && referenceDate <= periodEnd) {
        return { start: fmtDate(periodStart), end: fmtDate(periodEnd) };
      }
    }
  }

  // If we haven't found a match, we're in the last period that wraps to next month
  const lastEndDay = sorted[sorted.length - 1];
  const periodStart = new Date(year, month, lastEndDay + 1);
  const nextEndDay = sorted[0];
  const periodEnd = new Date(year, month + 1, nextEndDay);

  // Clamp
  const lastDayOfNextMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate();
  if (nextEndDay > lastDayOfNextMonth) {
    periodEnd.setDate(lastDayOfNextMonth);
  }

  return { start: fmtDate(periodStart), end: fmtDate(periodEnd) };
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
