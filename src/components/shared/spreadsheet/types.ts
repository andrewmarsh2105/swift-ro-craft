export type ColumnId =
  | 'roNumber' | 'date' | 'advisor' | 'customer' | 'vehicle'
  | 'lineNo' | 'description' | 'hours' | 'type' | 'roTotal'
  | 'tbd' | 'notes' | 'mileage' | 'vin';

export type ViewMode = 'payroll' | 'audit';
export type Density = 'compact' | 'comfortable';

export interface ColumnDef {
  id: ColumnId;
  label: string;
  minWidth: number;
  align: 'left' | 'center' | 'right';
  /** Column value is the same for every line in an RO → rendered with rowSpan */
  isRoLevel: boolean;
  /** Allow text wrapping */
  wrap?: boolean;
}

export const ALL_COLUMNS: ColumnDef[] = [
  { id: 'roNumber', label: 'RO #', minWidth: 80, align: 'left', isRoLevel: true },
  { id: 'date', label: 'Date', minWidth: 90, align: 'left', isRoLevel: true },
  { id: 'advisor', label: 'Advisor', minWidth: 110, align: 'left', isRoLevel: true },
  { id: 'customer', label: 'Customer', minWidth: 120, align: 'left', isRoLevel: true },
  { id: 'vehicle', label: 'Vehicle', minWidth: 120, align: 'left', isRoLevel: true },
  { id: 'lineNo', label: 'Line', minWidth: 44, align: 'center', isRoLevel: false },
  { id: 'description', label: 'Work Performed', minWidth: 160, align: 'left', isRoLevel: false, wrap: true },
  { id: 'hours', label: 'Hours', minWidth: 62, align: 'right', isRoLevel: false },
  { id: 'type', label: 'Type', minWidth: 50, align: 'center', isRoLevel: false },
  { id: 'roTotal', label: 'RO Total', minWidth: 76, align: 'right', isRoLevel: true },
  { id: 'tbd', label: 'TBD', minWidth: 44, align: 'center', isRoLevel: false },
  { id: 'notes', label: 'Notes', minWidth: 120, align: 'left', isRoLevel: true, wrap: true },
  { id: 'mileage', label: 'Mileage', minWidth: 68, align: 'right', isRoLevel: true },
  { id: 'vin', label: 'VIN', minWidth: 140, align: 'left', isRoLevel: true },
];

export const PAYROLL_COLUMNS: ColumnId[] = [
  'roNumber', 'date', 'advisor', 'customer', 'vehicle', 'description', 'hours', 'type', 'roTotal',
];

export const AUDIT_COLUMNS: ColumnId[] = [
  'roNumber', 'date', 'advisor', 'customer', 'vehicle', 'lineNo', 'description', 'hours', 'type', 'roTotal', 'tbd', 'notes', 'mileage', 'vin',
];

export function getColumnDef(id: ColumnId): ColumnDef {
  return ALL_COLUMNS.find(c => c.id === id)!;
}

export function getColumnsForMode(mode: ViewMode, customIds?: ColumnId[]): ColumnDef[] {
  const ids = customIds ?? (mode === 'payroll' ? PAYROLL_COLUMNS : AUDIT_COLUMNS);
  return ids.map(id => getColumnDef(id)).filter(Boolean);
}
