import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, BarChart3, Table2, Crown, LayoutDashboard } from "lucide-react";
import { PanelErrorBoundary } from "@/components/states/PanelErrorBoundary";
import { DashboardKPIBar } from "@/components/shared/DashboardKPIBar";
import { ROListPanel } from "./ROListPanel";
import { ROEditor } from "./ROEditor";
import { RODetailsPanel } from "./RODetailsPanel";
import { FlagInbox } from "@/components/flags/FlagInbox";
import { OfflineStatusBar } from "@/components/shared/OfflineStatusBar";
import { TrialCountdownBanner } from "@/components/shared/TrialCountdownBanner";
import { HeaderLogo } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { RepairOrder } from "@/types/ro";
import { useRO } from "@/contexts/ROContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ProUpgradeDialog } from "@/components/ProUpgradeDialog";
import { useSplitterWidth } from "@/hooks/useSplitterWidth";
import { toast } from "sonner";

const SettingsTab = lazy(() =>
  import("@/components/tabs/SettingsTab").then((m) => ({ default: m.SettingsTab })),
);
const SummaryTab = lazy(() =>
  import("@/components/tabs/SummaryTab").then((m) => ({ default: m.SummaryTab })),
);
const SpreadsheetView = lazy(() =>
  import("@/components/shared/SpreadsheetView").then((m) => ({ default: m.SpreadsheetView })),
);

function PanelFallback() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <div className="h-7 w-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <span className="text-xs font-medium text-muted-foreground">Loading…</span>
    </div>
  );
}

const panelVariants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.14, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

type RightPanel = "details" | "editor" | "settings" | "summary" | "none";
type ViewMode = "split" | "spreadsheet";

/* ── Primary nav tab bar (Xtime-inspired) ───────── */
function NavTabBar({
  viewMode,
  rightPanel,
  isPro,
  onDashboard,
  onSpreadsheet,
  onSummary,
  onSettings,
}: {
  viewMode: ViewMode;
  rightPanel: RightPanel;
  isPro: boolean;
  onDashboard: () => void;
  onSpreadsheet: () => void;
  onSummary: () => void;
  onSettings: () => void;
}) {
  const isDashboard = viewMode !== "spreadsheet" && rightPanel !== "settings" && rightPanel !== "summary";
  const isSpreadsheet = viewMode === "spreadsheet";
  const isSummary = rightPanel === "summary";
  const isSettings = rightPanel === "settings";

  return (
    <nav className="nav-tab-bar" aria-label="Main navigation">
      <button
        type="button"
        className={cn("nav-tab", isDashboard && "nav-tab-active")}
        onClick={onDashboard}
        aria-current={isDashboard ? "page" : undefined}
      >
        <LayoutDashboard className="h-[15px] w-[15px]" />
        <span>Dashboard</span>
      </button>

      <button
        type="button"
        className={cn("nav-tab", isSpreadsheet && "nav-tab-active")}
        onClick={onSpreadsheet}
        aria-current={isSpreadsheet ? "page" : undefined}
        title={!isPro ? "Upgrade to Pro for Spreadsheet View" : undefined}
      >
        <Table2 className="h-[15px] w-[15px]" />
        <span>Spreadsheet</span>
        {!isPro && <Crown className="h-2.5 w-2.5 text-amber-500 ml-0.5 flex-shrink-0" />}
      </button>

      <button
        type="button"
        className={cn("nav-tab", isSummary && "nav-tab-active")}
        onClick={onSummary}
        aria-current={isSummary ? "page" : undefined}
      >
        <BarChart3 className="h-[15px] w-[15px]" />
        <span>Summary</span>
      </button>

      <button
        type="button"
        className={cn("nav-tab", isSettings && "nav-tab-active")}
        onClick={onSettings}
        aria-current={isSettings ? "page" : undefined}
      >
        <Settings className="h-[15px] w-[15px]" />
        <span>Settings</span>
      </button>
    </nav>
  );
}

/* ── Splitter drag handle ────────────────────────── */
function SplitHandle({
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}) {
  return (
    <div
      className={cn(
        "w-[5px] flex-shrink-0 cursor-col-resize flex items-center justify-center group quiet-transition relative",
        isDragging
          ? "bg-primary/20"
          : "hover:bg-primary/10",
      )}
      style={{ background: isDragging ? undefined : 'hsl(var(--border) / 0.4)' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="separator"
      aria-orientation="vertical"
    >
      <div className={cn(
        "w-[3px] h-8 rounded-full quiet-transition",
        isDragging ? "bg-primary/60" : "bg-muted-foreground/20 group-hover:bg-primary/40",
      )} />
    </div>
  );
}

/* ── Main workspace ──────────────────────────────── */

export function DesktopWorkspace() {
  const { ros, deleteRO } = useRO();
  const { isPro } = useSubscription();
  const splitter = useSplitterWidth();

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [filteredROs, setFilteredROs] = useState<RepairOrder[]>(ros);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingCreatedROId, setPendingCreatedROId] = useState<string | null>(null);

  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startWidth: splitter.width };
      setIsDragging(true);
    },
    [splitter.width],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      splitter.setWidth(dragRef.current.startWidth + delta);
    },
    [splitter],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handleSelectRO = (ro: RepairOrder) => {
    setSelectedRO(ro);
    setIsAddingNew(false);
    setRightPanel("details");
    setFocusLineId(null);
  };

  const handleSelectROWithFocus = (roId: string, lineId?: string | null) => {
    const ro = ros.find((r) => r.id === roId);
    if (!ro) {
      toast.error("RO not found");
      return;
    }
    if (lineId) {
      const line = ro.lines?.find((l) => l.id === lineId);
      if (!line) toast.warning("Line not found — opening RO");
    }
    setSelectedRO(ro);
    setIsAddingNew(false);
    setRightPanel("editor");
    setFocusLineId(lineId ?? null);
  };

  const handleEditRO = () => setRightPanel("editor");

  const handleAddNew = () => {
    setSelectedRO(null);
    setIsAddingNew(true);
    setRightPanel("editor");
  };

  const handleSave = (savedROId?: string) => {
    setIsAddingNew(false);
    if (savedROId) {
      setPendingCreatedROId(savedROId);
      return;
    }
    setSelectedRO(null);
    setRightPanel("none");
  };

  const handleCancel = () => {
    if (selectedRO && !isAddingNew) {
      setRightPanel("details");
      return;
    }
    setSelectedRO(null);
    setIsAddingNew(false);
    setRightPanel("none");
  };

  const handleSaveAndAddAnother = () => handleAddNew();

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    // Desktop workspace owns scrolling at pane level (left queue + right workspace).
    // Lock page/root scrolling while this shell is mounted to prevent a third
    // competing scroll container at the document level.
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (!selectedRO) return;
    const next = ros.find((item) => item.id === selectedRO.id);
    if (!next) {
      setSelectedRO(null);
      if (rightPanel === "details" || rightPanel === "editor") {
        setRightPanel("none");
      }
      return;
    }
    if (next !== selectedRO) {
      setSelectedRO(next);
    }
  }, [ros, selectedRO, rightPanel]);

  useEffect(() => {
    if (!pendingCreatedROId) return;
    const created = ros.find((item) => item.id === pendingCreatedROId);
    if (!created) return;
    setSelectedRO(created);
    setRightPanel("details");
    setPendingCreatedROId(null);
  }, [pendingCreatedROId, ros]);

  const handleDeleteFromDetails = () => {
    if (!selectedRO) return;
    deleteRO(selectedRO.id);
    setSelectedRO(null);
    setRightPanel("none");
  };

  const togglePanel = (panel: "settings" | "summary") => {
    if (rightPanel === panel) {
      // Clicking active tab is a no-op — don't toggle-close to empty state
      return;
    }
    setRightPanel(panel);
    setSelectedRO(null);
    setIsAddingNew(false);
    if (viewMode === "spreadsheet") setViewMode("split");
  };

  const showEditor = rightPanel === "editor" && (selectedRO || isAddingNew);
  const showDetails = rightPanel === "details" && selectedRO;
  // Settings and Summary are now full-page — they don't narrow the queue
  const hasRightPanel = rightPanel !== "none" && (showEditor || showDetails);
  const isWideList = !hasRightPanel;
  const activeWorkspaceLabel = showEditor
    ? isAddingNew
      ? "New RO Intake"
      : selectedRO
        ? `Editing RO #${selectedRO.roNumber}`
        : "Editing"
    : showDetails && selectedRO
      ? `RO #${selectedRO.roNumber} Details`
      : "Workspace";

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col bg-muted/20">
      <TrialCountdownBanner />
      <OfflineStatusBar />

      {/* ── App Bar ──────────────────────────────────── */}
      <div className="app-bar">
        <div className="flex items-center min-w-0 gap-2.5">
          <HeaderLogo height={52} />
        </div>

        {/* Right-side toolbar — utility items only; nav moved to NavTabBar */}
        <div className="flex items-center gap-1">
          <FlagInbox onNavigateToRO={handleSelectROWithFocus} triggerClassName="text-muted-foreground hover:text-foreground hover:bg-muted/60" />

          {!isPro && (
            <button
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-1 h-6 px-2 rounded border border-primary/25 bg-primary/[0.06] text-[10px] font-bold text-primary hover:bg-primary/12 quiet-transition flex items-center gap-1"
              title="Upgrade to Pro"
            >
              <Crown className="h-2.5 w-2.5" />
              Pro
            </button>
          )}
        </div>
      </div>

      {/* ── Primary Nav Tab Bar ───────────────────────── */}
      <NavTabBar
        viewMode={viewMode}
        rightPanel={rightPanel}
        isPro={isPro}
        onDashboard={() => {
          setViewMode("split");
          if (rightPanel === "settings" || rightPanel === "summary") {
            setRightPanel("none");
            setSelectedRO(null);
            setIsAddingNew(false);
          }
        }}
        onSpreadsheet={() => {
          if (!isPro) {
            setShowUpgradeDialog(true);
            return;
          }
          setViewMode((v) => (v === "spreadsheet" ? "split" : "spreadsheet"));
          if (viewMode === "split") setRightPanel("none");
          setSelectedRO(null);
          setIsAddingNew(false);
        }}
        onSummary={() => togglePanel("summary")}
        onSettings={() => togglePanel("settings")}
      />

      {/* ── Full-page views: Spreadsheet / Summary / Settings ── */}
      <AnimatePresence mode="wait">
        {viewMode === "spreadsheet" ? (
          <motion.div
            key="spreadsheet"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 min-h-0"
          >
            <PanelErrorBoundary label="Spreadsheet">
              <Suspense fallback={<PanelFallback />}>
                <SpreadsheetView
                  ros={ros}
                  onSelectRO={(ro) => {
                    setViewMode("split");
                    handleSelectRO(ro);
                  }}
                />
              </Suspense>
            </PanelErrorBoundary>
          </motion.div>

        ) : rightPanel === "summary" ? (
          <motion.div
            key="summary"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <PanelErrorBoundary label="Summary">
              <Suspense fallback={<PanelFallback />}>
                <SummaryTab />
              </Suspense>
            </PanelErrorBoundary>
          </motion.div>

        ) : rightPanel === "settings" ? (
          <motion.div
            key="settings"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <PanelErrorBoundary label="Settings">
              <Suspense fallback={<PanelFallback />}>
                <SettingsTab />
              </Suspense>
            </PanelErrorBoundary>
          </motion.div>

        ) : (
          /* ── Dashboard split layout ──────────────────── */
          <motion.div
            key="dashboard"
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "flex-1 flex flex-col min-h-0 overflow-hidden",
              isDragging && "select-none",
            )}
          >
            <DashboardKPIBar />
            <div className={cn("flex-1 flex min-h-0 overflow-hidden p-2 gap-2")}>
            {/* Left Panel — Queue */}
            <div
              className={cn(
                "min-w-0 flex-shrink-0 overflow-hidden workspace-queue border border-border/70 rounded-lg shadow-sm",
                !isWideList && "bg-background",
              )}
              style={{
                ...(isWideList ? { flex: "1 1 0%" } : { width: splitter.width }),
              }}
            >
              <ROListPanel
                selectedROId={selectedRO?.id || null}
                onSelectRO={handleSelectRO}
                onAddNew={handleAddNew}
                onFilteredROsChange={setFilteredROs}
                compact={!isWideList}
              />
            </div>

            {/* Splitter + Right Panel — Workspace */}
            {!isWideList && (
              <>
                <SplitHandle
                  isDragging={isDragging}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />

                <div className="flex-1 min-w-0 overflow-hidden workspace-active border border-border/70 rounded-lg shadow-sm flex flex-col">
                  <div className="px-4 py-2 border-b border-border/60 bg-card/95 backdrop-blur-sm flex-shrink-0">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/70">
                        Active Workspace
                      </p>
                      <p className="text-sm font-semibold text-foreground truncate">{activeWorkspaceLabel}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      {showEditor ? (
                        <motion.div
                          key={`editor-${selectedRO?.id ?? "new"}`}
                          variants={panelVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="absolute inset-0 min-h-0 overflow-y-auto overscroll-contain"
                        >
                          <PanelErrorBoundary label="RO Editor">
                          <ROEditor
                            ro={selectedRO}
                            isNew={isAddingNew}
                            focusLineId={focusLineId}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            onSaveAndAddAnother={handleSaveAndAddAnother}
                          />
                        </PanelErrorBoundary>
                        </motion.div>
                      ) : showDetails ? (
                        <motion.div
                          key={`details-${selectedRO?.id}`}
                          variants={panelVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="absolute inset-0 overflow-y-auto"
                        >
                          <PanelErrorBoundary label="RO Details">
                            <RODetailsPanel
                              ro={selectedRO}
                              onEdit={handleEditRO}
                              onDelete={handleDeleteFromDetails}
                              onSelectRO={handleSelectRO}
                            />
                          </PanelErrorBoundary>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        trigger="spreadsheet"
      />
    </div>
  );
}
