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
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

const panelVariants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

type RightPanel = "details" | "editor" | "settings" | "summary" | "none";
type ViewMode = "split" | "spreadsheet";

function IconButton(props: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        "h-9 w-9 flex items-center justify-center rounded-md quiet-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        props.active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
      title={props.title}
      aria-label={props.title}
      aria-pressed={props.active}
    >
      {props.children}
    </button>
  );
}

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

  // Row click → details (safe, read-only)
  const handleSelectRO = (ro: RepairOrder) => {
    setSelectedRO(ro);
    setIsAddingNew(false);
    setRightPanel("details");
    setFocusLineId(null);
  };

  // Flag inbox navigation → editor with focus
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

  // Explicit edit action
  const handleEditRO = () => {
    setRightPanel("editor");
  };

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
    // If we were editing an existing RO, go back to details
    if (selectedRO && !isAddingNew) {
      setRightPanel("details");
      return;
    }
    setSelectedRO(null);
    setIsAddingNew(false);
    setRightPanel("none");
  };

  const handleSaveAndAddAnother = () => {
    handleAddNew();
  };

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

      {/* App Bar */}
      <div className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-border/90 bg-gradient-to-r from-card via-card to-accent/35 backdrop-blur-sm shadow-[var(--shadow-sm)]">
        <Logo variant="full" scheme="auto" size="sm" className="text-foreground" />

        <div className="flex items-center gap-1">
          <FlagInbox onNavigateToRO={handleSelectROWithFocus} />

          {isPro && (
            <IconButton
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
            </IconButton>
          )}

          <IconButton
            title="Summary & Reports"
            active={rightPanel === "summary"}
            onClick={() => togglePanel("summary")}
          >
            <BarChart3 className="icon-toolbar" />
          </IconButton>

          <IconButton
            title="Settings"
            active={rightPanel === "settings"}
            onClick={() => togglePanel("settings")}
          >
            {rightPanel === "settings" ? <X className="icon-toolbar" /> : <Settings className="icon-toolbar" />}
          </IconButton>

          {!isPro && (
            <button
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-1 h-9 px-3 rounded-md border border-border/80 bg-accent/35 text-[11px] font-semibold text-primary hover:bg-accent/55 quiet-transition flex items-center gap-2"
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
              ros={filteredROs}
              onSelectRO={(ro) => {
                setViewMode("split");
                handleSelectRO(ro);
              }}
            />
          </Suspense>
        </div>
      ) : (
        <div className={cn("flex-1 flex min-h-0 p-3 gap-3 bg-gradient-to-b from-primary/[0.04] via-background to-accent/[0.14]", isDragging && "select-none")}>
          {/* Left Panel */}
          <div
            className="min-w-0 flex-shrink-0 overflow-hidden rounded-2xl border border-border/90 bg-card/95 shadow-[var(--shadow-raised)]"
            style={isWideList ? { flex: "1 1 0%" } : { width: splitter.width }}
          >
            <ROListPanel
              selectedROId={selectedRO?.id || null}
              onSelectRO={handleSelectRO}
              onAddNew={handleAddNew}
              onFilteredROsChange={setFilteredROs}
              compact={!isWideList}
            />
          </div>

          {/* Draggable splitter + Right Panel */}
          {!isWideList && (
            <>
              <div
                className={cn(
                  "w-2 flex-shrink-0 cursor-col-resize flex items-center justify-center group border-x border-border/80 bg-gradient-to-b from-accent/60 to-secondary/70 hover:from-accent hover:to-secondary quiet-transition rounded-md",
                  isDragging && "bg-accent",
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div className="flex flex-col gap-[3px]">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 h-1 rounded-full bg-border group-hover:bg-muted-foreground/50 quiet-transition",
                        isDragging && "bg-muted-foreground/50",
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 min-w-0 relative rounded-2xl border border-border/90 bg-card/95 shadow-[var(--shadow-raised)]">
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
