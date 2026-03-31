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
type LogoSize    = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface LogoProps {
  variant?: LogoVariant;
  scheme?: LogoScheme;
  size?: LogoSize;
  className?: string;
}

const HEIGHT_MAP: Record<LogoSize, number> = {
  xs:  16,
  sm:  20,
  md:  26,
  lg:  34,
  xl:  44,
  '2xl': 56,
};

export function Logo({
  variant: _variant = 'full',
  scheme = 'light',
  size = 'md',
  className,
}: LogoProps) {
  const h = HEIGHT_MAP[size];
  const isDark = scheme === 'dark';
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
          // Dark scheme: invert JPEG to white silhouette on dark backgrounds
          isDark && 'brightness-0 invert',
          // Light scheme: multiply blend removes white JPEG background on light surfaces
          scheme === 'light' && 'mix-blend-multiply',
          // Auto: multiply in light mode, invert in dark mode
          isAuto && 'mix-blend-multiply dark:mix-blend-normal dark:brightness-0 dark:invert',
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
