import { cn } from '@/lib/utils';

type LogoVariant = 'full' | 'monogram' | 'mark' | 'wordmark';
type LogoScheme = 'light' | 'dark' | 'amber' | 'auto';
type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface LogoProps {
  variant?: LogoVariant;
  scheme?: LogoScheme;
  size?: LogoSize;
  className?: string;
}

const HEIGHT_MAP: Record<LogoSize, number> = {
  xs: 16,
  sm: 22,
  md: 28,
  lg: 36,
  xl: 46,
  '2xl': 58,
};

const ASSET_BY_SCHEME: Record<Exclude<LogoScheme, 'auto' | 'amber'>, { src: string; w: number; h: number }> = {
  light: { src: '/brand/logo-dark.webp', w: 600, h: 411 },
  dark: { src: '/brand/logo-white.webp', w: 600, h: 403 },
};

export function Logo({
  variant: _variant = 'full',
  scheme = 'light',
  size = 'md',
  className,
}: LogoProps) {
  const h = HEIGHT_MAP[size];
  const asset = scheme === 'dark' ? ASSET_BY_SCHEME.dark : ASSET_BY_SCHEME.light;
  const w = Math.round((h / asset.h) * asset.w);

  return (
    <img
      src={asset.src}
      alt="RO Navigator"
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('block w-auto shrink-0 select-none', className)}
      style={{ height: h }}
    />
  );
}
