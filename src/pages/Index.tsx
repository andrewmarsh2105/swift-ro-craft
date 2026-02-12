import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { OfflineStatusBar } from '@/components/shared/OfflineStatusBar';
import { BottomTabBar } from '@/components/mobile/BottomTabBar';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { ROsTab } from '@/components/tabs/ROsTab';
import { SummaryTab } from '@/components/tabs/SummaryTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { DesktopWorkspace } from '@/components/desktop/DesktopWorkspace';
import { useIsMobile } from '@/hooks/use-mobile';
import type { RepairOrder } from '@/types/ro';

function MobileApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ros' | 'summary' | 'settings'>('ros');

  const handleEditRO = (ro: RepairOrder) => {
    navigate('/add-ro', { state: { editingROId: ro.id } });
  };

  const handleAddRO = () => {
    navigate('/add-ro');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineStatusBar />
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'ros' && <ROsTab onEditRO={handleEditRO} />}
        {activeTab === 'summary' && <SummaryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Floating Action Button - only on ROs tab */}
      {activeTab === 'ros' && (
        <FloatingActionButton
          onClick={handleAddRO}
          icon={<Plus className="h-6 w-6" />}
          label="Quick Add"
        />
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

const Index = () => {
  const isMobile = useIsMobile();
  
  // Desktop: Use the full Xtime-style workspace
  if (!isMobile) {
    return <DesktopWorkspace />;
  }
  
  // Mobile: Use the tab-based app
  return <MobileApp />;
};

export default Index;
