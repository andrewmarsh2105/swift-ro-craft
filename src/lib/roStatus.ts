/**
 * src/lib/roStatus.ts
 *
 * Industrial status indicators for list/detail views.
 */
import type { RepairOrder } from "@/types/ro";

export function getTbdCount(ro: RepairOrder): number {
  return (ro.lines || []).filter((l) => !!l.isTbd).length;
}

export function getPaidLabel(ro: RepairOrder): "Paid" | "Unpaid" {
  return ro.paidDate ? "Paid" : "Unpaid";
}

export function getStatusSummary(ro: RepairOrder, flagsCount: number, checksCount: number) {
  const tbd = getTbdCount(ro);
  const paid = getPaidLabel(ro);

  return {
    paid,
    tbd,
    flags: flagsCount,
    checks: checksCount,
    summary: [
      paid,
      tbd ? `${tbd} TBD` : null,
      flagsCount ? `${flagsCount} Flag` : null,
      checksCount ? `${checksCount} Check` : null,
    ].filter(Boolean).join(" • "),
  };
}
