import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Check } from 'lucide-react';
import { useFlagContext } from '@/contexts/FlagContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useROSafe } from '@/contexts/ROContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { FlagType } from '@/types/flags';
import { FLAG_TYPE_LABELS, FLAG_TYPE_COLORS, FLAG_TYPE_BG } from '@/types/flags';

const FLAG_OPTIONS: FlagType[] = ['needs_time', 'questionable', 'waiting', 'advisor_question', 'other'];
const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'all', label: 'All' },
];

export function FlagInbox() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { flags, clearFlag, activeCount, refetch } = useFlagContext();
  const roContext = useROSafe();
  const ros = roContext?.ros ?? [];
  const [typeFilter, setTypeFilter] = useState<FlagType | 'all'>('all');
  const [dateRange, setDateRange] = useState<string>('this_week');

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  const handleOpen = () => {
    if (isMobile) {
      navigate('/flag-inbox');
    } else {
      setOpen(true);
    }
  };

  const filteredFlags = (() => {
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
  })();

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

  const desktopContent = (
    <div>
      {/* Filters */}
      <div className="px-4 py-3 border-b border-border space-y-3">
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

      {/* Flag List */}
      <div>
        {filteredFlags.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Flag className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No flags</p>
            <p className="text-sm mt-1">Flagged items will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredFlags.map((flag) => {
              const lineDesc = getLineDesc(flag.roId, flag.roLineId);
              return (
                <div key={flag.id} className="px-4 py-3 flex items-start gap-3">
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
                    {flag.note && (
                      <p className="text-xs text-foreground/80 mt-0.5">"{flag.note}"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(flag.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => clearFlag(flag.id)}
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

  return (
    <>
      {/* Inbox Trigger Button */}
      <button
        onClick={handleOpen}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          activeCount > 0 && 'text-orange-500'
        )}
        title="Flag Inbox"
      >
        <Flag className="h-5 w-5" />
        {activeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}
      </button>

      {/* Desktop Dialog only */}
      {!isMobile && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[70vh] flex flex-col rounded-2xl p-0 overflow-hidden">
            <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Flag Inbox
                {activeCount > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({activeCount} active)</span>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-auto">
              {desktopContent}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
