import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  DASHBOARD_DESKTOP_LOGO_HEIGHT,
  MAIN_DESKTOP_APP_BAR_HEIGHT,
  MAIN_MOBILE_HEADER_HEIGHT,
  SIGN_IN_DESKTOP_LOGO_HEIGHT,
  SIGN_IN_MOBILE_LOGO_HEIGHT,
  LANDING_FOOTER_LOGO_HEIGHT,
  LANDING_NAV_LOGO_HEIGHT,
} from '@/components/brand/logoSizing';
import { DesktopWorkspace } from '@/components/desktop/DesktopWorkspace';
import Auth from '@/pages/Auth';
import Landing from '@/pages/Landing';
import Index from '@/pages/Index';

vi.mock('@/contexts/ROContext', () => ({
  useRO: () => ({
    ros: [],
    deleteRO: vi.fn(),
    refreshROs: vi.fn(),
  }),
}));

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    isPro: true,
  }),
}));

vi.mock('@/contexts/FlagContext', () => ({
  useFlagContext: () => ({
    userSettings: { displayName: 'Tester' },
  }),
}));

vi.mock('@/hooks/useGoalNotifications', () => ({
  useGoalNotifications: () => undefined,
}));

vi.mock('@/hooks/useSplitterWidth', () => ({
  useSplitterWidth: () => ({ width: 420, setWidth: vi.fn() }),
}));

vi.mock('@/hooks/useLocalStorageState', () => ({
  useLocalStorageState: <T,>(_: string, initialValue: T) => [initialValue, vi.fn()] as const,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}));

vi.mock('@/components/shared/TrialCountdownBanner', () => ({
  TrialCountdownBanner: () => null,
}));

vi.mock('@/components/shared/OfflineStatusBar', () => ({
  OfflineStatusBar: () => null,
}));

vi.mock('@/components/shared/DashboardKPIBar', () => ({
  DashboardKPIBar: () => null,
}));

vi.mock('@/components/stats/ScorecardSheet', () => ({
  ScorecardSheet: () => null,
}));

vi.mock('@/components/flags/FlagInbox', () => ({
  FlagInbox: () => null,
}));

vi.mock('@/components/ProUpgradeDialog', () => ({
  ProUpgradeDialog: () => null,
}));

vi.mock('@/components/desktop/ROListPanel', () => ({
  ROListPanel: () => null,
}));

vi.mock('@/components/desktop/ROEditor', () => ({
  ROEditor: () => null,
}));

vi.mock('@/components/desktop/RODetailsPanel', () => ({
  RODetailsPanel: () => null,
}));

vi.mock('@/components/mobile/BottomTabBar', () => ({
  BottomTabBar: () => null,
}));

vi.mock('@/components/mobile/FloatingActionButton', () => ({
  FloatingActionButton: () => null,
}));

vi.mock('@/components/sheets/QuickAddSheet', () => ({
  QuickAddSheet: () => null,
}));

vi.mock('@/components/tabs/ROsTab', () => ({
  ROsTab: () => <div>ROs</div>,
}));

vi.mock('@/components/OnboardingModal', () => ({
  OnboardingModal: () => null,
}));

const getVisibleHeight = (img: HTMLElement) => img.parentElement?.getAttribute('data-logo-visible-height');

describe('logo sizing', () => {
  it('uses the updated landing nav logo token for a slightly larger top-nav logo', () => {
    expect(LANDING_NAV_LOGO_HEIGHT).toBe(52);
  });

  it('keeps dashboard desktop app bar height pinned and renders the dashboard logo', () => {
    render(<DesktopWorkspace />);

    const dashboardLogo = screen.getByAltText('RO Navigator');
    expect(getVisibleHeight(dashboardLogo)).toBe(DASHBOARD_DESKTOP_LOGO_HEIGHT.toString());
    expect(dashboardLogo).toHaveAttribute('src', '/brand/logo-dark.webp');

    const appBar = document.querySelector('.app-bar');
    expect(appBar).toHaveStyle({ minHeight: `${MAIN_DESKTOP_APP_BAR_HEIGHT}px` });
  });

  it('keeps dashboard mobile header height pinned and does not render a logo', () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    const header = document.querySelector('header');
    expect(screen.queryByAltText('RO Navigator')).not.toBeInTheDocument();
    expect(header).toHaveStyle({
      minHeight: `${MAIN_MOBILE_HEADER_HEIGHT}px`,
    });
  });

  it('keeps auth desktop and mobile branding logo visible heights pinned using shared asset path', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    const authLogos = screen.getAllByAltText('RO Navigator');
    expect(authLogos).toHaveLength(2);

    expect(getVisibleHeight(authLogos[0])).toBe(SIGN_IN_DESKTOP_LOGO_HEIGHT.toString());
    expect(getVisibleHeight(authLogos[1])).toBe(SIGN_IN_MOBILE_LOGO_HEIGHT.toString());
    expect(authLogos[0]).toHaveAttribute('src', '/brand/logo-dark.webp');
    expect(authLogos[1]).toHaveAttribute('src', '/brand/logo-dark.webp');
  });

  it('keeps landing nav and footer logo visible heights pinned via shared header logo', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    const landingLogos = screen.getAllByAltText('RO Navigator');
    expect(getVisibleHeight(landingLogos[0])).toBe(LANDING_NAV_LOGO_HEIGHT.toString());
    expect(getVisibleHeight(landingLogos.at(-1) as HTMLElement)).toBe(LANDING_FOOTER_LOGO_HEIGHT.toString());

    expect(landingLogos[0]).toHaveAttribute('src', '/brand/logo-white.webp');
    expect(landingLogos.at(-1)).toHaveAttribute('src', '/brand/logo-white.webp');
  });
});
