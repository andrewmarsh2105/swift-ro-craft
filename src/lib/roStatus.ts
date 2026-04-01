/**
 * src/lib/roStatus.ts
 *
 * Industrial status indicators for list/detail views.
 */
import type { RepairOrder } from "@/types/ro";
import { hasPaidDate } from '@/lib/paidDate';

export function getPaidLabel(ro: RepairOrder): "Paid" | "Open" {
  return hasPaidDate(ro) ? "Paid" : "Open";
}

export function getStatusSummary(ro: RepairOrder, flagsCount: number, checksCount: number) {
  const paid = getPaidLabel(ro);

  return {
    paid,
    flags: flagsCount,
    checks: checksCount,
    summary: [
      paid,
      flagsCount ? `${flagsCount} Flag` : null,
      checksCount ? `${checksCount} Check` : null,
    ].filter(Boolean).join(" • "),
  };
}
