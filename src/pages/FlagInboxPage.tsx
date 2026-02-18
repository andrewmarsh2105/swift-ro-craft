import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useFlagContext } from '@/contexts/FlagContext';
import { useROSafe } from '@/contexts/ROContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FlagType } from '@/types/flags';
import { FLAG_TYPE_LABELS, FLAG_TYPE_COLORS, FLAG_TYPE_BG } from '@/types/flags';

const FLAG_OPTIONS: FlagType[] = ['needs_time', 'questionable', 'waiting', 'advisor_question', 'other'];
const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'all', label: 'All' },
];

export default function FlagInboxPage() {
  const navigate = useNavigate();
  const { flags, clearFlag, activeCount, loading, refetch } = useFlagContext();
  const roContext = useROSafe();
  const ros = roContext?.ros ?? [];
  const [typeFilter, setTypeFilter] = useState<FlagType | 'all'>('all');
  const [dateRange, setDateRange] = useState<string>('this_week');

  // Fresh fetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  const filteredFlags = useMemo(() => {
    let result = flags;

    if (typeFilter !== 'all') {
      result = result.filter(f => f.flagType === typeFilter);
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (dateRange === 'today') {
      result = result.filter(f => f.createdAt.split('T')[0] === today);
    } else if (dateRange === 'this_week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter(f => new Date(f.createdAt) >= weekAgo);
    } else if (dateRange === 'this_month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter(f => new Date(f.createdAt) >= monthAgo);
    }

    return result;
  }, [flags, typeFilter, dateRange]);

  const getRoNumber = (roId: string) => {
    const ro = ros.find(r => r.id === roId);
    return ro ? `#${ro.roNumber}` : '—';
  };

  const getLineDesc = (roId: string, lineId?: string | null) => {
    if (!lineId) return null;
    const ro = ros.find(r => r.id === roId);
    const line = ro?.lines?.find(l => l.id === lineId);
    return line ? `L${line.lineNo}: ${line.description || '—'}` : null;
  };

  const handleFlagTap = (roId: string, roLineId?: string | null) => {
    const ro = ros.find(r => r.id === roId);
    if (!ro) {
      toast.error('RO not found');
      return;
    }
    if (roLineId) {
      const line = ro.lines?.find(l => l.id === roLineId);
      if (!line) {
        toast.warning('Line not found — opening RO');
        navigate('/add-ro', { state: { editingROId: roId } });
        return;
      }
      navigate('/add-ro', { state: { editingROId: roId, focusLineId: roLineId } });
    } else {
      navigate('/add-ro', { state: { editingROId: roId } });
    }
  };

  return (
    <div
      className="flex flex-col h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Sticky Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Flag Inbox</h1>
        {activeCount > 0 && (
          <span className="text-xs text-muted-foreground">{activeCount} active</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border space-y-3">
        {/* Date Range */}
        <div className="flex gap-1.5">
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.value}
              onClick={() => setDateRange(dr.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                dateRange === dr.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {dr.label}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              'px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors flex-shrink-0',
              typeFilter === 'all'
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground'
            )}
          >
            All ({flags.length})
          </button>
          {FLAG_OPTIONS.map((type) => {
            const count = flags.filter(f => f.flagType === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors flex-shrink-0',
                  typeFilter === type
                    ? cn(FLAG_TYPE_BG[type], FLAG_TYPE_COLORS[type])
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {FLAG_TYPE_LABELS[type]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Flag className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No flags</p>
            <p className="text-sm mt-1">
              {flags.length === 0
                ? 'Flagged items will appear here'
                : 'No flags match current filters'}
            </p>
            {flags.length > 0 && typeFilter !== 'all' && (
              <button
                onClick={() => { setTypeFilter('all'); setDateRange('all'); }}
                className="mt-3 text-xs text-primary font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredFlags.map((flag) => {
              const lineDesc = getLineDesc(flag.roId, flag.roLineId);
              return (
                <div
                  key={flag.id}
                  className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                  onClick={() => handleFlagTap(flag.roId, flag.roLineId)}
                >
                  <Flag className={cn('h-4 w-4 mt-0.5 flex-shrink-0', FLAG_TYPE_COLORS[flag.flagType])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', FLAG_TYPE_BG[flag.flagType], FLAG_TYPE_COLORS[flag.flagType])}>
                        {FLAG_TYPE_LABELS[flag.flagType]}
                      </span>
                      <span className="text-sm font-semibold">{getRoNumber(flag.roId)}</span>
                    </div>
                    {lineDesc && (
                      <p className="text-xs text-muted-foreground truncate">{lineDesc}</p>
                    )}
                    {!flag.roLineId && (
                      <p className="text-xs text-muted-foreground">RO-level flag</p>
                    )}
                    {flag.note && (
                      <p className="text-xs text-foreground/80 mt-0.5">"{flag.note}"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(flag.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFlag(flag.id); }}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    title="Clear flag"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
