import type { RepairOrder } from '@/types/ro';

export interface ROBackupLine {
  id: string;
  lineNo: number;
  description: string;
  laborType?: string;
  hoursPaid: number;
  matchedReferenceId?: string;
}

export interface ROBackupRecord {
  id: string;
  roNumber: string;
  date: string;
  advisor: string;
  customerName?: string;
  vehicle?: RepairOrder['vehicle'];
  mileage?: string;
  notes?: string;
  paidDate?: string;
  paidHours: number;
  laborType: RepairOrder['laborType'];
  workPerformed: string;
  isSimpleMode: boolean;
  createdAt: string;
  updatedAt: string;
  lines: ROBackupLine[];
}

export function buildROBackupData(ros: RepairOrder[]): ROBackupRecord[] {
  return ros.map((ro) => ({
    id: ro.id,
    roNumber: ro.roNumber,
    date: ro.date,
    advisor: ro.advisor,
    customerName: ro.customerName,
    vehicle: ro.vehicle,
    mileage: ro.mileage,
    notes: ro.notes,
    paidDate: ro.paidDate,
    paidHours: ro.paidHours,
    laborType: ro.laborType,
    workPerformed: ro.workPerformed,
    isSimpleMode: ro.isSimpleMode,
    createdAt: ro.createdAt,
    updatedAt: ro.updatedAt,
    lines: (ro.lines || []).map((line) => ({
      id: line.id,
      lineNo: line.lineNo,
      description: line.description,
      laborType: line.laborType,
      hoursPaid: line.hoursPaid,
      matchedReferenceId: line.matchedReferenceId,
    })),
  }));
}
