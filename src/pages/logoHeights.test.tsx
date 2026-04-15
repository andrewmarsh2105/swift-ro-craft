import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('framer-motion', () => {
  const motion = new Proxy({}, {
    get: () => ({ children, ...props }: { children?: ReactNode }) => <div {...props}>{children}</div>,
  });

  return {
    motion,
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}));

vi.mock('@/hooks/useGoalNotifications', () => ({
  useGoalNotifications: () => {},
}));

vi.mock('@/hooks/useLocalStorageState', () => ({
  useLocalStorageState: (_key: string, initial: string) => [initial, vi.fn()],
}));

vi.mock('@/contexts/ROContext', () => ({
  useRO: () => ({
    ros: [],
    refreshROs: vi.fn(),
    deleteRO: vi.fn(),
  }),
}));

vi.mock('@/contexts/FlagContext', () => ({
  useFlagContext: () => ({
    userSettings: { displayName: 'Tech' },
  }),
}));

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPro: true }),
}));

vi.mock('@/hooks/useSplitterWidth', () => ({
  useSplitterWidth: () => ({ width: 500, setWidth: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/components/shared/OfflineStatusBar', () => ({ OfflineStatusBar: () => <div /> }));
vi.mock('@/components/shared/TrialCountdownBanner', () => ({ TrialCountdownBanner: () => <div /> }));
vi.mock('@/components/mobile/BottomTabBar', () => ({ BottomTabBar: () => <div /> }));
vi.mock('@/components/mobile/FloatingActionButton', () => ({ FloatingActionButton: () => <button /> }));
vi.mock('@/components/sheets/QuickAddSheet', () => ({ QuickAddSheet: () => <div /> }));
vi.mock('@/components/tabs/ROsTab', () => ({ ROsTab: () => <div /> }));
vi.mock('@/components/states/PanelErrorBoundary', () => ({ PanelErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/OnboardingModal', () => ({ OnboardingModal: () => <div /> }));

vi.mock('@/components/shared/DashboardKPIBar', () => ({ DashboardKPIBar: () => <div /> }));
vi.mock('@/components/desktop/ROListPanel', () => ({ ROListPanel: () => <div /> }));
vi.mock('@/components/desktop/ROEditor', () => ({ ROEditor: () => <div /> }));
vi.mock('@/components/desktop/RODetailsPanel', () => ({ RODetailsPanel: () => <div /> }));
vi.mock('@/components/flags/FlagInbox', () => ({ FlagInbox: () => <button /> }));
vi.mock('@/components/stats/ScorecardSheet', () => ({ ScorecardSheet: () => <div /> }));
vi.mock('@/components/ProUpgradeDialog', () => ({ ProUpgradeDialog: () => <div /> }));

import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Landing from '@/pages/Landing';
import { DesktopWorkspace } from '@/components/desktop/DesktopWorkspace';

describe('logo height contracts', () => {
  it('uses 44px logo height in dashboard mobile header', () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    const logo = screen.getByAltText('RO Navigator');
    expect(logo).toHaveAttribute('height', '44');
  });

  it('uses 58px logo height in dashboard desktop app bar', () => {
    render(<DesktopWorkspace />);

    const logo = screen.getByAltText('RO Navigator');
    expect(logo).toHaveAttribute('height', '58');
  });

  it('uses expected auth logo heights for desktop and mobile branding', () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>,
    );

    const logos = screen.getAllByAltText('RO Navigator');
    const heights = logos.map((logo) => logo.getAttribute('height')).sort();
    expect(heights).toEqual(['50', '64']);
  });

  it('uses expected landing nav and footer logo heights', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    const logos = screen.getAllByAltText('RO Navigator');
    const heights = logos.map((logo) => logo.getAttribute('height')).sort();
    expect(heights).toEqual(['28', '56']);
  });
});
