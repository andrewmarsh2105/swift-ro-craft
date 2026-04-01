/**
 * Shared date range filtering logic used by ROListPanel + SpreadsheetView.
 */
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';
import { getEffectivePayPeriodType, type PayPeriodSettingsLike } from '@/lib/payPeriodRange';
import type { RepairOrder } from '@/types/ro';
import { hasPaidDate, normalizePaidDate } from '@/lib/paidDate';

export type DateFilterKey = 'all' | 'today' | 'last_week' | 'week' | 'month' | 'pay_period' | 'last_pay_period' | 'custom';

export interface DateRangeBounds {
  start: string;
  end: string;
  label: string;
}

function toDayKey(dateStr: string): number {
  const m = dateStr?.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return NaN;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtRangeLabel(start: string, end: string): string {
  try {
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const sf = format(new Date(sy, sm - 1, sd), 'MMM d');
    const ef = format(new Date(ey, em - 1, ed), 'MMM d');
    return `${sf} – ${ef}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function fmtShort(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return format(new Date(y, m - 1, d), 'MMM d');
  } catch {
    return dateStr;
  }
}

export function boundsRangeLabel(bounds: DateRangeBounds | null): string {
  if (!bounds) return 'All dates';
  if (bounds.start === bounds.end) return fmtShort(bounds.start);
  return fmtRangeLabel(bounds.start, bounds.end);
}

function getWeekEndDate(reference: Date, weekStartDay: number): Date {
  const diff = (reference.getDay() - weekStartDay + 7) % 7;
  const end = new Date(reference);
  end.setDate(reference.getDate() - diff + 6);
  return end;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getAlignedWeeklyRange(reference: Date, weekStartDay: number, lengthDays: number, periodsBack = 0): { start: string; end: string } {
  const currentEnd = getWeekEndDate(reference, weekStartDay);
  const currentStart = addDays(currentEnd, -(lengthDays - 1));
  const shift = periodsBack * lengthDays;
  const start = addDays(currentStart, -shift);
  const end = addDays(currentEnd, -shift);
  return { start: localDateStr(start), end: localDateStr(end) };
}

function getCurrentCustomRange(payPeriodEndDates: number[], reference: Date): { start: string; end: string } {
  return getCustomPayPeriodRange(payPeriodEndDates, reference);
}

function getPreviousCustomRange(payPeriodEndDates: number[], reference: Date): { start: string; end: string } {
  const current = getCurrentCustomRange(payPeriodEndDates, reference);
  const [y, m, d] = current.start.split('-').map(Number);
  const dayBefore = new Date(y, (m || 1) - 1, (d || 1) - 1, 12, 0, 0);
  return getCustomPayPeriodRange(payPeriodEndDates, dayBefore);
}

export interface ComputeDateRangeOpts extends PayPeriodSettingsLike {
  filter: DateFilterKey;
  weekStartDay: number;
  hasCustomPayPeriod: boolean;
  customStart?: string;
  customEnd?: string;
}

export function computeDateRangeBounds(opts: ComputeDateRangeOpts): DateRangeBounds | null {
  const {
    filter,
    weekStartDay,
    payPeriodType,
    payPeriodEndDates,
    defaultSummaryRange,
    hasCustomPayPeriod,
    customStart,
    customEnd,
  } = opts;

  if (filter === 'all') return null;

  const now = new Date();
  const today = localDateStr(now);

  if (filter === 'today') {
    return { start: today, end: today, label: 'Today' };
  }

  const effectiveType = getEffectivePayPeriodType({ payPeriodType, payPeriodEndDates, defaultSummaryRange });

  if (filter === 'week') {
    const range = getAlignedWeeklyRange(now, weekStartDay, effectiveType === 'two_weeks' ? 14 : 7, 0);
    return { ...range, label: fmtRangeLabel(range.start, range.end) };
  }

  if (filter === 'last_week') {
    const range = getAlignedWeeklyRange(now, weekStartDay, effectiveType === 'two_weeks' ? 14 : 7, 1);
    return { ...range, label: fmtRangeLabel(range.start, range.end) };
  }

  if (filter === 'month') {
    const start = localDateStr(startOfMonth(now));
    const end = localDateStr(endOfMonth(now));
    return { start, end, label: fmtRangeLabel(start, end) };
  }

  if (filter === 'pay_period' && hasCustomPayPeriod && payPeriodEndDates?.length) {
    const { start, end } = getCurrentCustomRange(payPeriodEndDates, now);
    return { start, end, label: fmtRangeLabel(start, end) };
  }

  if (filter === 'last_pay_period' && hasCustomPayPeriod && payPeriodEndDates?.length) {
    const { start, end } = getPreviousCustomRange(payPeriodEndDates, now);
    return { start, end, label: fmtRangeLabel(start, end) };
  }

  if (filter === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd, label: fmtRangeLabel(customStart, customEnd) };
  }

  return null;
}

export function effectiveDate(ro: RepairOrder): string {
  return normalizePaidDate(ro.paidDate) ?? ro.date;
}

export function filterROsByDateRange(ros: RepairOrder[], bounds: DateRangeBounds | null): RepairOrder[] {
  if (!bounds) return ros;
  const { start, end } = bounds;
  const startKey = toDayKey(start);
  const endKey = toDayKey(end);
  if (isNaN(startKey) || isNaN(endKey)) return ros;

  return ros.filter((ro) => {
    const dKey = toDayKey(effectiveDate(ro));
    return !isNaN(dKey) && dKey >= startKey && dKey <= endKey;
  });
}

export function isCarryoverRO(ro: RepairOrder, viewStart: string | null | undefined): boolean {
  if (hasPaidDate(ro)) return false;
  if (!viewStart) return false;
  return ro.date < viewStart;
}

export function filterROsByDateRangeWithCarryover(
  ros: RepairOrder[],
  bounds: DateRangeBounds | null,
): RepairOrder[] {
  if (!bounds) return ros;
  const { start, end } = bounds;
  const startKey = toDayKey(start);
  const endKey = toDayKey(end);
  if (isNaN(startKey) || isNaN(endKey)) return ros;

  return ros.filter((ro) => {
    const effKey = toDayKey(effectiveDate(ro));
    if (!isNaN(effKey) && effKey >= startKey && effKey <= endKey) return true;
    if (!hasPaidDate(ro)) {
      const roDateKey = toDayKey(ro.date);
      return !isNaN(roDateKey) && roDateKey < startKey;
    }
    return false;
  });
}
