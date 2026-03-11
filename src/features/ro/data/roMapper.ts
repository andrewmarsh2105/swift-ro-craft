import type { Database } from "@/integrations/supabase/types";
import type { LaborType, RepairOrder, VehicleInfo } from "@/types/ro";
import { normalizeAdvisorName } from "@/lib/nameUtils";

export type RoRow = Database["public"]["Tables"]["ros"]["Row"];
export type RoInsert = Database["public"]["Tables"]["ros"]["Insert"];
export type RoUpdate = Database["public"]["Tables"]["ros"]["Update"];

export type RoLineRow = Database["public"]["Tables"]["ro_lines"]["Row"];
export type RoLineInsert = Database["public"]["Tables"]["ro_lines"]["Insert"];

type LaborTypeDb = Database["public"]["Enums"]["labor_type"];
type RoStatusDb = Database["public"]["Enums"]["ro_status"];

function toVehicleInfo(params: {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  vin?: string | null;
}): VehicleInfo | undefined {
  const { year, make, model, trim, vin } = params;

  if (!year && !make && !model && !vin) return undefined;

  return {
    year: year ?? undefined,
    make: make ?? undefined,
    model: model ?? undefined,
    trim: trim ?? undefined,
    vin: vin ?? undefined,
  };
}

export function deriveLaborType(lines: RoLineRow[]): LaborType {
  if (!lines.length) return "customer-pay";

  const counts: Record<LaborType, number> = {
    warranty: 0,
    "customer-pay": 0,
    internal: 0,
  };

  for (const line of lines) {
    const t = (line.labor_type ?? "customer-pay") as LaborType;
    counts[t] = (counts[t] ?? 0) + 1;
  }

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "customer-pay") as LaborType;
}

export function dbToRepairOrder(row: RoRow, lines: RoLineRow[]): RepairOrder {
  const vehicle = toVehicleInfo({
    year: row.vehicle_year,
    make: row.vehicle_make,
    model: row.vehicle_model,
    trim: row.vehicle_trim,
    vin: row.vehicle_vin,
  });

  return {
    id: row.id,
    roNumber: row.ro_number,
    date: row.date,
    paidDate: row.paid_date ?? undefined,
    advisor: normalizeAdvisorName(row.advisor_name),
    customerName: row.customer_name ?? undefined,
    mileage: row.mileage ?? undefined,
    vehicle,
    paidHours: lines
      .filter((l) => !l.is_tbd)
      .reduce((s, l) => s + Number(l.hours_paid), 0),
    laborType: deriveLaborType(lines),
    workPerformed: lines.map((l) => l.description).filter(Boolean).join("\n"),
    notes: row.notes ?? undefined,
    lines: lines.map((l) => ({
      id: l.id,
      lineNo: l.line_no,
      description: l.description,
      hoursPaid: Number(l.hours_paid),
      isTbd: !!l.is_tbd,
      laborType: l.labor_type as unknown as LaborType,
      matchedReferenceId: l.matched_reference_id ?? undefined,
      vehicleOverride: !!l.vehicle_override,
      lineVehicle: l.vehicle_override
        ? toVehicleInfo({
            year: l.line_vehicle_year,
            make: l.line_vehicle_make,
            model: l.line_vehicle_model,
            trim: l.line_vehicle_trim,
          })
        : undefined,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    })),
    isSimpleMode: lines.length === 0,
    photos: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function groupLinesByRoId(lines: RoLineRow[]): Map<string, RoLineRow[]> {
  const map = new Map<string, RoLineRow[]>();
  for (const l of lines) {
    const arr = map.get(l.ro_id) ?? [];
    arr.push(l);
    map.set(l.ro_id, arr);
  }
  return map;
}

export function toRosInsert(
  userId: string,
  ro: {
    roNumber: string;
    date: string;
    advisor: string;
    customerName?: string;
    mileage?: string;
    notes?: string;
    paidDate?: string;
    vehicle?: VehicleInfo;
  }
): RoInsert {
  const payload: RoInsert = {
    user_id: userId,
    ro_number: ro.roNumber,
    date: ro.date,
    advisor_name: normalizeAdvisorName(ro.advisor),
    customer_name: ro.customerName ?? null,
    mileage: ro.mileage ?? null,
    notes: ro.notes ?? null,
    status: "draft" as RoStatusDb,
    vehicle_year: ro.vehicle?.year ?? null,
    vehicle_make: ro.vehicle?.make ?? null,
    vehicle_model: ro.vehicle?.model ?? null,
    vehicle_trim: ro.vehicle?.trim ?? null,
    vehicle_vin: ro.vehicle?.vin ?? null,
    paid_date: ro.paidDate ?? null,
  };

  return payload;
}

export function toRosUpdate(updates: Partial<RepairOrder>): RoUpdate {
  const payload: RoUpdate = {};

  if (updates.roNumber !== undefined) payload.ro_number = updates.roNumber;
  if (updates.date !== undefined) payload.date = updates.date;
  if (updates.advisor !== undefined) payload.advisor_name = normalizeAdvisorName(updates.advisor);
  if (updates.customerName !== undefined)
    payload.customer_name = updates.customerName ?? null;
  if (updates.mileage !== undefined) payload.mileage = updates.mileage ?? null;
  if (updates.notes !== undefined) payload.notes = updates.notes ?? null;
  if (updates.paidDate !== undefined)
    payload.paid_date = updates.paidDate || null;

  if (updates.vehicle !== undefined) {
    payload.vehicle_year = updates.vehicle?.year ?? null;
    payload.vehicle_make = updates.vehicle?.make ?? null;
    payload.vehicle_model = updates.vehicle?.model ?? null;
    payload.vehicle_trim = updates.vehicle?.trim ?? null;
    payload.vehicle_vin = updates.vehicle?.vin ?? null;
  }

  return payload;
}

export function toRoLineInserts(params: {
  userId: string;
  roId: string;
  lines: Array<{
    description: string;
    laborType?: LaborType;
    hoursPaid: number;
    isTbd?: boolean;
    matchedReferenceId?: string;
    vehicleOverride?: boolean;
    lineVehicle?: VehicleInfo;
  }>;
  fallbackLaborType: LaborType;
}): RoLineInsert[] {
  const { userId, roId, lines, fallbackLaborType } = params;

  return lines.map((l, i) => ({
    ro_id: roId,
    user_id: userId,
    line_no: i + 1,
    description: l.description,
    labor_type: (l.laborType ?? fallbackLaborType) as unknown as LaborTypeDb,
    hours_paid: l.hoursPaid,
    is_tbd: !!l.isTbd,
    matched_reference_id: l.matchedReferenceId ?? null,
    vehicle_override: !!l.vehicleOverride,
    line_vehicle_year: l.lineVehicle?.year ?? null,
    line_vehicle_make: l.lineVehicle?.make ?? null,
    line_vehicle_model: l.lineVehicle?.model ?? null,
    line_vehicle_trim: l.lineVehicle?.trim ?? null,
  }));
}
