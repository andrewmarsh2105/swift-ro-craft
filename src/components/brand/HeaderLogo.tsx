import { cn } from '@/lib/utils';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
  /** Visible height of the logo in px. Defaults to Tailwind class sizing. */
  height?: number;
  scheme?: 'light' | 'dark';
}

const LOGO_BY_SCHEME = {
  light: { src: '/brand/logo-dark.webp', w: 600, h: 411 },
  dark: { src: '/brand/logo-white.webp', w: 600, h: 403 },
} as const;

export function HeaderLogo({ className, priority = false, height, scheme = 'light' }: HeaderLogoProps) {
  const asset = LOGO_BY_SCHEME[scheme];

  if (height) {
    const width = Math.round((height / asset.h) * asset.w);
    return (
      <img
        src={asset.src}
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
      src={asset.src}
      alt="RO Navigator"
      width={asset.w}
      height={asset.h}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('block h-9 w-auto shrink-0 select-none sm:h-10', className)}
    />
  );
}
