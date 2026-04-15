import { cn } from '@/lib/utils';
import { getLogoRenderMetrics } from './logoSizing';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
  /** Visible height of the logo in px. Defaults to Tailwind class sizing. */
  height?: number;
  scheme?: 'light' | 'dark';
}

export function HeaderLogo({ className, priority = false, height, scheme = 'light' }: HeaderLogoProps) {
  const visibleHeight = height ?? 36;
  const metrics = getLogoRenderMetrics(scheme, visibleHeight);

  return (
    <span
      className={cn('inline-flex shrink-0 overflow-hidden select-none', className)}
      style={{ height: metrics.visibleHeight }}
      data-logo-visible-height={metrics.visibleHeight}
      data-logo-scheme={scheme}
    >
      <img
        src={metrics.src}
        alt="RO Navigator"
        width={metrics.renderedWidth}
        height={metrics.renderedHeight}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className="block w-auto shrink-0"
        style={{ marginTop: -metrics.offsetY }}
      />
    </span>
  );
}
