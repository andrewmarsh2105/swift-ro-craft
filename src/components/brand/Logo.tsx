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

  return (
    <img
      src="/brand/logo-full.svg"
      alt="RO Navigator"
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn(
        'block w-auto shrink-0 select-none object-contain',
        isDark && '[filter:brightness(0)_invert(1)]',
        isAuto && 'dark:[filter:brightness(0)_invert(1)]',
        className,
      )}
      style={{ height: h }}
    />
  );
}
