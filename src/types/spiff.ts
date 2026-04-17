export type SpiffScheduleType = 'forever' | 'weekly';

export interface SpiffRule {
  id: string;
  name: string;
  matchText: string;
  unitPay: number;
  scheduleType: SpiffScheduleType;
  activeFrom?: string;
  activeTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpiffManualEntry {
  id: string;
  date: string;
  ruleId?: string;
  label: string;
  quantity: number;
  unitPay?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpiffRuleSummary {
  ruleId: string;
  ruleName: string;
  unitPay: number;
  autoCount: number;
  manualCount: number;
  totalCount: number;
  totalPay: number;
}

export interface SpiffReport {
  totalAutoCount: number;
  totalManualCount: number;
  totalCount: number;
  totalPay: number;
  manualOnlyPay: number;
  byRule: SpiffRuleSummary[];
  uncategorizedManual: SpiffManualEntry[];
}
