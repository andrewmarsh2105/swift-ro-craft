/**
 * Shared date range filtering logic used by ROListPanel + SpreadsheetView.
 */
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { getCustomPayPeriodRange } from "@/lib/payPeriodUtils";
import type { RepairOrder } from "@/types/ro";

export type DateFilterKey = "all" | "today" | "week" | "month" | "pay_period" | "custom";

export interface DateRangeBounds {
  start: string;
  end: string;
  label: string;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtRangeLabel(start: string, end: string): string {
  try {
    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    const sf = format(new Date(sy, sm - 1, sd), "MMM d");
    const ef = format(new Date(ey, em - 1, ed), "MMM d");
    return `${sf} – ${ef}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function fmtShort(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return format(new Date(y, m - 1, d), "MMM d");
  } catch {
    return dateStr;
  }
}

export function boundsRangeLabel(bounds: DateRangeBounds | null): string {
  if (!bounds) return "All dates";
  if (bounds.start === bounds.end) return fmtShort(bounds.start);
  return fmtRangeLabel(bounds.start, bounds.end);
}

function getWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  return localDateStr(start);
}

function getWeekEnd(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const end = new Date(now);
  end.setDate(now.getDate() - diff + 6);
  return localDateStr(end);
}

function getTwoWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff - 7);
  return localDateStr(start);
}

export interface ComputeDateRangeOpts {
  filter: DateFilterKey;
  weekStartDay: number;
  defaultSummaryRange?: string;
  payPeriodEndDates?: number[];
  hasCustomPayPeriod: boolean;
  customStart?: string;
  customEnd?: string;
}

export function computeDateRangeBounds(opts: ComputeDateRangeOpts): DateRangeBounds | null {
  const { filter, weekStartDay, defaultSummaryRange, payPeriodEndDates, hasCustomPayPeriod, customStart, customEnd } = opts;

  if (filter === "all") return null;

  const today = localDateStr(new Date());

  if (filter === "today") {
    return { start: today, end: today, label: "Today" };
  }

  if (filter === "week") {
    const useTwoWeeks = defaultSummaryRange === "two_weeks";
    const start = useTwoWeeks ? getTwoWeekStart(weekStartDay) : getWeekStart(weekStartDay);
    const end = getWeekEnd(weekStartDay);
    return { start, end, label: fmtRangeLabel(start, end) };
  }

  if (filter === "month") {
    const now = new Date();
    const start = localDateStr(startOfMonth(now));
    const end = localDateStr(endOfMonth(now));
    return { start, end, label: fmtRangeLabel(start, end) };
  }

  if (filter === "pay_period" && hasCustomPayPeriod && payPeriodEndDates?.length) {
    const { start, end } = getCustomPayPeriodRange(payPeriodEndDates, new Date());
    return { start, end, label: fmtRangeLabel(start, end) };
  }

  if (filter === "custom" && customStart && customEnd) {
    return { start: customStart, end: customEnd, label: fmtRangeLabel(customStart, customEnd) };
  }

  return null;
}

export function effectiveDate(ro: RepairOrder): string {
  return ro.paidDate || ro.date;
}

export function filterROsByDateRange(ros: RepairOrder[], bounds: DateRangeBounds | null): RepairOrder[] {
  if (!bounds) return ros;
  return ros.filter((ro) => {
    const d = effectiveDate(ro);
    return d >= bounds.start && d <= bounds.end;
  });
}
