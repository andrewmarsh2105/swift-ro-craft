import { Suspense, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { OfflineStatusBar } from "@/components/shared/OfflineStatusBar";
import { TrialCountdownBanner } from "@/components/shared/TrialCountdownBanner";
import { HeaderLogo } from "@/components/brand";
import { MAIN_MOBILE_HEADER_HEIGHT, MAIN_MOBILE_LOGO_HEIGHT } from "@/components/brand/logoSizing";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import { FloatingActionButton } from "@/components/mobile/FloatingActionButton";
import { QuickAddSheet } from "@/components/sheets/QuickAddSheet";
import { ROsTab } from "@/components/tabs/ROsTab";
import { lazy } from "react";

const DesktopWorkspace = lazy(() =>
  import("@/components/desktop/DesktopWorkspace").then((m) => ({ default: m.DesktopWorkspace })),
);
import { PanelErrorBoundary } from "@/components/states/PanelErrorBoundary";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { useGoalNotifications } from "@/hooks/useGoalNotifications";
import { useFlagContext } from "@/contexts/FlagContext";
import { useRO } from "@/contexts/ROContext";
import type { RepairOrder } from "@/types/ro";

const SummaryTab = lazy(() =>
  import("@/components/tabs/SummaryTab").then((m) => ({ default: m.SummaryTab })),
);
const SpiffsTab = lazy(() =>
  import("@/components/tabs/SummaryTab").then((m) => ({ default: () => <m.SummaryTab tabMode="spiffs" /> })),
);
const SettingsTab = lazy(() =>
  import("@/components/tabs/SettingsTab").then((m) => ({ default: m.SettingsTab })),
);

function TabFallback() {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="relative">
          <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <span className="text-xs font-medium">Loading…</span>
      </div>
    </div>
  );
}

function MobileApp() {
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const isPullTracking = useRef(false);
  const mainRef = useRef<HTMLElement | null>(null);

  const [activeTab, setActiveTab] = useLocalStorageState<"ros" | "summary" | "spiffs" | "settings">(
    "ui.mobile.activeTab.v1",
    "ros",
  );
  const [roViewMode, setRoViewMode] = useLocalStorageState<"cards" | "spreadsheet">(
    "ui.mobile.roViewMode.v1",
    "cards",
  );

  useGoalNotifications();
  const { refreshROs } = useRO();

  const { userSettings } = useFlagContext();
  const avatarInitial = (userSettings.displayName || '').trim().charAt(0).toUpperCase() || '?';
  const PULL_REFRESH_THRESHOLD = 180;

  const handleEditRO = (ro: RepairOrder) => {
    navigate("/add-ro", { state: { editingROId: ro.id } });
  };

  const handleAddRO = () => {
    setShowQuickAdd(true);
  };

  const handleScanPhoto = () => {
    // Close the sheet first so we don't leave backdrop/focus state behind on navigation.
    setShowQuickAdd(false);
    navigate('/add-ro', { state: { openScan: true } });
  };

  const handleOpenProfile = () => {
    localStorage.setItem('ui.settings.openAccountSheet.v1', String(Date.now()));
    setActiveTab('settings');
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1 || isRefreshing) return;
    if ((mainRef.current?.scrollTop || 0) > 0) return;
    pullStartY.current = event.touches[0].clientY;
    isPullTracking.current = true;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (!isPullTracking.current || pullStartY.current === null) return;
    const deltaY = event.touches[0].clientY - pullStartY.current;
    if (deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    const damped = Math.min(deltaY * 0.45, 220);
    setPullDistance(damped);
  };

  const handleTouchEnd = async () => {
    const shouldRefresh = pullDistance >= PULL_REFRESH_THRESHOLD;
    isPullTracking.current = false;
    pullStartY.current = null;
    setPullDistance(0);

    if (!shouldRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshROs();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen brand-shell-bg flex flex-col">
      <TrialCountdownBanner />
      <OfflineStatusBar />
      {/* Mobile app header */}
      <header
        className="brand-topbar flex-shrink-0 flex items-center justify-between px-3.5 py-1.5"
        style={{ minHeight: MAIN_MOBILE_HEADER_HEIGHT }}
      >
        <HeaderLogo
          priority
          height={Math.max(40, MAIN_MOBILE_LOGO_HEIGHT - 4)}
          scheme="light"
          className="translate-y-[1px]"
        />
        <button
          onClick={handleOpenProfile}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold select-none tap-target active:opacity-80 transition-opacity border border-primary/65 shadow-[0_4px_12px_-6px_hsl(var(--primary)/0.7)]"
          aria-label="Open profile settings"
        >
          {avatarInitial}
        </button>
      </header>
      <main
        ref={mainRef}
        className="flex-1 overflow-auto"
        style={{ paddingBottom: 'calc(var(--tab-bar-height) + var(--safe-area-inset-bottom))' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {(pullDistance > 0 || isRefreshing) && (
          <div className="sticky top-0 z-10 flex justify-center pointer-events-none">
            <div className="mt-2 rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              {isRefreshing
                ? "Refreshing ROs…"
                : pullDistance >= PULL_REFRESH_THRESHOLD
                  ? "Release to refresh"
                  : "Pull down hard to refresh"}
            </div>
          </div>
        )}
        {activeTab === "ros" && (
          <PanelErrorBoundary label="ROs">
            <ROsTab onEditRO={handleEditRO} onViewModeChange={setRoViewMode} />
          </PanelErrorBoundary>
        )}

        {activeTab !== "ros" && (
          <Suspense fallback={<TabFallback />}>
            {activeTab === "summary" && (
              <PanelErrorBoundary label="Summary">
                <SummaryTab />
              </PanelErrorBoundary>
            )}
            {activeTab === "spiffs" && (
              <PanelErrorBoundary label="Spiffs">
                <SpiffsTab />
              </PanelErrorBoundary>
            )}
            {activeTab === "settings" && (
              <PanelErrorBoundary label="Settings">
                <SettingsTab />
              </PanelErrorBoundary>
            )}
          </Suspense>
        )}
      </main>

      {activeTab === "ros" && roViewMode !== "spreadsheet" && (
        <FloatingActionButton
          onClick={handleAddRO}
          icon={<Plus className="h-6 w-6" />}
          label="Quick Add"
          className="right-3 bottom-[calc(var(--tab-bar-height)+var(--safe-area-inset-bottom)+1.25rem)]"
        />
      )}

      <QuickAddSheet
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onScanPhoto={handleScanPhoto}
      />

      {!showQuickAdd && <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}

export default function Index() {
  const isMobile = useIsMobile();
  return (
    <>
      <OnboardingModal />
      {isMobile ? <MobileApp /> : (
        <Suspense fallback={<TabFallback />}>
          <DesktopWorkspace />
        </Suspense>
      )}
    </>
  );
}
