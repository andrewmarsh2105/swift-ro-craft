import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROListPanel } from './ROListPanel';
import { ROEditor } from './ROEditor';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { SummaryTab } from '@/components/tabs/SummaryTab';
import { FlagInbox } from '@/components/flags/FlagInbox';
import { OfflineStatusBar } from '@/components/shared/OfflineStatusBar';
import { FileText, Settings, BarChart3, X, Table2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RepairOrder } from '@/types/ro';
import { useRO } from '@/contexts/ROContext';
import { SpreadsheetView } from '@/components/shared/SpreadsheetView';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { toast } from 'sonner';

const panelVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] as const } },
};

type RightPanel = 'editor' | 'settings' | 'summary' | 'none';
type ViewMode = 'split' | 'spreadsheet';

export function DesktopWorkspace() {
  const { ros } = useRO();
  const { isPro } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [filteredROs, setFilteredROs] = useState<RepairOrder[]>(ros);

  const handleSelectRO = (ro: RepairOrder) => {
    setSelectedRO(ro);
    setIsAddingNew(false);
    setRightPanel('editor');
    setFocusLineId(null);
  };

  const handleSelectROWithFocus = (roId: string, lineId?: string | null) => {
    const ro = ros.find(r => r.id === roId);
    if (!ro) {
      toast.error('RO not found');
      return;
    }
    if (lineId) {
      const line = ro.lines?.find(l => l.id === lineId);
      if (!line) {
        toast.warning('Line not found — opening RO');
      }
    }
    setSelectedRO(ro);
    setIsAddingNew(false);
    setRightPanel('editor');
    setFocusLineId(lineId ?? null);
  };

  const handleAddNew = () => {
    setSelectedRO(null);
    setIsAddingNew(true);
    setRightPanel('editor');
  };

  const handleSave = () => {
    setSelectedRO(null);
    setIsAddingNew(false);
  };

  const handleCancel = () => {
    setSelectedRO(null);
    setIsAddingNew(false);
    setRightPanel('none');
  };

  const handleSaveAndAddAnother = () => {};

  const togglePanel = (panel: 'settings' | 'summary') => {
    if (rightPanel === panel) {
      setRightPanel('none');
    } else {
      setRightPanel(panel);
      setSelectedRO(null);
      setIsAddingNew(false);
    }
  };

  const showEditor = rightPanel === 'editor' && (selectedRO || isAddingNew);

  return (
    <div className="h-screen flex flex-col bg-background">
      <OfflineStatusBar />
      {/* Top Bar */}
      <div className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b border-border bg-card shadow-soft">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">RO Navigator</span>
        </div>
        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <FlagInbox onNavigateToRO={handleSelectROWithFocus} />
          {isPro && (
            <button
              onClick={() => {
                setViewMode(v => v === 'spreadsheet' ? 'split' : 'spreadsheet');
                if (viewMode === 'split') {
                  setSelectedRO(null);
                  setIsAddingNew(false);
                  setRightPanel('none');
                }
              }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'spreadsheet'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              title="Spreadsheet View"
            >
              <Table2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => togglePanel('summary')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              rightPanel === 'summary'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
            title="Summary & Reports"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => togglePanel('settings')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              rightPanel === 'settings'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
            title="Settings"
          >
            {rightPanel === 'settings' ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          </button>
          {!isPro && (
            <button
              onClick={() => setShowUpgradeDialog(true)}
              className="ml-1 px-2 py-1 rounded-md text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
              title="Upgrade to Pro"
            >
              <Crown className="h-3 w-3" />
              Pro
            </button>
          )}
        </div>
      </div>

      {viewMode === 'spreadsheet' ? (
        <div className="flex-1 min-h-0">
          <SpreadsheetView ros={filteredROs} onSelectRO={(ro) => {
            setViewMode('split');
            handleSelectRO(ro);
          }} />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - RO List */}
          <div className="w-80 flex-shrink-0">
            <ROListPanel
              selectedROId={selectedRO?.id || null}
              onSelectRO={handleSelectRO}
              onAddNew={handleAddNew}
              onFilteredROsChange={setFilteredROs}
            />
          </div>

          {/* Right Panel */}
          <div className="flex-1 min-w-0 relative">
            <AnimatePresence mode="wait">
              {rightPanel === 'settings' ? (
                <motion.div key="settings" variants={panelVariants} initial="initial" animate="animate" exit="exit" className="h-full overflow-y-auto absolute inset-0">
                  <SettingsTab />
                </motion.div>
              ) : rightPanel === 'summary' ? (
                <motion.div key="summary" variants={panelVariants} initial="initial" animate="animate" exit="exit" className="h-full overflow-y-auto absolute inset-0">
                  <SummaryTab />
                </motion.div>
              ) : showEditor ? (
                <motion.div key={`editor-${selectedRO?.id ?? 'new'}`} variants={panelVariants} initial="initial" animate="animate" exit="exit" className="h-full absolute inset-0">
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
                <motion.div key="empty" variants={panelVariants} initial="initial" animate="animate" exit="exit" className="h-full flex items-center justify-center bg-muted/10 absolute inset-0">
                  <div className="text-center text-muted-foreground space-y-5">
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center">
                      <FileText className="h-10 w-10 text-primary/20" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-foreground/70">Select an RO or create a new one</p>
                      <p className="text-sm mt-1 text-muted-foreground">Choose from the list on the left to get started</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
      <ProUpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
    </div>
  );
}
