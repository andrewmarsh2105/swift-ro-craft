import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  MAIN_DESKTOP_LOGO_HEIGHT,
  MAIN_MOBILE_LOGO_HEIGHT,
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
  it('keeps dashboard desktop app bar logo visible height pinned', () => {
    render(<DesktopWorkspace />);

    expect(getVisibleHeight(screen.getByAltText('RO Navigator'))).toBe(
      MAIN_DESKTOP_LOGO_HEIGHT.toString(),
    );
  });

  it('keeps dashboard mobile header logo visible height pinned', () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    expect(getVisibleHeight(screen.getByAltText('RO Navigator'))).toBe(
      MAIN_MOBILE_LOGO_HEIGHT.toString(),
    );
  });

  it('keeps auth desktop and mobile branding logo visible heights pinned', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    const authLogos = screen.getAllByAltText('RO Navigator');
    expect(authLogos).toHaveLength(2);

    expect(getVisibleHeight(authLogos[0])).toBe(SIGN_IN_DESKTOP_LOGO_HEIGHT.toString());
    expect(getVisibleHeight(authLogos[1])).toBe(SIGN_IN_MOBILE_LOGO_HEIGHT.toString());
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
