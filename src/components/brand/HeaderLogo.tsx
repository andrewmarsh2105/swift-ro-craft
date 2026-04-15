import { cn } from '@/lib/utils';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
  /** Visible height of the logo in px. Defaults to Tailwind class sizing. */
  height?: number;
  /** light = dark logo for light backgrounds, dark = white logo for dark backgrounds. */
  scheme?: 'light' | 'dark';
}

const ASSETS = {
  light: { src: '/brand/logo-dark.webp', width: 600, height: 411 },
  dark: { src: '/brand/logo-white.webp', width: 600, height: 403 },
} as const;

export function HeaderLogo({ className, priority = false, height, scheme = 'light' }: HeaderLogoProps) {
  const asset = ASSETS[scheme];

  if (height) {
    const width = Math.round((height / asset.height) * asset.width);
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
      width={asset.width}
      height={asset.height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('block h-9 w-auto shrink-0 select-none sm:h-10', className)}
    />
  );
}
