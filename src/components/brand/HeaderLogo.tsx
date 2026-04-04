import { cn } from '@/lib/utils';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
  height?: number;
}

/**
 * Shared header logo treatment.
 *
 * Uses the dashboard source-of-truth transparent wordmark asset.
 * Pass `height` (number, px) to set size via inline style — bypasses
 * Tailwind purging and class-merge conflicts entirely.
 */
export function HeaderLogo({ className, priority = false, height }: HeaderLogoProps) {
  return (
    <img
      src="/brand/logo-ronavigator-app-dark.png"
      alt="RO Navigator"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      style={height ? { height, width: 'auto' } : undefined}
      className={cn(
        'block shrink-0 select-none object-contain',
        !height && 'h-9 w-auto sm:h-10',
        className,
      )}
    />
  );
}
