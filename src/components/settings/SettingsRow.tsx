import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsRowProps {
  label: string;
  description?: string;
  /** Muted text shown to the left of the chevron (navigation rows only) */
  currentValue?: string;
  /** @deprecated use currentValue instead */
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  disabled?: boolean;
}

export function SettingsRow({ label, description, currentValue, value, onClick, toggle, toggleValue, onToggle, disabled }: SettingsRowProps) {
  const displayValue = currentValue ?? value;
  return (
    <button
      onClick={toggle ? () => !disabled && onToggle?.(!toggleValue) : onClick}
      disabled={disabled && !toggle}
      className={cn(
        'w-full px-4 py-3.5 flex items-center justify-between gap-4 tap-target touch-feedback hover:bg-accent/40 quiet-transition',
        disabled && 'opacity-50'
      )}
    >
      <div className="text-left flex-1 min-w-0">
        <span className="font-medium text-foreground">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      {toggle ? (
        <div
          className={cn(
            'w-12 h-7 rounded-full relative transition-colors flex-shrink-0 border border-border/70',
            toggleValue ? 'bg-primary shadow-[var(--shadow-soft)]' : 'bg-muted/80'
          )}
        >
          <div
            className={cn(
              'absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform',
              toggleValue ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
          {displayValue && <span className="text-sm">{displayValue}</span>}
          <ChevronRight className="h-5 w-5" />
        </div>
      )}
    </button>
  );
}
