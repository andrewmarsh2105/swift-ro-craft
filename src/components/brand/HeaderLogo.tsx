import { cn } from '@/lib/utils';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
}

/**
 * Shared header logo treatment.
 *
 * Uses the dashboard source-of-truth transparent wordmark asset and a fixed
 * width with object-contain to preserve intrinsic aspect ratio.
 */
export function HeaderLogo({ className, priority = false }: HeaderLogoProps) {
  return (
    <img
      src="/brand/logo-ronavigator-app-dark.png"
      alt="RO Navigator"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn(
        'block h-8 w-auto max-w-[180px] shrink-0 select-none object-contain sm:h-9',
        className,
      )}
    />
  );
}
