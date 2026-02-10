import { useState } from 'react';
import { ROListPanel } from './ROListPanel';
import { ROEditor } from './ROEditor';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { FileText, Settings, X } from 'lucide-react';
import type { RepairOrder } from '@/types/ro';

export function DesktopWorkspace() {
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSelectRO = (ro: RepairOrder) => {
    setSelectedRO(ro);
    setIsAddingNew(false);
    setShowSettings(false);
  };

  const handleAddNew = () => {
    setSelectedRO(null);
    setIsAddingNew(true);
    setShowSettings(false);
  };

  const handleSave = () => {
    setSelectedRO(null);
    setIsAddingNew(false);
  };

  const handleCancel = () => {
    setSelectedRO(null);
    setIsAddingNew(false);
  };

  const handleSaveAndAddAnother = () => {
    // Keep isAddingNew true, just reset the form (handled in ROEditor)
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar with Settings gear */}
      <div className="flex-shrink-0 h-10 flex items-center justify-end px-4 border-b border-border bg-card">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Settings"
        >
          {showSettings ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Panel - RO List */}
        <div className="w-80 flex-shrink-0">
          <ROListPanel
            selectedROId={selectedRO?.id || null}
            onSelectRO={handleSelectRO}
            onAddNew={handleAddNew}
          />
        </div>

        {/* Right Panel - Editor or Settings */}
        <div className="flex-1 min-w-0">
          {showSettings ? (
            <div className="h-full overflow-y-auto">
              <SettingsTab />
            </div>
          ) : selectedRO || isAddingNew ? (
            <ROEditor
              ro={selectedRO}
              isNew={isAddingNew}
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
    </div>
  );
}
