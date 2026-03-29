import type { LaborType, ROLine } from '@/types/ro';

export function createEmptyLine(lineNo: number, laborType: LaborType = 'customer-pay'): ROLine {
  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    lineNo,
    description: '',
    hoursPaid: 0,
    laborType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
