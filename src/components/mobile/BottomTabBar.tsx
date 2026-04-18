import { cn } from '@/lib/utils';
import { mobileTabs, type MobileTabId } from '@/components/mobile/mobileTabs';

interface BottomTabBarProps {
  activeTab: MobileTabId;
  onTabChange: (tab: MobileTabId) => void;
}

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav className="tab-bar-pwa">
      <div className="flex h-full items-stretch px-1.5">
        {mobileTabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'tab-bar-item touch-feedback flex-1 gap-1',
                isActive ? 'tab-bar-item-active' : 'tab-bar-item-inactive'
              )}
            >
              {/* Active indicator — top line */}
              <div className="w-full flex justify-center -mt-0.5">
                <div className={cn(
                  'h-[2px] rounded-full quiet-transition',
                  isActive ? 'w-8 bg-primary' : 'w-0 bg-transparent'
                )} />
              </div>

              <Icon
                className="flex-shrink-0 h-[21px] w-[21px] transition-all duration-200"
                strokeWidth={isActive ? 2.5 : 1.75}
              />

              <span className={cn(
                'text-[10px] transition-all duration-200 leading-none pb-0.5',
                isActive ? 'font-bold opacity-100' : 'font-medium opacity-50'
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
