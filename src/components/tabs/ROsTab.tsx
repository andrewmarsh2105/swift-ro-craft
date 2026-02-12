import { useState, useMemo, useCallback } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
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
    ? ro.lines.reduce((sum, line) => sum + line.hoursPaid, 0)
    : ro.paidHours;

  return (
    <div className="card-mobile p-4 rounded-xl">
      <div className="flex items-start gap-3">
        {/* Tappable content area */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetails}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg">#{ro.roNumber}</span>
            {hasLines && (
              <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
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
          <div className="text-sm text-muted-foreground mb-1">
            {formattedDate} • {ro.advisor}
          </div>
          <div className="text-sm text-foreground/80 truncate">
            {hasLines 
              ? ro.lines.map(l => l.description).filter(Boolean).join(', ') || ro.workPerformed
              : ro.workPerformed
            }
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-primary">
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

export function ROsTab({ onEditRO }: ROsTabProps) {
  const { ros, settings, deleteRO, duplicateRO } = useRO();
  const { getFlagsForRO, clearFlag, addFlag } = useFlagContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRO, setSelectedRO] = useState<RepairOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    advisors: [],
    laborTypes: [],
    dateRange: 'all',
  });

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
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
      result = result.filter((ro) => ro.date >= weekAgoStr);
    } else if (filters.dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`;
      result = result.filter((ro) => ro.date >= monthAgoStr);
    }

    return result;
  }, [ros, searchQuery, filters]);

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
          <FlagInbox />
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
      </div>

      {/* RO List */}
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
                { value: 'week', label: 'Week' },
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
