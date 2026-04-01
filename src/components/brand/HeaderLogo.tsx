import { cn } from '@/lib/utils';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
}

/**
 * Shared header logo treatment.
 *
 * Uses the single source-of-truth wordmark asset with a transparent
 * background and fixed intrinsic ratio to avoid font/render drift.
 */
export function HeaderLogo({ className, priority = false }: HeaderLogoProps) {
  return (
    <img
      src="/brand/logo-full.svg"
      alt="RO Navigator"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn(
        'block h-auto w-[168px] shrink-0 select-none object-contain sm:w-[184px] lg:w-[196px]',
        className,
      )}
    />
  );
}
