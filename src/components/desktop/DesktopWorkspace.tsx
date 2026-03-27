import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Settings, BarChart3, X, Table2, Crown } from "lucide-react";
import { ROListPanel } from "./ROListPanel";
import { ROEditor } from "./ROEditor";
import { RODetailsPanel } from "./RODetailsPanel";
import { FlagInbox } from "@/components/flags/FlagInbox";
import { OfflineStatusBar } from "@/components/shared/OfflineStatusBar";
import { TrialCountdownBanner } from "@/components/shared/TrialCountdownBanner";
import { Logo } from "@/components/brand";
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

/* ── Toolbar icon button ─────────────────────────── */
function ToolbarBtn({
  title, active, onClick, children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "toolbar-btn",
        active && "toolbar-btn-active",
      )}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      {children}
    </button>
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
        "w-1.5 flex-shrink-0 cursor-col-resize flex items-center justify-center group rounded-sm quiet-transition",
        isDragging
          ? "bg-primary/30"
          : "bg-border/30 hover:bg-primary/20",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="separator"
      aria-orientation="vertical"
    >
      <div className="flex flex-col gap-[3px] opacity-50 group-hover:opacity-100 quiet-transition">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              "w-[3px] h-[3px] rounded-full bg-muted-foreground quiet-transition",
              isDragging && "bg-primary",
            )}
          />
        ))}
      </div>
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

  const handleSave = () => {
    setSelectedRO(null);
    setIsAddingNew(false);
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

  const handleDeleteFromDetails = () => {
    if (!selectedRO) return;
    deleteRO(selectedRO.id);
    setSelectedRO(null);
    setRightPanel("none");
  };

  const togglePanel = (panel: "settings" | "summary") => {
    if (rightPanel === panel) {
      setRightPanel("none");
    } else {
      setRightPanel(panel);
      setSelectedRO(null);
      setIsAddingNew(false);
      if (viewMode === "spreadsheet") setViewMode("split");
    }
  };

  const showEditor = rightPanel === "editor" && (selectedRO || isAddingNew);
  const showDetails = rightPanel === "details" && selectedRO;
  const hasRightPanel = rightPanel !== "none" && (showEditor || showDetails || rightPanel === "settings" || rightPanel === "summary");
  const isWideList = !hasRightPanel;

  return (
    <div className="h-screen flex flex-col bg-background">
      <TrialCountdownBanner />
      <OfflineStatusBar />

      {/* ── App Bar ──────────────────────────────────── */}
      <div className="flex-shrink-0 h-11 flex items-center justify-between px-3 border-b border-border/60 bg-card">
        <Logo variant="full" scheme="auto" size="sm" className="text-foreground" />

        {/* Right-side toolbar */}
        <div className="flex items-center gap-0.5">
          <FlagInbox onNavigateToRO={handleSelectROWithFocus} />

          {isPro && (
            <ToolbarBtn
              title="Spreadsheet View"
              active={viewMode === "spreadsheet"}
              onClick={() => {
                setViewMode((v) => (v === "spreadsheet" ? "split" : "spreadsheet"));
                if (viewMode === "split") setRightPanel("none");
                setSelectedRO(null);
                setIsAddingNew(false);
              }}
            >
              <Table2 className="icon-toolbar" />
            </ToolbarBtn>
          )}

          {/* Thin separator */}
          <div className="w-px h-5 bg-border/60 mx-1" />

          <ToolbarBtn
            title="Summary & Reports"
            active={rightPanel === "summary"}
            onClick={() => togglePanel("summary")}
          >
            <BarChart3 className="icon-toolbar" />
          </ToolbarBtn>

          <ToolbarBtn
            title="Settings"
            active={rightPanel === "settings"}
            onClick={() => togglePanel("settings")}
          >
            {rightPanel === "settings" ? <X className="icon-toolbar" /> : <Settings className="icon-toolbar" />}
          </ToolbarBtn>

          {!isPro && (
            <button
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-1.5 h-7 px-2.5 rounded-lg border border-primary/30 bg-primary/[0.08] text-[11px] font-bold text-primary hover:bg-primary/15 quiet-transition flex items-center gap-1.5"
              title="Upgrade to Pro"
            >
              <Crown className="h-3 w-3" />
              Pro
            </button>
          )}
        </div>
      </div>

      {viewMode === "spreadsheet" ? (
        <div className="flex-1 min-h-0">
          <Suspense fallback={<PanelFallback />}>
            <SpreadsheetView
              ros={ros}
              onSelectRO={(ro) => {
                setViewMode("split");
                handleSelectRO(ro);
              }}
            />
          </Suspense>
        </div>
      ) : (
        <div
          className={cn(
            "flex-1 flex min-h-0 p-2.5 gap-2 bg-muted/20",
            isDragging && "select-none",
          )}
        >
          {/* Left Panel */}
          <div
            className="min-w-0 flex-shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card"
            style={{
              ...(isWideList ? { flex: "1 1 0%" } : { width: splitter.width }),
              boxShadow: "var(--shadow-raised)",
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

          {/* Splitter + Right Panel */}
          {!isWideList && (
            <>
              <SplitHandle
                isDragging={isDragging}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />

              <div
                className="flex-1 min-w-0 relative rounded-xl border border-border/60 bg-card overflow-hidden"
                style={{ boxShadow: "var(--shadow-raised)" }}
              >
                <AnimatePresence mode="wait">
                  {rightPanel === "settings" ? (
                    <motion.div
                      key="settings"
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="h-full overflow-y-auto absolute inset-0"
                    >
                      <Suspense fallback={<PanelFallback />}>
                        <SettingsTab />
                      </Suspense>
                    </motion.div>
                  ) : rightPanel === "summary" ? (
                    <motion.div
                      key="summary"
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="h-full overflow-y-auto absolute inset-0"
                    >
                      <Suspense fallback={<PanelFallback />}>
                        <SummaryTab />
                      </Suspense>
                    </motion.div>
                  ) : showEditor ? (
                    <motion.div
                      key={`editor-${selectedRO?.id ?? "new"}`}
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="h-full absolute inset-0"
                    >
                      <ROEditor
                        ro={selectedRO}
                        isNew={isAddingNew}
                        focusLineId={focusLineId}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        onSaveAndAddAnother={handleSaveAndAddAnother}
                      />
                    </motion.div>
                  ) : showDetails ? (
                    <motion.div
                      key={`details-${selectedRO?.id}`}
                      variants={panelVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="h-full absolute inset-0"
                    >
                      <RODetailsPanel
                        ro={selectedRO}
                        onEdit={handleEditRO}
                        onDelete={handleDeleteFromDetails}
                        onSelectRO={handleSelectRO}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      )}

      <ProUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        trigger="spreadsheet"
      />
    </div>
  );
}
