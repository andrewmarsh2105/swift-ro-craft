import { ChevronDown, X } from 'lucide-react';
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout?: 'mobile' | 'desktop';
}

export function DetailsCollapsible({
  vehicle,
  onVehicleChange,
  customerName,
  onCustomerNameChange,
  mileage,
  onMileageChange,
  open,
  onOpenChange,
  layout = 'mobile',
}: DetailsCollapsibleProps) {
  const vehicleChip = formatVehicleChip(vehicle);
  const isDesktop = layout === 'desktop';

  const handleClearVehicle = () => {
    onVehicleChange({});
  };

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-2 text-xs hover:bg-muted/50 transition-colors',
            isDesktop ? 'px-4 py-1.5' : 'px-3 py-1.5',
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
                  onChange={(e) => onVehicleChange({ ...vehicle, year: parseInt(e.target.value) || undefined })}
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
                <input
                  type="text"
                  value={vehicle.trim || ''}
                  onChange={(e) => onVehicleChange({ ...vehicle, trim: e.target.value })}
                  placeholder="Trim"
                  className="w-20 h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                <label className="text-xs text-muted-foreground w-16 flex-shrink-0">Mileage</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mileage}
                  onChange={(e) => onMileageChange(e.target.value)}
                  placeholder="Mileage (optional)"
                  className="w-28 h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ) : (
            /* Mobile: stacked layout */
            <div className="space-y-2">
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
                  onChange={(e) => onVehicleChange({ ...vehicle, year: parseInt(e.target.value) || undefined })}
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
                <div className="flex items-center gap-2 pl-16">
                  <input
                    type="text"
                    value={vehicle.trim || ''}
                    onChange={(e) => onVehicleChange({ ...vehicle, trim: e.target.value })}
                    placeholder="Trim (optional)"
                    className="flex-1 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleClearVehicle}
                    className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Mileage</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mileage}
                  onChange={(e) => onMileageChange(e.target.value)}
                  placeholder="Optional"
                  className="w-24 h-8 px-2 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
