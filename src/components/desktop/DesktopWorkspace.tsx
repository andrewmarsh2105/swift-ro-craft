import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ROListPanel } from "./ROListPanel";
import { ROEditor } from "./ROEditor";
import { FlagInbox } from "@/components/flags/FlagInbox";
import { OfflineStatusBar } from "@/components/shared/OfflineStatusBar";
import { Settings, BarChart3, X, Table2, Crown, FileText } from "lucide-react";
import roLogo from "@/assets/ro-logo.jpeg";
import { cn } from "@/lib/utils";
import type { RepairOrder } from "@/types/ro";
import { useRO } from "@/contexts/ROContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ProUpgradeDialog } from "@/components/ProUpgradeDialog";
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
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

type RightPanel = "editor" | "settings" | "summary" | "none";
type ViewMode = "split" | "spreadsheet";

function IconButton(props: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={props.onClick}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
        props.active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
      title={props.title}
    >
      {props.children}
    </button>
  );
}

export function DesktopWorkspace() {
  const { ros } = useRO();
  const { isPro } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [filteredROs, setFilteredROs] = useState<RepairOrder[]>(ros);

  const handleSelectRO = (ro: RepairOrder) => {
    setSelectedRO(ro);
    setIsAddingNew(false);
    setRightPanel("editor");
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
    setSelectedRO(null);
    setIsAddingNew(false);
    setRightPanel("none");
  };

  const handleSaveAndAddAnother = () => {};

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
  const isListExpanded = rightPanel === "none";

  return (
    <div className="h-screen flex flex-col bg-background">
      <OfflineStatusBar />

      {/* Industrial App Bar */}
      <div className="flex-shrink-0 h-11 flex items-center justify-between px-4 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center">
            <img
              src={roLogo}
              alt="RO Navigator"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs tracking-tight text-foreground leading-none">
              RO Navigator
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Repair order tracking
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <FlagInbox onNavigateToRO={handleSelectROWithFocus} />

          {isPro && (
            <IconButton
              title="Spreadsheet View"
              active={viewMode === "spreadsheet"}
              onClick={() => {
                setViewMode((v) =>
                  v === "spreadsheet" ? "split" : "spreadsheet"
                );
                if (viewMode === "split") setRightPanel("none");
                setSelectedRO(null);
                setIsAddingNew(false);
              }}
            >
              <Table2 className="h-4 w-4" />
            </IconButton>
          )}

          <IconButton
            title="Summary & Reports"
            active={rightPanel === "summary"}
            onClick={() => togglePanel("summary")}
          >
            <BarChart3 className="h-4 w-4" />
          </IconButton>

          <IconButton
            title="Settings"
            active={rightPanel === "settings"}
            onClick={() => togglePanel("settings")}
          >
            {rightPanel === "settings" ? (
              <X className="h-4 w-4" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
          </IconButton>

          {!isPro && (
            <button
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-1 h-8 px-3 rounded-md border bg-background text-[11px] font-semibold text-primary hover:bg-accent transition-colors flex items-center gap-1.5"
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
        <div className="flex-1 flex min-h-0">
          {/* Left Panel: expand when not editing */}
          <div
            className={cn(
              "min-w-0 transition-all duration-200 ease-out",
              isListExpanded ? "flex-1" : "w-[520px] flex-shrink-0",
            )}
          >
            <ROListPanel
              selectedROId={selectedRO?.id || null}
              onSelectRO={handleSelectRO}
              onAddNew={handleAddNew}
              onFilteredROsChange={setFilteredROs}
              compact={!isListExpanded}
            />
          </div>

          {/* Right Panel */}
          {!isListExpanded && (
          <div className="flex-1 min-w-0 relative">
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
              ) : (
                <motion.div
                  key="empty"
                  variants={panelVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full flex items-center justify-center bg-muted/10 absolute inset-0"
                >
                  <div className="text-center text-muted-foreground space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-tight text-foreground/70">
                        Select an RO or create a new one
                      </p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        Choose from the table on the left to get started
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}
        </div>
      )}

      <ProUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
      />
    </div>
  );
}
