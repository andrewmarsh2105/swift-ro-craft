import { cn } from '@/lib/utils';
import { getLogoRenderMetrics } from './logoSizing';

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

export function Logo({
  variant: _variant = 'full',
  scheme = 'light',
  size = 'md',
  className,
}: LogoProps) {
  const visibleHeight = HEIGHT_MAP[size];
  const normalizedScheme = scheme === 'dark' ? 'dark' : 'light';
  const metrics = getLogoRenderMetrics(normalizedScheme, visibleHeight);

  return (
    <span className={cn('inline-flex shrink-0 overflow-hidden select-none', className)} style={{ height: metrics.visibleHeight }}>
      <img
        src={metrics.src}
        alt="RO Navigator"
        width={metrics.renderedWidth}
        height={metrics.renderedHeight}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block w-auto shrink-0"
        style={{ marginTop: -metrics.offsetY }}
      />
    </span>
  );
}
