import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";

import { OfflineStatusBar } from "@/components/shared/OfflineStatusBar";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import { FloatingActionButton } from "@/components/mobile/FloatingActionButton";
import { QuickAddSheet } from "@/components/sheets/QuickAddSheet";
import { ROsTab } from "@/components/tabs/ROsTab";
import { DesktopWorkspace } from "@/components/desktop/DesktopWorkspace";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { RepairOrder } from "@/types/ro";

const SummaryTab = lazy(() =>
  import("@/components/tabs/SummaryTab").then((m) => ({ default: m.SummaryTab })),
);
const SettingsTab = lazy(() =>
  import("@/components/tabs/SettingsTab").then((m) => ({ default: m.SettingsTab })),
);

function TabFallback() {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

function MobileApp() {
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const [activeTab, setActiveTab] = useLocalStorageState<"ros" | "summary" | "settings">(
    "ui.mobile.activeTab.v1",
    "ros",
  );
  const [roViewMode, setRoViewMode] = useLocalStorageState<"cards" | "spreadsheet">(
    "ui.mobile.roViewMode.v1",
    "cards",
  );

  const handleEditRO = (ro: RepairOrder) => {
    navigate("/add-ro", { state: { editingROId: ro.id } });
  };

  const handleAddRO = () => {
    setShowQuickAdd(true);
  };

  const handleScanPhoto = () => {
    navigate('/add-ro', { state: { openScan: true } });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineStatusBar />
      <main className="flex-1 overflow-auto" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
        {activeTab === "ros" && <ROsTab onEditRO={handleEditRO} onViewModeChange={setRoViewMode} />}

        {activeTab !== "ros" && (
          <Suspense fallback={<TabFallback />}>
            {activeTab === "summary" && <SummaryTab />}
            {activeTab === "settings" && <SettingsTab />}
          </Suspense>
        )}
      </main>

      {activeTab === "ros" && roViewMode !== "spreadsheet" && (
        <FloatingActionButton onClick={handleAddRO} icon={<Plus className="h-6 w-6" />} label="Quick Add" />
      )}

      <QuickAddSheet
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onScanPhoto={handleScanPhoto}
      />

      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default function Index() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileApp /> : <DesktopWorkspace />;
}
