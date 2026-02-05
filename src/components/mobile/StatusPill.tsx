import { cn } from '@/lib/utils';
import type { LaborType } from '@/types/ro';

interface StatusPillProps {
  type: LaborType;
  hours?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const typeLabels: Record<LaborType, string> = {
  'warranty': 'W',
  'customer-pay': 'CP',
  'internal': 'Int',
};

const fullLabels: Record<LaborType, string> = {
  'warranty': 'Warranty',
  'customer-pay': 'Customer Pay',
  'internal': 'Internal',
};

export function StatusPill({ 
  type, 
  hours, 
  showLabel = false,
  size = 'md',
  className 
}: StatusPillProps) {
  const pillClass = {
    'warranty': 'status-pill-warranty',
    'customer-pay': 'status-pill-customer-pay',
    'internal': 'status-pill-internal',
  }[type];

  return (
    <span className={cn(
      pillClass,
      size === 'sm' && 'text-[10px] px-2 py-0.5',
      size === 'lg' && 'text-sm px-3 py-1.5',
      className
    )}>
      {showLabel ? fullLabels[type] : typeLabels[type]}
      {hours !== undefined && `: ${hours.toFixed(1)}h`}
    </span>
  );
}
