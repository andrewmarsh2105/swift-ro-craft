import { useState, useMemo, useCallback } from 'react';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { StatusPill } from '@/components/mobile/StatusPill';
import { ROActionMenu } from '@/components/shared/ROActionMenu';
import { FlagBadge } from '@/components/flags/FlagBadge';
import { ReviewIndicator } from '@/components/flags/ReviewIndicator';
import { AddFlagDialog } from '@/components/flags/AddFlagDialog';
import { toast } from 'sonner';
import type { RepairOrder, LaborType } from '@/types/ro';
import type { ReviewIssue, FlagType } from '@/types/flags';
import { cn } from '@/lib/utils';

interface ROListPanelProps {
  selectedROId: string | null;
  onSelectRO: (ro: RepairOrder) => void;
  onAddNew: () => void;
}

export function ROListPanel({ selectedROId, onSelectRO, onAddNew }: ROListPanelProps) {
  const { ros, deleteRO, duplicateRO } = useRO();
  const { getFlagsForRO, clearFlag, addFlag } = useFlagContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);

  const getReviewIssues = useCallback((ro: RepairOrder): ReviewIssue[] => {
    const issues: ReviewIssue[] = [];
    if (ro.lines?.length > 0) {
      ro.lines.forEach(line => {
        if (line.hoursPaid === 0 && line.description) {
          issues.push({ type: 'missing_hours', roId: ro.id, lineId: line.id, message: `L${line.lineNo}: "${line.description}" has 0 hours` });
        }
      });
    }
    const dupes = ros.filter(r => r.id !== ro.id && r.roNumber === ro.roNumber && ro.roNumber !== '');
    if (dupes.length > 0) {
      issues.push({ type: 'duplicate_ro', roId: ro.id, message: `RO #${ro.roNumber} appears ${dupes.length + 1} times` });
    }
    return issues;
  }, [ros]);

  const filteredROs = useMemo(() => {
    let result = ros;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (ro) =>
          ro.roNumber.toLowerCase().includes(query) ||
          ro.advisor.toLowerCase().includes(query) ||
          ro.workPerformed.toLowerCase().includes(query)
      );
    }

    // Date range filter
    const today = new Date().toISOString().split('T')[0];
    if (dateFilter === 'today') {
      result = result.filter((ro) => ro.date === today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((ro) => ro.date >= weekAgo.toISOString().split('T')[0]);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter((ro) => ro.date >= monthAgo.toISOString().split('T')[0]);
    }

    return result;
  }, [ros, searchQuery, dateFilter]);

  // Group ROs by date
  const groupedROs = useMemo(() => {
    const groups: { [date: string]: RepairOrder[] } = {};
    filteredROs.forEach((ro) => {
      if (!groups[ro.date]) {
        groups[ro.date] = [];
      }
      groups[ro.date].push(ro);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredROs]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ROs..."
            className="w-full h-9 pl-9 pr-4 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

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
              {filter}
            </button>
          ))}
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
                  ? ro.lines.reduce((sum, line) => sum + line.hoursPaid, 0)
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
                          const issues = getReviewIssues(ro);
                          return issues.length > 0 ? (
                            <ReviewIndicator
                              issues={issues}
                              onConvertToFlag={(issue, flagType, note) => addFlag(issue.roId, flagType, note || issue.message, issue.lineId)}
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
      </div>

      {/* Footer Summary */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{filteredROs.length} ROs</span>
          <span className="font-semibold">
            {filteredROs.reduce((sum, ro) => {
              const hours = ro.lines?.length
                ? ro.lines.reduce((s, l) => s + l.hoursPaid, 0)
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
