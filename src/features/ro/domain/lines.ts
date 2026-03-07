import type { ROLine } from "@/types/ro";

export function getLineTotals(lines: ROLine[]) {
  const paidHours = lines.filter((l) => !l.isTbd).reduce((s, l) => s + (l.hoursPaid || 0), 0);
  return { paidHours: Number(paidHours.toFixed(2)) };
}
