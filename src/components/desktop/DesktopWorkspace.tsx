import { useState } from 'react';
import { ROListPanel } from './ROListPanel';
import { ROEditor } from './ROEditor';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { SummaryTab } from '@/components/tabs/SummaryTab';
import { FlagInbox } from '@/components/flags/FlagInbox';
import { OfflineStatusBar } from '@/components/shared/OfflineStatusBar';
import { FileText, Settings, BarChart3, X, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RepairOrder } from '@/types/ro';
import { useRO } from '@/contexts/ROContext';
import { SpreadsheetView } from '@/components/shared/SpreadsheetView';
import { toast } from 'sonner';

type RightPanel = 'editor' | 'settings' | 'summary' | 'none';
type ViewMode = 'split' | 'spreadsheet';

export function DesktopWorkspace() {
  const { ros } = useRO();
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');

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
      <div className="flex-shrink-0 h-10 flex items-center justify-end px-4 gap-1 border-b border-border bg-card">
        <FlagInbox onNavigateToRO={handleSelectROWithFocus} />
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
      </div>

      {viewMode === 'spreadsheet' ? (
        <div className="flex-1 min-h-0">
          <SpreadsheetView ros={ros} onSelectRO={(ro) => {
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
            />
          </div>

          {/* Right Panel */}
          <div className="flex-1 min-w-0">
            {rightPanel === 'settings' ? (
              <div className="h-full overflow-y-auto">
                <SettingsTab />
              </div>
            ) : rightPanel === 'summary' ? (
              <div className="h-full overflow-y-auto">
                <SummaryTab />
              </div>
            ) : showEditor ? (
              <ROEditor
                ro={selectedRO}
                isNew={isAddingNew}
                focusLineId={focusLineId}
                onSave={handleSave}
                onCancel={handleCancel}
                onSaveAndAddAnother={handleSaveAndAddAnother}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Select an RO or create a new one</p>
                  <p className="text-sm mt-1">Choose from the list on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
