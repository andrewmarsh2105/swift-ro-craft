import { cn } from '@/lib/utils';

interface HeaderLogoProps {
  className?: string;
  priority?: boolean;
  /**
   * Visible height of the logo in px.
   * The PNG has large transparent padding, so internally the image is rendered
   * at 3× this height inside an overflow-hidden wrapper — the padding overflows
   * and gets clipped, leaving only the actual wordmark content visible.
   */
  height?: number;
}

const LOGO_SRC = '/brand/logo-ronavigator-app-dark.png';

export function HeaderLogo({ className, priority = false, height }: HeaderLogoProps) {
  if (height) {
    return (
      <div
        aria-label="RO Navigator"
        style={{ height, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center' }}
        className={className}
      >
        <img
          src={LOGO_SRC}
          alt="RO Navigator"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          style={{ height: height * 3, width: 'auto' }}
          className="block select-none object-contain"
        />
      </div>
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="RO Navigator"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('block h-9 w-auto shrink-0 select-none object-contain sm:h-10', className)}
    />
  );
}
