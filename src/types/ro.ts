export type LaborType = 'warranty' | 'customer-pay' | 'internal';

export interface ROLine {
  id: string;
  lineNo: number;
  description: string;
  hoursPaid: number;
  laborType?: LaborType;
  matchedReferenceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepairOrder {
  id: string;
  roNumber: string;
  date: string;
  advisor: string;
  paidHours: number; // Computed from lines or direct entry in simple mode
  laborType: LaborType; // Default labor type for simple mode
  workPerformed: string;
  notes?: string;
  photos?: string[];
  lines: ROLine[]; // Line items for detailed entry
  isSimpleMode: boolean; // true = single total hours, false = line items
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
  defaultAdvisor?: string;
  recentAdvisors: string[];
  advisors: Advisor[];
  presets: Preset[];
  showDarkMode: boolean;
}
