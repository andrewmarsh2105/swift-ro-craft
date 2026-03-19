import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Check, Clock, Trash2 } from 'lucide-react';
import { useFlagContext } from '@/contexts/FlagContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useROSafe } from '@/contexts/ROContext';
import { useRO } from '@/contexts/ROContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { FlagType } from '@/types/flags';
import type { LaborType } from '@/types/ro';
import { FLAG_TYPE_LABELS, FLAG_TYPE_COLORS, FLAG_TYPE_BG } from '@/types/flags';
import { StatusPill } from '@/components/mobile/StatusPill';

const FLAG_OPTIONS: FlagType[] = ['needs_time', 'questionable', 'waiting', 'advisor_question', 'other'];
const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'all', label: 'All' },
];

interface TbdItem {
  roId: string;
  roNumber: string;
  lineId: string;
  lineNo: number;
  description: string;
  laborType?: LaborType;
}

interface FlagInboxProps {
  onNavigateToRO?: (roId: string, lineId?: string | null) => void;
}

export function FlagInbox({ onNavigateToRO }: FlagInboxProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { flags, clearFlag, clearFlagsBulk, activeCount, refetch } = useFlagContext();
  const roContext = useROSafe();
  const ros = useMemo(() => roContext?.ros ?? [], [roContext?.ros]);
  const clearAllTbdLines = roContext?.clearAllTbdLines;
  const [typeFilter, setTypeFilter] = useState<FlagType | 'all' | 'tbd'>('all');
  const [dateRange, setDateRange] = useState<string>('this_week');
  const [confirmClearTbd, setConfirmClearTbd] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  const tbdItems = useMemo<TbdItem[]>(() => {
    const items: TbdItem[] = [];
    for (const ro of ros) {
      for (const line of ro.lines ?? []) {
        if (line.isTbd) {
          items.push({
            roId: ro.id,
            roNumber: ro.roNumber,
            lineId: line.id,
            lineNo: line.lineNo,
            description: line.description || '—',
            laborType: line.laborType,
          });
        }
      }
    }
    return items;
  }, [ros]);

  const handleOpen = () => {
    if (isMobile) {
      navigate('/flag-inbox');
    } else {
      setOpen(true);
    }
  };

  const handleFlagClick = (roId: string, roLineId?: string | null) => {
    if (onNavigateToRO) {
      setOpen(false);
      onNavigateToRO(roId, roLineId);
    }
  };

  const filteredFlags = (() => {
    if (typeFilter === 'tbd') return [];
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

  const isTbdActive = typeFilter === 'tbd';

  // Badge reflects the active date-filter so the number on the icon matches the inbox
  const badgeFlags = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (dateRange === 'today') return flags.filter(f => f.createdAt.split('T')[0] === today);
    if (dateRange === 'this_week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      return flags.filter(f => new Date(f.createdAt) >= weekAgo);
    }
    if (dateRange === 'this_month') {
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
      return flags.filter(f => new Date(f.createdAt) >= monthAgo);
    }
    return flags;
  }, [flags, dateRange]);
  const totalBadge = badgeFlags.length + tbdItems.length;

  const desktopContent = (
    <div>
      {/* Filters */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        {!isTbdActive && (
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
        )}
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
            Flags ({flags.length})
          </button>
          {tbdItems.length > 0 && (
            <button
              onClick={() => setTypeFilter('tbd')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors flex-shrink-0',
                typeFilter === 'tbd'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              TBD ({tbdItems.length})
            </button>
          )}
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

      {/* Content */}
      <div>
        {isTbdActive ? (
          tbdItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No TBD lines</p>
              <p className="text-sm mt-1">Lines marked TBD will appear here</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {tbdItems.map((item) => {
                  const isClickable = !!onNavigateToRO;
                  return (
                    <div
                      key={`${item.roId}-${item.lineId}`}
                      className={cn(
                        'px-4 py-3 flex items-start gap-3',
                        isClickable && 'cursor-pointer hover:bg-muted/50 transition-colors'
                      )}
                      onClick={isClickable ? () => handleFlagClick(item.roId, item.lineId) : undefined}
                    >
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            TBD
                          </span>
                          <span className="text-sm font-semibold">#{item.roNumber}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          L{item.lineNo}: {item.description}
                        </p>
                        {item.laborType && (
                          <div className="mt-1">
                            <StatusPill type={item.laborType} size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-border">
                {confirmClearTbd ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-destructive font-medium flex-1">Clear TBD from {tbdItems.length} line(s)?</p>
                    <button
                      onClick={() => { clearAllTbdLines?.(); setConfirmClearTbd(false); }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmClearTbd(false)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearTbd(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All TBD Status
                  </button>
                )}
              </div>
            </>
          )
        ) : filteredFlags.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Flag className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No flags</p>
            <p className="text-sm mt-1">Flagged items will appear here</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {filteredFlags.map((flag) => {
                const lineDesc = getLineDesc(flag.roId, flag.roLineId);
                const isClickable = !!onNavigateToRO;
                return (
                  <div
                    key={flag.id}
                    className={cn(
                      'px-4 py-3 flex items-start gap-3',
                      isClickable && 'cursor-pointer hover:bg-muted/50 transition-colors'
                    )}
                    onClick={isClickable ? () => handleFlagClick(flag.roId, flag.roLineId) : undefined}
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
            <div className="px-4 py-3 border-t border-border">
              {confirmClearAll ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-destructive font-medium flex-1">Clear all {filteredFlags.length} flag(s)?</p>
                  <button
                    onClick={() => { clearFlagsBulk(filteredFlags.map(f => f.id)); setConfirmClearAll(false); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All Flags
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={handleOpen}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          totalBadge > 0 && 'text-orange-500'
        )}
        title="Flag Inbox"
      >
        <Flag className="h-5 w-5" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {!isMobile && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[70vh] flex flex-col rounded-2xl p-0 overflow-hidden">
            <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Flag Inbox
                {totalBadge > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({totalBadge} active)</span>
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
