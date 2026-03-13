/**
 * BrandMark — The reticle-O symbol
 *
 * The core brand symbol for RO Navigator: a precise circle with a single
 * indicator tick at the 11 o'clock position (330° clockwise from 12).
 * Constructed from two elements only — circle stroke + tick line.
 * No font dependency. Scales cleanly from 16px (favicon) to 200px+.
 *
 * Construction math (normalized to 100×100 viewBox):
 *   Circle: cx=50, cy=50, r=30, stroke-width=4.5
 *   Tick at 240° from +x axis (= 11 o'clock in SVG coords):
 *     Start: inner edge of circle at 240° → (36.1, 26.0)
 *     End:   8px toward center             → (40.1, 32.9)
 *     Stroke: same weight as circle (4.5)
 */

import { cn } from '@/lib/utils';

type ColorScheme =
  | 'navy'         // Navy mark — for light backgrounds
  | 'white'        // White mark — for dark backgrounds
  | 'amber'        // Full amber mark — app icon, splash, dark bg highlight
  | 'navy-amber'   // Navy circle + amber tick — primary two-color, light bg
  | 'auto';        // currentColor — inherits from parent, adapts to dark mode

interface BrandMarkProps {
  /** Rendered size in px. The SVG viewBox is always 100×100; this sets width/height. */
  size?: number;
  colorScheme?: ColorScheme;
  className?: string;
}

/** Stroke widths relative to the 100-unit viewBox. */
const STROKE = 4.5;

/** Circle geometry */
const CX = 50;
const CY = 50;
const R  = 30;

/**
 * Tick at 11 o'clock (240° from +x axis in SVG coords).
 * Start point: inner edge of circle stroke at that angle.
 * End point: 8 units toward center from start.
 *
 * cos(240°) = -0.5   sin(240°) = -0.866
 * Inner radius = R - STROKE/2 = 30 - 2.25 = 27.75
 * Start: (50 + 27.75×-0.5,  50 + 27.75×-0.866) = (36.125, 25.966)
 * Unit direction toward center: (0.5, 0.866)
 * End:   (36.125 + 8×0.5,   25.966 + 8×0.866) = (40.125, 32.894)
 */
const TICK = {
  x1: 36.1, y1: 26.0,
  x2: 40.1, y2: 32.9,
} as const;

const SCHEME_COLORS: Record<ColorScheme, { circle: string; tick: string }> = {
  'navy':       { circle: 'hsl(var(--brand-navy))',         tick: 'hsl(var(--brand-navy))' },
  'white':      { circle: 'white',                          tick: 'white' },
  'amber':      { circle: 'hsl(var(--brand-amber-light))',  tick: 'hsl(var(--brand-amber-light))' },
  'navy-amber': { circle: 'hsl(var(--brand-navy))',         tick: 'hsl(var(--brand-amber))' },
  'auto':       { circle: 'currentColor',                   tick: 'currentColor' },
};

export function BrandMark({ size = 32, colorScheme = 'navy-amber', className }: BrandMarkProps) {
  const { circle, tick } = SCHEME_COLORS[colorScheme];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('flex-shrink-0', className)}
    >
      {/* Reticle circle */}
      <circle
        cx={CX} cy={CY} r={R}
        stroke={circle}
        strokeWidth={STROKE}
      />
      {/* Indicator tick — 11 o'clock, pointing toward center */}
      <line
        x1={TICK.x1} y1={TICK.y1}
        x2={TICK.x2} y2={TICK.y2}
        stroke={tick}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * BrandMarkContainer — The mark inside a contained background square.
 * Use for: app icons, favicon backgrounds, social avatars, dark-on-light contexts.
 */
interface BrandMarkContainerProps {
  size?: number;
  /** Padding as % of size (0–0.4). Default 0.22 = 22% on each side. */
  padding?: number;
  className?: string;
}

export function BrandMarkContainer({ size = 48, padding = 0.22, className }: BrandMarkContainerProps) {
  const markSize = Math.round(size * (1 - padding * 2));
  const cornerRadius = Math.round(size * 0.1875); // matches iOS icon rounding at any size

  return (
    <div
      className={cn('inline-flex items-center justify-center flex-shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: cornerRadius,
        background: 'linear-gradient(145deg, hsl(var(--brand-navy)), hsl(var(--brand-slate)))',
      }}
    >
      <BrandMark size={markSize} colorScheme="amber" />
    </div>
  );
}
