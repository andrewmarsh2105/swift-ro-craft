import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { Search, SlidersHorizontal, Plus, Filter } from 'lucide-react';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { StatusPill } from '@/components/mobile/StatusPill';
import { ROActionMenu } from '@/components/shared/ROActionMenu';
import { FlagBadge } from '@/components/flags/FlagBadge';
import { ReviewIndicator } from '@/components/flags/ReviewIndicator';
import { AddFlagDialog } from '@/components/flags/AddFlagDialog';
import { toast } from 'sonner';
import type { RepairOrder, LaborType } from '@/types/ro';
import type { FlagType } from '@/types/flags';
import type { ReviewIssue } from '@/lib/reviewRules';
import { getReviewIssues } from '@/lib/reviewRules';
import { cn } from '@/lib/utils';
import { getCustomPayPeriodRange } from '@/lib/payPeriodUtils';

interface ROListPanelProps {
  selectedROId: string | null;
  onSelectRO: (ro: RepairOrder) => void;
  onAddNew: () => void;
  onFilteredROsChange?: (ros: RepairOrder[]) => void;
}

function getWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
}

function getTwoWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff - 7);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
}

export function ROListPanel({ selectedROId, onSelectRO, onAddNew, onFilteredROsChange }: ROListPanelProps) {
  const { ros, deleteRO, duplicateRO } = useRO();
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'pay_period'>('all');

  const hasCustomPayPeriod = userSettings.payPeriodType === 'custom' && 
    Array.isArray(userSettings.payPeriodEndDates) && 
    userSettings.payPeriodEndDates.length > 0;
  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);
  const [searchScopes, setSearchScopes] = useState<Set<string>>(new Set(['ro', 'vehicle', 'advisor', 'work']));
  const [showScopes, setShowScopes] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  const toggleScope = useCallback((scope: string) => {
    setSearchScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) {
        if (next.size > 1) next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  }, []);


  const filteredROs = useMemo(() => {
    let result = ros;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((ro) => {
        const vehicleStr = [
          ro.vehicle?.year?.toString(),
          ro.vehicle?.make,
          ro.vehicle?.model,
          ro.vehicle?.trim,
        ].filter(Boolean).join(' ').toLowerCase();
        return (
          (searchScopes.has('ro') && ro.roNumber.toLowerCase().includes(query)) ||
          (searchScopes.has('advisor') && ro.advisor.toLowerCase().includes(query)) ||
          (searchScopes.has('work') && ro.workPerformed.toLowerCase().includes(query)) ||
          (searchScopes.has('work') && (ro.customerName || '').toLowerCase().includes(query)) ||
          (searchScopes.has('vehicle') && vehicleStr.includes(query))
        );
      });
    }

    // Date range filter
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (dateFilter === 'today') {
      result = result.filter((ro) => ro.date === today);
    } else if (dateFilter === 'week') {
      const useTwoWeeks = userSettings.defaultSummaryRange === 'two_weeks';
      const weekStart = useTwoWeeks
        ? getTwoWeekStart(userSettings.weekStartDay ?? 0)
        : getWeekStart(userSettings.weekStartDay ?? 0);
      result = result.filter((ro) => ro.date >= weekStart);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`;
      result = result.filter((ro) => ro.date >= monthAgoStr);
    } else if (dateFilter === 'pay_period' && hasCustomPayPeriod) {
      const { start, end } = getCustomPayPeriodRange(userSettings.payPeriodEndDates!, new Date());
      result = result.filter((ro) => {
        const effectiveDate = ro.paidDate || ro.date;
        return effectiveDate >= start && effectiveDate <= end;
      });
    }

    return result;
  }, [ros, searchQuery, dateFilter, searchScopes]);

  useEffect(() => {
    onFilteredROsChange?.(filteredROs);
  }, [filteredROs, onFilteredROsChange]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, dateFilter, searchScopes]);

  // Group ROs by date, then slice to visibleCount
  const { groupedROs, totalVisible, hasMore } = useMemo(() => {
    const groups: { [date: string]: RepairOrder[] } = {};
    filteredROs.forEach((ro) => {
      if (!groups[ro.date]) {
        groups[ro.date] = [];
      }
      groups[ro.date].push(ro);
    });
    const sorted = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    
    // Slice to visibleCount across groups
    let count = 0;
    const sliced: [string, RepairOrder[]][] = [];
    for (const [date, dateROs] of sorted) {
      if (count >= visibleCount) break;
      const remaining = visibleCount - count;
      const take = dateROs.slice(0, remaining);
      sliced.push([date, take]);
      count += take.length;
    }
    return { groupedROs: sliced, totalVisible: count, hasMore: count < filteredROs.length };
  }, [filteredROs, visibleCount]);

  const formatDate = (dateStr: string) => {
    const now = new Date();
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    }
    // Parse as local date (YYYY-MM-DD) to avoid UTC shift
    const [y, m, d] = dateStr.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    return localDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <>
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Repair Orders</h2>
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add RO
          </button>
        </div>
        
        {/* Search */}
        <div className="relative flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ROs..."
              className="w-full h-9 pl-9 pr-4 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowScopes(s => !s)}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-lg transition-colors',
              showScopes || searchScopes.size < 4
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            title="Search filters"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {/* Search Scope Chips */}
        {showScopes && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {([
              { key: 'ro', label: 'RO #' },
              { key: 'vehicle', label: 'Vehicle' },
              { key: 'advisor', label: 'Advisor' },
              { key: 'work', label: 'Work Lines' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleScope(key)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  searchScopes.has(key)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Date Filter Tabs */}
        <div className="flex gap-1 mt-3">
          {(['all', 'today', 'week', 'month'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize',
                dateFilter === filter
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {filter === 'week'
                ? (userSettings.defaultSummaryRange === 'two_weeks' ? '2 Weeks' : '1 Week')
                : filter}
            </button>
          ))}
          {hasCustomPayPeriod && (
            <button
              onClick={() => setDateFilter('pay_period')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                dateFilter === 'pay_period'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              Pay Period
            </button>
          )}
        </div>
      </div>

      {/* RO List */}
      <div className="flex-1 overflow-y-auto">
        {groupedROs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="font-medium">No ROs found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          groupedROs.map(([date, dateROs]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="sticky top-0 px-4 py-2 bg-muted/50 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase">
                {formatDate(date)}
              </div>

              {/* RO Items */}
              {dateROs.map((ro) => {
                const hasLines = ro.lines && ro.lines.length > 0;
                const totalHours = hasLines
                  ? ro.lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0)
                  : ro.paidHours;

                return (
                  <div
                    key={ro.id}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 border-b border-border/50 hover:bg-muted/30 transition-colors',
                      selectedROId === ro.id && 'bg-primary/5 border-l-2 border-l-primary'
                    )}
                  >
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onSelectRO(ro)}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">#{ro.roNumber}</span>
                        <StatusPill type={ro.laborType} size="sm" />
                        <FlagBadge flags={getFlagsForRO(ro.id)} onClear={clearFlag} />
                        {(() => {
                          const issues = getReviewIssues(ro, ros);
                          return issues.length > 0 ? (
                            <ReviewIndicator
                              issues={issues}
                              onConvertToFlag={(issue, flagType, note) => addFlag(issue.roId, flagType, note || issue.detail, issue.lineId)}
                            />
                          ) : null;
                        })()}
                        {hasLines && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {ro.lines.length} lines
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {ro.advisor} • {hasLines
                          ? ro.lines.map(l => l.description).filter(Boolean).slice(0, 2).join(', ')
                          : ro.workPerformed
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-lg font-bold text-primary">{totalHours.toFixed(1)}h</span>
                      <ROActionMenu
                        roNumber={ro.roNumber}
                        onEdit={() => onSelectRO(ro)}
                        onDuplicate={(newRONumber) => {
                          duplicateRO(ro.id, newRONumber);
                          toast.success(`Duplicated RO #${ro.roNumber} → #${newRONumber}`);
                        }}
                        onDelete={() => {
                          deleteRO(ro.id);
                          toast.success(`Deleted RO #${ro.roNumber}`);
                        }}
                        onFlag={() => setFlaggingRO(ro)}
                        existingRONumbers={ros.map(r => r.roNumber)}
                        className="-mr-2"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        {hasMore && (
          <div className="px-4 py-3 text-center border-b border-border/50">
            <button
              onClick={() => setVisibleCount(c => c + 50)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Show more ({filteredROs.length - totalVisible} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {filteredROs.length} ROs{hasMore ? ` (showing ${totalVisible})` : ''}
          </span>
          <span className="font-semibold">
            {filteredROs.reduce((sum, ro) => {
              const hours = ro.lines?.length
                ? ro.lines.filter(l => !l.isTbd).reduce((s, l) => s + l.hoursPaid, 0)
                : ro.paidHours;
              return sum + hours;
            }, 0).toFixed(1)}h total
          </span>
        </div>
      </div>
    </div>

    {/* Add Flag Dialog */}
    <AddFlagDialog
      open={!!flaggingRO}
      onClose={() => setFlaggingRO(null)}
      onSubmit={(flagType, note) => {
        if (flaggingRO) addFlag(flaggingRO.id, flagType, note);
      }}
      title={flaggingRO ? `Flag RO #${flaggingRO.roNumber}` : 'Add Flag'}
    />
    </>
  );
}
