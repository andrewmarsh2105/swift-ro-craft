import type { LaborType } from '@/types/ro';

/** Canonical labor type definitions — single source of truth */
export const LABOR_TYPES: { value: LaborType; label: string; short: string; fullLabel: string }[] = [
  { value: 'warranty', label: 'Warranty', short: 'W', fullLabel: 'Warranty' },
  { value: 'customer-pay', label: 'Customer Pay', short: 'CP', fullLabel: 'Customer Pay' },
  { value: 'internal', label: 'Internal', short: 'INT', fullLabel: 'Internal' },
];

/** Valid labor type values for runtime validation */
export const VALID_LABOR_TYPES: LaborType[] = ['warranty', 'customer-pay', 'internal'];

/** HSL CSS variable for a labor type's accent color */
export function laborColor(type: LaborType | string): string {
  switch (type) {
    case 'warranty':
      return 'hsl(var(--status-warranty))';
    case 'customer-pay':
      return 'hsl(var(--status-customer-pay))';
    default:
      return 'hsl(var(--status-internal))';
  }
}

/** HSL CSS variable for a labor type's background color */
export function laborBgColor(type: LaborType | string): string {
  switch (type) {
    case 'warranty':
      return 'hsl(var(--status-warranty-bg))';
    case 'customer-pay':
      return 'hsl(var(--status-customer-pay-bg))';
    default:
      return 'hsl(var(--status-internal-bg))';
  }
}

/** Tailwind border-l color class for left-accent bars */
export function laborBorderClass(type: LaborType | string): string {
  switch (type) {
    case 'warranty':
      return 'border-l-[hsl(var(--status-warranty))]';
    case 'customer-pay':
      return 'border-l-[hsl(var(--status-customer-pay))]';
    default:
      return 'border-l-[hsl(var(--status-internal))]';
  }
}

/** Tailwind text color class */
export function laborTextClass(type: LaborType | string): string {
  switch (type) {
    case 'warranty':
      return 'text-[hsl(var(--status-warranty))]';
    case 'customer-pay':
      return 'text-[hsl(var(--status-customer-pay))]';
    default:
      return 'text-[hsl(var(--status-internal))]';
  }
}

/** CSS class for the status pill (defined in index.css) */
export function laborPillClass(type: LaborType | string): string {
  switch (type) {
    case 'warranty':
      return 'status-pill-warranty';
    case 'customer-pay':
      return 'status-pill-customer-pay';
    default:
      return 'status-pill-internal';
  }
}

/** Short abbreviation for compact displays */
export function laborAbbr(type: LaborType | string): string {
  switch (type) {
    case 'warranty':
      return 'W';
    case 'customer-pay':
      return 'CP';
    default:
      return 'INT';
  }
}

/** Labor dot CSS class for small color indicators */
export function laborDotClass(type: LaborType | string): string {
  switch (type) {
    case 'warranty':
      return 'labor-dot-warranty';
    case 'customer-pay':
      return 'labor-dot-customer-pay';
    default:
      return 'labor-dot-internal';
  }
}
