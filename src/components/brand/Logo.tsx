/**
 * Logo — RO Navigator brand wordmark
 *
 * Uses the official transparent SVG logo asset for all variants.
 * The `scheme` prop controls color treatment:
 *   - light/auto: dark text (native image)
 *   - dark: inverted to white via CSS filter
 *
 * Size controls the rendered height of the wordmark.
 */

import { cn } from '@/lib/utils';

type LogoVariant = 'full' | 'monogram' | 'mark' | 'wordmark';
type LogoScheme  = 'light' | 'dark' | 'amber' | 'auto';
type LogoSize    = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface LogoProps {
  variant?: LogoVariant;
  scheme?: LogoScheme;
  size?: LogoSize;
  className?: string;
}

const HEIGHT_MAP: Record<LogoSize, number> = {
  xs:  16,
  sm:  22,
  md:  28,
  lg:  36,
  xl:  46,
  '2xl': 58,
};

export function Logo({
  variant: _variant = 'full',
  scheme = 'light',
  size = 'md',
  className,
}: LogoProps) {
  const h = HEIGHT_MAP[size];
  const isDark = scheme === 'dark';

  return (
    <span
      className={cn('inline-flex items-center select-none shrink-0', className)}
      aria-label="RO Navigator"
    >
      <img
        src="/brand/logo-full.svg"
        alt="RO Navigator"
        height={h}
        className={cn(
          'block object-contain',
          // Dark scheme: invert navy SVG logo to white for dark surfaces
          isDark && 'brightness-0 invert',
          // Auto: keep native navy on light backgrounds and invert in dark mode
          scheme === 'auto' && 'dark:brightness-0 dark:invert',
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
