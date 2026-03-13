/**
 * Logo — RO Navigator brand lockup system
 *
 * Variants:
 *   full        — [RO•] Navigator   (sidebar, website nav, login)
 *   monogram    — [RO•]             (compact nav, medium-width contexts)
 *   mark        — [•]               (favicon container, app icon, tiny sizes)
 *   wordmark    — RO Navigator      (print, tight horizontal, no-mark contexts)
 *
 * Color schemes:
 *   light       — navy mark + amber tick, navy wordmark. Use on white/light.
 *   dark        — white mark, white wordmark. Use on dark/navy backgrounds.
 *   amber       — amber mark. Use on deep navy backgrounds only.
 *
 * Scale rules:
 *   > 200px wide  → variant="full"
 *   100–200px     → variant="monogram"
 *   48–100px      → variant="mark" (BrandMark only)
 *   < 48px        → use BrandMarkContainer (favicon/icon context)
 *
 * The "RO" text uses Inter Black (900) — already loaded by the app.
 * "Navigator" uses Inter Medium (500).
 * Both use negative tracking on "RO" (-0.02em) and open tracking on
 * "Navigator" (+0.06em) for the engineered contrast that defines the lockup.
 */

import { BrandMark } from './BrandMark';
import { cn } from '@/lib/utils';

type LogoVariant = 'full' | 'monogram' | 'mark' | 'wordmark';
type LogoScheme  = 'light' | 'dark' | 'amber' | 'auto';

interface LogoProps {
  variant?: LogoVariant;
  scheme?: LogoScheme;
  /** Base size. Controls mark size; wordmark scales proportionally. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: { mark: 18, ro: '1rem',   nav: '0.6rem',  gap: 4  },
  sm: { mark: 22, ro: '1.15rem', nav: '0.7rem', gap: 5  },
  md: { mark: 28, ro: '1.4rem',  nav: '0.85rem', gap: 6 },
  lg: { mark: 36, ro: '1.75rem', nav: '1.05rem', gap: 8 },
  xl: { mark: 48, ro: '2.25rem', nav: '1.35rem', gap: 10 },
} as const;

/** Map logo scheme → mark colorScheme prop */
const MARK_SCHEME = {
  light: 'navy-amber',
  dark:  'white',
  amber: 'amber',
  auto:  'auto',
} as const;

/**
 * Map logo scheme → text color.
 * 'auto' returns undefined so the component uses `currentColor`
 * (inherits from parent's text color — works with Tailwind dark mode).
 */
const TEXT_COLOR: Record<LogoScheme, string | undefined> = {
  light: 'hsl(var(--brand-navy))',
  dark:  'white',
  amber: 'hsl(var(--brand-amber-light))',
  auto:  undefined, // inherits currentColor
};

export function Logo({
  variant = 'full',
  scheme = 'light',
  size = 'md',
  className,
}: LogoProps) {
  const s = SIZE_MAP[size];
  const markScheme = MARK_SCHEME[scheme];
  const textColor  = TEXT_COLOR[scheme];

  if (variant === 'mark') {
    return <BrandMark size={s.mark} colorScheme={markScheme} className={className} />;
  }

  if (variant === 'wordmark') {
    return (
      <span
        className={cn('inline-flex items-baseline select-none', className)}
        style={{ gap: '0.35em', color: textColor }}
        aria-label="RO Navigator"
      >
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900,
          fontSize: s.ro,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          RO
        </span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: s.nav,
          letterSpacing: '0.06em',
          lineHeight: 1,
          textTransform: 'uppercase',
        }}>
          Navigator
        </span>
      </span>
    );
  }

  if (variant === 'monogram') {
    return (
      <span
        className={cn('inline-flex items-center select-none', className)}
        style={{ gap: s.gap * 0.25, color: textColor }}
        aria-label="RO Navigator"
      >
        {/* "R" — vertically centered with the circle */}
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900,
          fontSize: s.ro,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginRight: -(s.gap * 0.5),
        }}>
          R
        </span>
        {/* Reticle-O — the mark replaces the "O" */}
        <BrandMark size={s.mark} colorScheme={markScheme} />
      </span>
    );
  }

  // variant === 'full'
  return (
    <span
      className={cn('inline-flex items-center select-none', className)}
      style={{ gap: s.gap, color: textColor }}
      aria-label="RO Navigator"
    >
      {/* Monogram: R + reticle-O */}
      <span className="inline-flex items-center" style={{ gap: -(s.gap * 0.5) }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900,
          fontSize: s.ro,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginRight: -(s.gap * 0.3),
        }}>
          R
        </span>
        <BrandMark size={s.mark} colorScheme={markScheme} />
      </span>
      {/* "Navigator" wordmark */}
      <span style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        fontSize: s.nav,
        letterSpacing: '0.06em',
        lineHeight: 1,
        textTransform: 'uppercase',
      }}>
        Navigator
      </span>
    </span>
  );
}
