import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { BottomTabBar } from '@/components/mobile/BottomTabBar';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { ROsTab } from '@/components/tabs/ROsTab';
import { SummaryTab } from '@/components/tabs/SummaryTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import type { RepairOrder } from '@/types/ro';

function ROTrackerApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ros' | 'summary' | 'settings'>('ros');

  const handleEditRO = (ro: RepairOrder) => {
    navigate('/add-ro', { state: { editingROId: ro.id } });
  };

  const handleAddRO = () => {
    navigate('/add-ro');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content Area */}
      <main className="h-[calc(100vh-var(--tab-bar-height)-var(--safe-area-inset-bottom))]">
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
  return <ROTrackerApp />;
};

export default Index;
