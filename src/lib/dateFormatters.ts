/**
 * Centralized date formatting utilities.
 * All date display logic should use these instead of inline toLocaleDateString calls.
 */

const EN_US = 'en-US';

/** "Apr 5" — compact date for lists, charts, badges */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(EN_US, { month: 'short', day: 'numeric' });
}

/** "04/05" — numeric date for compact metadata displays */
export function formatNumericDate(date: Date): string {
  return date.toLocaleDateString(EN_US, { month: '2-digit', day: '2-digit' });
}

/** "Apr 5, 2025" — full date for headers, exports */
export function formatMediumDate(date: Date): string {
  return date.toLocaleDateString(EN_US, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Apr 5, 3:42 PM" — date + time for timestamps */
export function formatDateTime(date: Date): string {
  return date.toLocaleDateString(EN_US, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Saturday, April 5, 2025" — long form for print headers */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(EN_US, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Parse a YYYY-MM-DD string to a Date at noon (avoids timezone drift) */
export function parseDateStr(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

/** Format a YYYY-MM-DD range as "Apr 5 – Apr 11" */
export function formatDateRange(startStr: string, endStr: string): string {
  const s = parseDateStr(startStr);
  const e = parseDateStr(endStr);
  if (startStr === endStr) return formatMediumDate(s);
  return `${formatShortDate(s)} – ${formatShortDate(e)}`;
}
