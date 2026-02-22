import { useState, useMemo, useCallback } from 'react';
import { Search, SlidersHorizontal, Filter, Table2, LayoutList } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { StatusPill } from '@/components/mobile/StatusPill';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { Chip, ChipGroup } from '@/components/mobile/Chip';
import { RODetailSheet } from '@/components/sheets/RODetailSheet';
import { ROActionMenu } from '@/components/shared/ROActionMenu';
import { FlagBadge } from '@/components/flags/FlagBadge';
import { FlagInbox } from '@/components/flags/FlagInbox';
import { ReviewIndicator } from '@/components/flags/ReviewIndicator';
import { AddFlagDialog } from '@/components/flags/AddFlagDialog';
import { SpreadsheetView } from '@/components/shared/SpreadsheetView';
import { toast } from 'sonner';
import type { LaborType, RepairOrder } from '@/types/ro';
import type { FlagType } from '@/types/flags';
import type { ReviewIssue } from '@/lib/reviewRules';
import { getReviewIssues } from '@/lib/reviewRules';

interface ROCardProps {
  ro: RepairOrder;
  onEdit: () => void;
  onDuplicate: (newRONumber: string) => void;
  onDelete: () => void;
  onFlag: () => void;
  onViewDetails: () => void;
  flags: import('@/types/flags').ROFlag[];
  onClearFlag: (flagId: string) => void;
  reviewIssues: ReviewIssue[];
  onConvertToFlag: (issue: ReviewIssue, flagType: FlagType, note?: string) => void;
  existingRONumbers: string[];
}

function ROCard({ ro, onEdit, onDuplicate, onDelete, onFlag, onViewDetails, flags, onClearFlag, reviewIssues, onConvertToFlag, existingRONumbers }: ROCardProps) {
  const formattedDate = new Date(ro.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const hasLines = ro.lines && ro.lines.length > 0;
  const totalHours = hasLines 
    ? ro.lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0)
    : ro.paidHours;

  return (
    <div className="card-mobile p-4 rounded-xl group hover:shadow-raised transition-shadow duration-200">
      <div className="flex items-start gap-3">
        {/* Tappable content area */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetails}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[17px] font-bold tracking-tight">#{ro.roNumber}</span>
            {hasLines && (
              <span className="text-[11px] font-medium text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded-md">
                {ro.lines.length} lines
              </span>
            )}
            <FlagBadge flags={flags} onClear={onClearFlag} />
            {reviewIssues.length > 0 && (
              <ReviewIndicator
                issues={reviewIssues}
                onConvertToFlag={onConvertToFlag}
              />
            )}
          </div>
          <div className="text-[13px] text-muted-foreground mb-1 font-medium">
            {formattedDate} · {ro.advisor}
          </div>
          <div className="text-[13px] text-foreground/70 truncate">
            {hasLines 
              ? ro.lines.map(l => l.description).filter(Boolean).join(', ') || ro.workPerformed
              : ro.workPerformed
            }
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Hours — primary "pop" element */}
            <span className="hours-pill text-base tabular-nums">
              {totalHours.toFixed(1)}h
            </span>
            <ROActionMenu
              roNumber={ro.roNumber}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onFlag={onFlag}
              existingRONumbers={existingRONumbers}
            />
          </div>
          <StatusPill type={ro.laborType} />
        </div>
      </div>
    </div>
  );
}

interface FilterState {
  advisors: string[];
  laborTypes: LaborType[];
  dateRange: 'all' | 'today' | 'week' | 'month';
}

interface ROsTabProps {
  onEditRO: (ro: RepairOrder) => void;
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

export function ROsTab({ onEditRO }: ROsTabProps) {
  const { ros, settings, deleteRO, duplicateRO } = useRO();
  const { isPro } = useSubscription();
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);
  const [searchScopes, setSearchScopes] = useState<Set<string>>(new Set(['ro', 'vehicle', 'advisor', 'work']));
  const [showScopes, setShowScopes] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'spreadsheet'>('cards');
  const [filters, setFilters] = useState<FilterState>({
    advisors: [],
    laborTypes: [],
    dateRange: 'all',
  });

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

    // Advisor filter
    if (filters.advisors.length > 0) {
      result = result.filter((ro) => filters.advisors.includes(ro.advisor));
    }

    // Labor type filter
    if (filters.laborTypes.length > 0) {
      result = result.filter((ro) => filters.laborTypes.includes(ro.laborType));
    }

    // Date range filter
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (filters.dateRange === 'today') {
      result = result.filter((ro) => ro.date === today);
    } else if (filters.dateRange === 'week') {
      const useTwoWeeks = userSettings.defaultSummaryRange === 'two_weeks';
      const weekStart = useTwoWeeks
        ? getTwoWeekStart(userSettings.weekStartDay ?? 0)
        : getWeekStart(userSettings.weekStartDay ?? 0);
      result = result.filter((ro) => ro.date >= weekStart);
    } else if (filters.dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`;
      result = result.filter((ro) => ro.date >= monthAgoStr);
    }

    return result;
  }, [ros, searchQuery, filters, searchScopes]);

  const handleConvertToFlag = useCallback((issue: ReviewIssue, flagType: FlagType, note?: string) => {
    addFlag(issue.roId, flagType, note || issue.detail, issue.lineId);
  }, [addFlag]);

  const uniqueAdvisors = useMemo(() => {
    return [...new Set(ros.map((ro) => ro.advisor))];
  }, [ros]);

  const activeFiltersCount = 
    filters.advisors.length + 
    filters.laborTypes.length + 
    (filters.dateRange !== 'all' ? 1 : 0);

  const toggleAdvisorFilter = (advisor: string) => {
    setFilters((prev) => ({
      ...prev,
      advisors: prev.advisors.includes(advisor)
        ? prev.advisors.filter((a) => a !== advisor)
        : [...prev.advisors, advisor],
    }));
  };

  const toggleLaborTypeFilter = (type: LaborType) => {
    setFilters((prev) => ({
      ...prev,
      laborTypes: prev.laborTypes.includes(type)
        ? prev.laborTypes.filter((t) => t !== type)
        : [...prev.laborTypes, type],
    }));
  };

  const clearFilters = () => {
    setFilters({
      advisors: [],
      laborTypes: [],
      dateRange: 'all',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ROs..."
              className="w-full h-11 pl-10 pr-4 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowScopes(s => !s)}
            className={`h-11 w-11 flex items-center justify-center rounded-xl transition-colors ${
              showScopes || searchScopes.size < 4
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            <Filter className="h-5 w-5" />
          </button>
          <FlagInbox />
          {isPro && (
            <button
              onClick={() => setViewMode(v => v === 'cards' ? 'spreadsheet' : 'cards')}
              className={`h-11 w-11 flex items-center justify-center rounded-xl transition-colors ${
                viewMode === 'spreadsheet'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
              title={viewMode === 'spreadsheet' ? 'Card View' : 'Spreadsheet View'}
            >
              {viewMode === 'spreadsheet' ? <LayoutList className="h-5 w-5" /> : <Table2 className="h-5 w-5" />}
            </button>
          )}
          <button
            onClick={() => setShowFilters(true)}
            className="h-11 px-4 bg-secondary rounded-xl flex items-center gap-2 tap-target touch-feedback relative"
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
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
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  searchScopes.has(key)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RO List or Spreadsheet */}
      {viewMode === 'spreadsheet' ? (
        <div className="flex-1 overflow-hidden">
          <SpreadsheetView
            ros={filteredROs}
            onSelectRO={(ro) => {
              setSelectedRO(ro);
              setShowDetail(true);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
          {filteredROs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No ROs found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredROs.map((ro) => (
              <ROCard
                key={ro.id}
                ro={ro}
                flags={getFlagsForRO(ro.id)}
                onClearFlag={clearFlag}
                reviewIssues={getReviewIssues(ro, ros)}
                onConvertToFlag={handleConvertToFlag}
                onEdit={() => onEditRO(ro)}
                onFlag={() => setFlaggingRO(ro)}
                onDuplicate={(newRONumber) => {
                  duplicateRO(ro.id, newRONumber);
                  toast.success(`Duplicated RO #${ro.roNumber} → #${newRONumber}`);
                }}
                onDelete={() => {
                  deleteRO(ro.id);
                  toast.success(`Deleted RO #${ro.roNumber}`);
                }}
                onViewDetails={() => {
                  setSelectedRO(ro);
                  setShowDetail(true);
                }}
                existingRONumbers={ros.map(r => r.roNumber)}
              />
            ))
          )}
        </div>
      )}

      {/* RO Detail Sheet */}
      <RODetailSheet
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        ro={selectedRO}
        onEdit={() => {
          setShowDetail(false);
          if (selectedRO) onEditRO(selectedRO);
        }}
        onDuplicate={(newRONumber) => {
          if (selectedRO) {
            duplicateRO(selectedRO.id, newRONumber);
            toast.success(`Duplicated RO #${selectedRO.roNumber} → #${newRONumber}`);
          }
          setShowDetail(false);
        }}
        existingRONumbers={ros.map(r => r.roNumber)}
        onDelete={() => {
          if (selectedRO) deleteRO(selectedRO.id);
          setShowDetail(false);
        }}
      />

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
      >
        <div className="p-4 space-y-6">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Date Range
            </label>
            <SegmentedControl
              options={[
                { value: 'all', label: 'All' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: userSettings.defaultSummaryRange === 'two_weeks' ? '2 Weeks' : '1 Week' },
                { value: 'month', label: 'Month' },
              ]}
              value={filters.dateRange}
              onChange={(value) => setFilters((prev) => ({ ...prev, dateRange: value }))}
            />
          </div>

          {/* Labor Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Labor Type
            </label>
            <div className="flex flex-wrap gap-2">
              {(['warranty', 'customer-pay', 'internal'] as LaborType[]).map((type) => (
                <Chip
                  key={type}
                  label={type === 'warranty' ? 'Warranty' : type === 'customer-pay' ? 'Customer Pay' : 'Internal'}
                  selected={filters.laborTypes.includes(type)}
                  onSelect={() => toggleLaborTypeFilter(type)}
                />
              ))}
            </div>
          </div>

          {/* Advisors */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Advisor
            </label>
            <div className="flex flex-wrap gap-2">
              {uniqueAdvisors.map((advisor) => (
                <Chip
                  key={advisor}
                  label={advisor}
                  selected={filters.advisors.includes(advisor)}
                  onSelect={() => toggleAdvisorFilter(advisor)}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={clearFilters}
              className="flex-1 py-3 bg-secondary rounded-xl font-medium tap-target touch-feedback"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold tap-target touch-feedback"
            >
              Apply
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Add Flag Dialog */}
      <AddFlagDialog
        open={!!flaggingRO}
        onClose={() => setFlaggingRO(null)}
        onSubmit={(flagType, note) => {
          if (flaggingRO) addFlag(flaggingRO.id, flagType, note);
        }}
        title={flaggingRO ? `Flag RO #${flaggingRO.roNumber}` : 'Add Flag'}
      />
    </div>
  );
}
