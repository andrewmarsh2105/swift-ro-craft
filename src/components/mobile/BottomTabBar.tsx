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
    <nav className="tab-bar-pwa">
      <div className="flex h-full items-stretch">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'tab-bar-item touch-feedback',
                isActive ? 'tab-bar-item-active' : 'tab-bar-item-inactive'
              )}
            >
              <Icon
                className={cn('flex-shrink-0 transition-all duration-200', isActive ? 'h-[26px] w-[26px]' : 'h-6 w-6')}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={cn('text-[11px] font-semibold transition-all duration-200', isActive ? 'opacity-100' : 'opacity-70')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
