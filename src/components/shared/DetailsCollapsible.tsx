import { ChevronDown, X, CalendarCheck } from 'lucide-react';
import { formatVehicleChip } from '@/types/ro';
import type { VehicleInfo } from '@/types/ro';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface DetailsCollapsibleProps {
  vehicle: VehicleInfo;
  onVehicleChange: (v: VehicleInfo) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  mileage: string;
  onMileageChange: (mileage: string) => void;
  paidDate?: string;
  onPaidDateChange?: (date: string) => void;
  laborType?: string;
  onLaborTypeChange?: (type: string) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout?: 'mobile' | 'desktop';
}

const LABOR_TYPE_OPTIONS = [
  { value: 'warranty', label: 'Warranty' },
  { value: 'customer-pay', label: 'Customer Pay' },
  { value: 'internal', label: 'Internal' },
];

export function DetailsCollapsible({
  vehicle,
  onVehicleChange,
  customerName,
  onCustomerNameChange,
  mileage,
  onMileageChange,
  paidDate,
  onPaidDateChange,
  laborType,
  onLaborTypeChange,
  notes,
  onNotesChange,
  open,
  onOpenChange,
  layout = 'mobile',
}: DetailsCollapsibleProps) {
  const vehicleChip = formatVehicleChip(vehicle);
  const isDesktop = layout === 'desktop';

  const paidDateChip = paidDate
    ? `Paid ${new Date(paidDate + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}`
    : null;

  const handleClearVehicle = () => {
    onVehicleChange({});
  };

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-2 text-xs hover:bg-muted/50 transition-colors',
            isDesktop ? 'px-4 py-1.5' : 'px-3 min-h-[44px]',
            'border-t border-border/50'
          )}
        >
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            Details
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </span>

          {/* Inline summaries when collapsed */}
          {!open && (
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              {laborType && onLaborTypeChange && (
                <>
                  <span className="text-foreground font-medium truncate">
                    {LABOR_TYPE_OPTIONS.find(t => t.value === laborType)?.label ?? laborType}
                  </span>
                  <span className="text-border">·</span>
                </>
              )}
              <span className={cn(
                'truncate',
                vehicleChip ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {vehicleChip ? `🚗 ${vehicleChip}` : '—'}
              </span>
              <span className="text-border">·</span>
              <span className={cn(
                'truncate',
                customerName ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {customerName || '—'}
              </span>
              {mileage && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-foreground truncate">{mileage} mi</span>
                </>
              )}
              {vehicle.vin && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-foreground truncate font-mono text-[10px]">VIN {vehicle.vin.slice(-6)}</span>
                </>
              )}
              {paidDateChip && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-primary truncate font-medium">{paidDateChip}</span>
                </>
              )}
            </div>
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div
          className={cn(
            'border-t border-border/50 bg-muted/20',
            isDesktop ? 'px-4 py-3' : 'px-3 py-2',
          )}
        >
          {isDesktop ? (
            /* Desktop: grid layout */
            <div className="space-y-2">
              {onPaidDateChange && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-16 flex-shrink-0">Paid Date</label>
                  <CalendarCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <input
                    type="date"
                    value={paidDate || ''}
                    onChange={(e) => onPaidDateChange(e.target.value)}
                    className="h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    title="Leave empty if paid same day as RO"
                  />
                  {paidDate && (
                    <button
                      onClick={() => onPaidDateChange('')}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                      title="Clear paid date"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!paidDate && (
                    <span className="text-xs text-muted-foreground italic">Paid on a different day?</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground w-16 flex-shrink-0">Customer</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => onCustomerNameChange(e.target.value)}
                  placeholder="Customer name (optional)"
                  className="flex-1 h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground w-16 flex-shrink-0">Vehicle</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={vehicle.year || ''}
                  onChange={(e) => {
                    const y = parseInt(e.target.value);
                    const maxYear = new Date().getFullYear() + 2;
                    onVehicleChange({ ...vehicle, year: (!y || y < 1900 || y > maxYear) ? undefined : y });
                  }}
                  placeholder="Year"
                  maxLength={4}
                  className="w-16 h-8 px-2 bg-muted rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={vehicle.make || ''}
                  onChange={(e) => onVehicleChange({ ...vehicle, make: e.target.value })}
                  placeholder="Make"
                  className="w-24 h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={vehicle.model || ''}
                  onChange={(e) => onVehicleChange({ ...vehicle, model: e.target.value })}
                  placeholder="Model"
                  className="w-24 h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {(vehicle.year || vehicle.make || vehicle.model) && (
                  <button
                    onClick={handleClearVehicle}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded transition-colors"
                    title="Clear vehicle"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground w-16 flex-shrink-0">VIN</label>
                <input
                  type="text"
                  value={vehicle.vin || ''}
                  onChange={(e) => onVehicleChange({ ...vehicle, vin: e.target.value.toUpperCase() })}
                  placeholder="VIN (optional)"
                  maxLength={17}
                  className="w-48 h-8 px-2 bg-muted rounded text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground w-16 flex-shrink-0">Mileage</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mileage}
                  onChange={(e) => onMileageChange(e.target.value.replace(/\D/g, ''))}
                  placeholder="Mileage (optional)"
                  className="w-28 h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ) : (
            /* Mobile: stacked layout */
            <div className="space-y-2">
              {/* Paid Date — top section, separated from vehicle/customer info */}
              {onPaidDateChange && (
                <div className="pb-2 mb-1 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Paid Date</span>
                    <CalendarCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <input
                      type="date"
                      value={paidDate || ''}
                      onChange={(e) => onPaidDateChange(e.target.value)}
                      className="flex-1 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {paidDate && (
                      <button
                        onClick={() => onPaidDateChange('')}
                        className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {!paidDate && (
                    <div className="pl-16 text-xs text-muted-foreground italic mt-1">Paid on a different day?</div>
                  )}
                </div>
              )}
              {onLaborTypeChange && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Labor Type</span>
                  <select
                    value={laborType || 'customer-pay'}
                    onChange={(e) => onLaborTypeChange(e.target.value)}
                    className="flex-1 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {LABOR_TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Customer</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => onCustomerNameChange(e.target.value)}
                  placeholder="Name (optional)"
                  className="flex-1 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Vehicle</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={vehicle.year || ''}
                  onChange={(e) => {
                    const y = parseInt(e.target.value);
                    const maxYear = new Date().getFullYear() + 2;
                    onVehicleChange({ ...vehicle, year: (!y || y < 1900 || y > maxYear) ? undefined : y });
                  }}
                  placeholder="Year"
                  maxLength={4}
                  className="w-14 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={vehicle.make || ''}
                  onChange={(e) => onVehicleChange({ ...vehicle, make: e.target.value })}
                  placeholder="Make"
                  className="flex-1 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={vehicle.model || ''}
                  onChange={(e) => onVehicleChange({ ...vehicle, model: e.target.value })}
                  placeholder="Model"
                  className="flex-1 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {(vehicle.year || vehicle.make || vehicle.model) && (
                <div className="flex justify-end pl-16">
                  <button
                    onClick={handleClearVehicle}
                    className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">VIN</span>
                <input
                  type="text"
                  value={vehicle.vin || ''}
                  onChange={(e) => onVehicleChange({ ...vehicle, vin: e.target.value.toUpperCase() })}
                  placeholder="VIN (optional)"
                  maxLength={17}
                  className="flex-1 h-8 px-2 bg-muted rounded text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Mileage</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mileage}
                  onChange={(e) => onMileageChange(e.target.value.replace(/\D/g, ''))}
                  placeholder="Optional"
                  className="w-24 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {onNotesChange !== undefined && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-16 pt-2">Notes</span>
                  <textarea
                    value={notes || ''}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    className="flex-1 p-2 bg-muted rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
