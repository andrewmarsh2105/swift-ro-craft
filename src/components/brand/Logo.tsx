/**
 * Logo — RO Navigator brand wordmark
 *
 * Uses the official wordmark image asset for all variants.
 * The `scheme` prop controls color treatment:
 *   - light/auto: dark text (native image)
 *   - dark: inverted to white via CSS filter
 *
 * Size controls the rendered height of the wordmark.
 */

import { cn } from '@/lib/utils';
import wordmarkSrc from '@/assets/ro-navigator-wordmark.jpeg';

type LogoVariant = 'full' | 'monogram' | 'mark' | 'wordmark';
type LogoScheme  = 'light' | 'dark' | 'amber' | 'auto';

interface LogoProps {
  variant?: LogoVariant;
  scheme?: LogoScheme;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const HEIGHT_MAP = {
  xs: 16,
  sm: 20,
  md: 26,
  lg: 34,
  xl: 44,
} as const;

export function Logo({
  variant: _variant = 'full',
  scheme = 'light',
  size = 'md',
  className,
}: LogoProps) {
  const h = HEIGHT_MAP[size];
  const isDark = scheme === 'dark';
  // For 'auto' scheme, use CSS class to invert in dark mode
  const isAuto = scheme === 'auto';

  return (
    <span
      className={cn('inline-flex items-center select-none', className)}
      aria-label="RO Navigator"
    >
      <img
        src={wordmarkSrc}
        alt="RO Navigator"
        height={h}
        className={cn(
          'object-contain',
          isDark && 'brightness-0 invert',
          isAuto && 'dark:brightness-0 dark:invert',
        )}
        style={{
          height: h,
          width: 'auto',
        }}
        draggable={false}
      />
    </span>
  );
}
