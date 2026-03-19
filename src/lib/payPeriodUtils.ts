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

  const sorted = [...new Set(endDates)].sort((a, b) => a - b);
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const ref = atStartOfDay(referenceDate);

  const periods: Array<{ start: Date; end: Date }> = [];

  // Periods that end in current month.
  for (let i = 0; i < sorted.length; i++) {
    const endDay = sorted[i];
    const prevEndDay = i === 0 ? sorted[sorted.length - 1] : sorted[i - 1];

    const end = dateWithClampedDay(year, month, endDay);
    const prevEnd = i === 0
      ? dateWithClampedDay(year, month - 1, prevEndDay)
      : dateWithClampedDay(year, month, prevEndDay);
    const start = addDays(prevEnd, 1);

    periods.push({ start, end });
  }

  // Wrap period that starts after this month's last end date and ends on next month's first end date.
  const lastEnd = dateWithClampedDay(year, month, sorted[sorted.length - 1]);
  const wrapEnd = dateWithClampedDay(year, month + 1, sorted[0]);
  periods.push({ start: addDays(lastEnd, 1), end: wrapEnd });

  for (const period of periods) {
    if (ref >= period.start && ref <= period.end) {
      return { start: fmtDate(period.start), end: fmtDate(period.end) };
    }
  }

  // Defensive fallback for malformed end-date lists.
  return { start: fmtDate(periods[0].start), end: fmtDate(periods[0].end) };
}

function dateWithClampedDay(year: number, month: number, day: number): Date {
  const d = new Date(year, month, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth(), Math.min(Math.max(day, 1), last));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return atStartOfDay(d);
}

function atStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
