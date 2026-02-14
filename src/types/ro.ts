export type LaborType = 'warranty' | 'customer-pay' | 'internal';

export interface VehicleInfo {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
}

export interface ROLine {
  id: string;
  lineNo: number;
  description: string;
  hoursPaid: number;
  isTbd?: boolean;
  laborType?: LaborType;
  matchedReferenceId?: string;
  vehicleOverride?: boolean;
  lineVehicle?: VehicleInfo;
  createdAt: string;
  updatedAt: string;
}

export interface RepairOrder {
  id: string;
  roNumber: string;
  date: string;
  advisor: string;
  customerName?: string;
  vehicle?: VehicleInfo;
  mileage?: string;
  paidHours: number;
  laborType: LaborType;
  workPerformed: string;
  notes?: string;
  photos?: string[];
  lines: ROLine[];
  isSimpleMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Preset {
  id: string;
  name: string;
  laborType: LaborType;
  defaultHours?: number;
  workTemplate?: string;
}

export interface DaySummary {
  date: string;
  totalHours: number;
  roCount: number;
  warrantyHours: number;
  customerPayHours: number;
  internalHours: number;
}

export interface AdvisorSummary {
  advisor: string;
  totalHours: number;
  roCount: number;
}

export interface Advisor {
  id: string;
  name: string;
}

export interface Settings {
  recentAdvisors: string[];
  advisors: Advisor[];
  presets: Preset[];
  showDarkMode: boolean;
}

/** Format vehicle info as a compact chip label, e.g. "'25 Altima" */
export function formatVehicleChip(v?: VehicleInfo): string | null {
  if (!v || (!v.year && !v.make && !v.model)) return null;
  const yr = v.year ? `'${String(v.year).slice(-2)}` : '';
  const parts = [yr, v.make, v.model].filter(Boolean);
  return parts.join(' ') || null;
}
