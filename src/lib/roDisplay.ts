/**
 * src/lib/roDisplay.ts
 *
 * Shared display helpers for RO list/detail screens (keeps UI consistent).
 */
import type { ROLine, RepairOrder } from "@/types/ro";

export function effectiveDate(ro: RepairOrder): string {
  return ro.paidDate || ro.date;
}

export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function vehicleLabel(ro: RepairOrder): string {
  const v = ro.vehicle;
  if (!v) return "—";
  const parts = [v.year?.toString(), v.make, v.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

/** Sum paid hours across all lines. */
export function calcLineHours(lines: ROLine[]): number {
  return lines.reduce((s, l) => s + (l.hoursPaid || 0), 0);
}

export function calcHours(ro: RepairOrder): number {
  if (ro.lines?.length) {
    return calcLineHours(ro.lines);
  }
  return ro.paidHours || 0;
}
