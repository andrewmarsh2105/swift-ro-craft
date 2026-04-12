import { cn } from '@/lib/utils';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
  /** Visible height of the logo in px. Defaults to Tailwind class sizing. */
  height?: number;
}

const LOGO_SRC = '/brand/logo-dark.webp';
/** Intrinsic dimensions of the optimized asset (600 × 411). */
const INTRINSIC_W = 600;
const INTRINSIC_H = 411;

export function HeaderLogo({ className, priority = false, height }: HeaderLogoProps) {
  if (height) {
    const width = Math.round((height / INTRINSIC_H) * INTRINSIC_W);
    return (
      <img
        src={LOGO_SRC}
        alt="RO Navigator"
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className={cn('block shrink-0 select-none', className)}
      />
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="RO Navigator"
      width={INTRINSIC_W}
      height={INTRINSIC_H}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('block h-9 w-auto shrink-0 select-none sm:h-10', className)}
    />
  );
}
