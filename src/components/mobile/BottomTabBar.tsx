import { ReactNode } from 'react';
import { ClipboardList, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomTabBarProps {
  activeTab: 'ros' | 'summary' | 'settings';
  onTabChange: (tab: 'ros' | 'summary' | 'settings') => void;
}

const tabs = [
  { id: 'ros' as const, label: 'ROs', icon: ClipboardList },
  { id: 'summary' as const, label: 'Summary', icon: BarChart3 },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav className="tab-bar">
      <div className="flex h-full items-stretch">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'tab-bar-item touch-feedback',
              activeTab === id ? 'tab-bar-item-active' : 'tab-bar-item-inactive'
            )}
          >
            <Icon className="h-7 w-7 flex-shrink-0" strokeWidth={activeTab === id ? 2.4 : 1.8} />
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
