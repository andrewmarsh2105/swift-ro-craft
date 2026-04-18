import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsRowProps {
  label: string;
  description?: string;
  currentValue?: string;
  /** @deprecated use currentValue instead */
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function SettingsRow({ label, description, currentValue, value, onClick, toggle, toggleValue, onToggle, disabled, icon }: SettingsRowProps) {
  const displayValue = currentValue ?? value;
  return (
    <button
      onClick={toggle ? () => !disabled && onToggle?.(!toggleValue) : onClick}
      disabled={disabled && !toggle}
      className={cn(
        'w-full px-4 py-3 flex items-center gap-3 tap-target',
        'hover:bg-accent/55 active:bg-muted/40 transition-colors',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      {icon && (
        <span className="text-muted-foreground/70 flex-shrink-0">{icon}</span>
      )}
      <div className="text-left flex-1 min-w-0">
        <span className="text-[13px] font-medium text-foreground leading-tight">{label}</span>
        {description && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      {toggle ? (
        <div
          className={cn(
            'w-[42px] h-[26px] rounded-full relative transition-colors duration-200 flex-shrink-0',
            toggleValue ? 'bg-primary' : 'bg-muted-foreground/20'
          )}
        >
          <div
            className={cn(
              'absolute top-[3px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
              toggleValue ? 'translate-x-[19px]' : 'translate-x-[3px]'
            )}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-muted-foreground/60 flex-shrink-0">
          {displayValue && <span className="text-[12px]">{displayValue}</span>}
          <ChevronRight className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}
