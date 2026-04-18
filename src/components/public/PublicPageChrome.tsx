import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeaderLogo } from '@/components/brand';
import { LANDING_FOOTER_LOGO_HEIGHT, LANDING_NAV_LOGO_HEIGHT } from '@/components/brand/logoSizing';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PublicPageHeaderProps {
  rightSlot?: ReactNode;
  showBack?: boolean;
  backLabel?: string;
  backTo?: string;
  dark?: boolean;
  maxWidthClassName?: string;
}

export function PublicPageHeader({
  rightSlot,
  showBack = false,
  backLabel = 'Back',
  backTo = '/',
  dark = false,
  maxWidthClassName = 'max-w-[1120px]',
}: PublicPageHeaderProps) {
  return (
    <header
      className={cn('sticky top-0 z-40 border-b backdrop-blur-md', dark ? 'text-blue-50' : 'text-foreground')}
      style={{
        background: dark ? 'rgba(8,28,69,0.9)' : 'rgba(255,255,255,0.85)',
        borderColor: dark ? 'rgba(191,219,254,0.28)' : 'rgba(203,213,225,0.7)',
      }}
    >
      <div className={cn('mx-auto flex h-[68px] items-center justify-between gap-3 px-4 md:h-[72px] md:px-8', maxWidthClassName)}>
        <Link to="/" aria-label="RO Navigator home">
          <HeaderLogo scheme={dark ? 'dark' : 'light'} priority height={LANDING_NAV_LOGO_HEIGHT} />
        </Link>

        <div className="flex items-center gap-2">
          {rightSlot}
          {showBack && (
            <Link
              to={backTo}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                dark ? 'border-white/25 text-blue-50 hover:bg-white/10' : 'border-border text-muted-foreground hover:text-foreground hover:bg-card',
              )}
            >
              <ArrowLeft className="h-4 w-4" /> {backLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

interface PublicPageFooterProps {
  dark?: boolean;
}

export function PublicPageFooter({ dark = false }: PublicPageFooterProps) {
  return (
    <footer
      className="px-4 py-10 md:px-8"
      style={{ background: dark ? '#061739' : '#F8FAFC', color: dark ? 'rgba(239,246,255,0.82)' : '#475569' }}
    >
      <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          <HeaderLogo scheme={dark ? 'dark' : 'light'} height={LANDING_FOOTER_LOGO_HEIGHT} />
          <span className="text-xs">Built for technicians who verify every hour.</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link to="/terms" className="hover:opacity-90">Terms</Link>
          <Link to="/privacy" className="hover:opacity-90">Privacy</Link>
          <Link to="/support" className="hover:opacity-90">Support</Link>
          <Link to="/auth" className="hover:opacity-90">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
