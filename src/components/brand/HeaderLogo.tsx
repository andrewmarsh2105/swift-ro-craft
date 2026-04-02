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
        'block h-auto w-[142px] max-w-full shrink-0 select-none object-contain sm:w-[156px] lg:w-[164px]',
        className,
      )}
    />
  );
}
