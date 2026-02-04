export type LaborType = 'warranty' | 'customer-pay' | 'internal';

export interface RepairOrder {
  id: string;
  roNumber: string;
  date: string;
  advisor: string;
  paidHours: number;
  laborType: LaborType;
  workPerformed: string;
  notes?: string;
  photos?: string[];
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
