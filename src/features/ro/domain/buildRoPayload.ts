import type { RepairOrder } from "@/types/ro";

export type ReturnTypeUseAddROFormState = {
  roNumber: string;
  date: string;
  advisor: string;
  customerName: string;
  mileage: string;
  notes: string;
  vehicle?: RepairOrder["vehicle"];
  laborType: RepairOrder["laborType"];
  lines: RepairOrder["lines"];
};

export function buildRoPayload(
  form: ReturnTypeUseAddROFormState,
): Omit<RepairOrder, "id" | "createdAt" | "updatedAt"> {
  return {
    roNumber: form.roNumber,
    date: form.date,
    advisor: form.advisor,
    customerName: form.customerName || undefined,
    mileage: form.mileage || undefined,
    notes: form.notes || undefined,
    vehicle: form.vehicle,
    laborType: form.laborType,
    lines: form.lines.map((l, idx) => ({ ...l, lineNo: idx + 1 })),
    paidDate: undefined,
    paidHours: 0,
    workPerformed: "",
    isSimpleMode: form.lines.length === 0,
    photos: [],
  };
}
