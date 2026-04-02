import { cn } from '@/lib/utils';

type HeaderLogoScheme = 'navy' | 'white';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
  scheme?: HeaderLogoScheme;
}

const ASSET_MAP: Record<HeaderLogoScheme, string> = {
  navy: '/brand/logo-wordmark-navy.svg',
  white: '/brand/logo-wordmark-white.svg',
};

/**
 * Shared header logo treatment.
 *
 * Uses the official transparent wordmark assets (navy/white navigator variants)
 * and a fixed width with object-contain to preserve intrinsic aspect ratio.
 */
export function HeaderLogo({ className, priority = false, scheme = 'navy' }: HeaderLogoProps) {
  return (
    <img
      src={ASSET_MAP[scheme]}
      alt="RO Navigator"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn(
        'block h-8 w-auto max-w-full shrink-0 select-none object-contain sm:h-9',
        className,
      )}
    />
  );
}
