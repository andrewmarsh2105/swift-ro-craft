/**
 * Logo — RO Navigator brand wordmark
 *
 * Renders the two-tone wordmark inline:
 *   "RO"        — Inter Black 900, blue  (#2B82F0)
 *   "Navigator" — Inter ExtraBold 800, navy (#0C1829)
 *
 * scheme prop:
 *   light — native brand colors (for light surfaces)
 *   dark  — all white (for dark/navy surfaces)
 *   auto  — native in light mode, white in dark mode
 *
 * size controls the font-size (and therefore the rendered height).
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
  const isAuto = scheme === 'auto';

  const roClass = cn(
    isDark ? 'text-white' : 'text-[#2B82F0]',
    isAuto && 'dark:text-white',
  );
  const navClass = cn(
    isDark ? 'text-white' : 'text-[#0C1829]',
    isAuto && 'dark:text-white',
  );

  return (
    <span
      className={cn('inline-flex items-baseline select-none shrink-0', className)}
      aria-label="RO Navigator"
    >
      <span
        className={cn('font-black tracking-tight', roClass)}
        style={{ fontSize: h, lineHeight: 1 }}
      >RO</span>
      <span
        className={cn('font-extrabold tracking-tight', navClass)}
        style={{ fontSize: h, lineHeight: 1, marginLeft: '0.22em' }}
      >Navigator</span>
    </span>
  );
}
