import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  quickIncrements?: number[];
  label?: string;
  className?: string;
}

export function NumericInput({
  value,
  onChange,
  min = 0,
  max = 99.9,
  step = 0.1,
  quickIncrements = [0.1, 0.2, 0.5],
  label,
  className,
}: NumericInputProps) {
  const handleIncrement = (amount: number) => {
    const newValue = Math.min(max, Math.round((value + amount) * 10) / 10);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, Math.round((value - step) * 10) / 10);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    const newValue = parseFloat(raw) || 0;
    if (newValue >= min && newValue <= max) {
      onChange(Math.round(newValue * 10) / 10);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="block text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      
      {/* Main input with +/- buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center tap-target touch-feedback disabled:opacity-40"
        >
          <Minus className="h-5 w-5" />
        </button>
        
        <input
          type="text"
          inputMode="decimal"
          value={value.toFixed(1)}
          onChange={handleInputChange}
          className="numeric-input w-24"
        />
        
        <button
          type="button"
          onClick={() => handleIncrement(step)}
          disabled={value >= max}
          className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center tap-target touch-feedback disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Quick increment buttons */}
      <div className="flex justify-center gap-2">
        {quickIncrements.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleIncrement(amount)}
            disabled={value + amount > max}
            className="increment-btn disabled:opacity-40"
          >
            +{amount}
          </button>
        ))}
      </div>
    </div>
  );
}
