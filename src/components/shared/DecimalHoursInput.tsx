import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DecimalHoursInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputMode?: 'decimal' | 'numeric';
}

/**
 * A text input that allows typing decimal hours (e.g. 0.3, 1.5).
 * Stores raw string while focused, converts to number on blur.
 * Works on desktop + iPhone Safari.
 */
export function DecimalHoursInput({
  value,
  onChange,
  placeholder = '0.0',
  disabled = false,
  className,
}: DecimalHoursInputProps) {
  const [rawValue, setRawValue] = useState<string>(value ? String(value) : '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes when not focused
  useEffect(() => {
    if (!isFocused) {
      setRawValue(value ? String(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    // Replace ALL commas and locale decimal separators with dot
    v = v.replace(/[,،٫⎖]/g, '.');
    // Allow only digits and one dot
    v = v.replace(/[^0-9.]/g, '');
    // Prevent multiple dots
    const parts = v.split('.');
    if (parts.length > 2) {
      v = parts[0] + '.' + parts.slice(1).join('');
    }
    setRawValue(v);

    // Also update parent with current parsed value for live totals
    const parsed = parseFloat(v);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else if (v === '' || v === '.') {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = rawValue.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
      setRawValue(String(parsed));
    } else {
      onChange(0);
      setRawValue('');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Select all on focus for easy replacement
    setTimeout(() => inputRef.current?.select(), 0);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      autoComplete="off"
      autoCorrect="off"
      value={rawValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(className)}
    />
  );
}
