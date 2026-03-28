import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Search, X, Plus, Check, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Preset } from '@/types/ro';

interface PresetSearchRailProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  animatingId?: string | null;
  layout?: 'mobile' | 'desktop';
  mobileMode?: 'rail' | 'grid';
}

export function PresetSearchRail({
  presets,
  onSelect,
  animatingId,
  layout = 'desktop',
  mobileMode = 'rail',
}: PresetSearchRailProps) {
  const [search, setSearch] = useState('');
  const [showAllMobile, setShowAllMobile] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const filtered = useMemo(() => {
    const list = presets.filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.workTemplate && p.workTemplate.toLowerCase().includes(q))
      );
    });
    // Sort favorites first
    return list.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
  }, [presets, search]);

  const hasFavorites = filtered.some(p => p.isFavorite);
  const firstNonFavIndex = hasFavorites ? filtered.findIndex(p => !p.isFavorite) : -1;

  const checkScroll = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollBy = (dir: number) => {
    railRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  // Attach scroll listener
  const attachRef = useCallback(
    (el: HTMLDivElement | null) => {
      (railRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (el) {
        el.addEventListener('scroll', checkScroll, { passive: true });
        // Check initial state after a tick (content may not be laid out yet)
        requestAnimationFrame(checkScroll);
      }
    },
    [checkScroll],
  );

  const isMobile = layout === 'mobile';
  const mobileVisible = showAllMobile ? filtered : filtered.slice(0, 8);

  if (isMobile && mobileMode === 'grid') {
    return (
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presets…"
            style={{ fontSize: '16px' }}
            className="w-full h-9 pl-8 pr-7 bg-muted/40 border border-border/30 rounded-xl text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:bg-background/60 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear preset search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {mobileVisible.map((preset) => {
            const laborColor = preset.laborType === 'warranty'
              ? { dot: 'hsl(var(--status-warranty))', bg: 'hsl(148 68% 30% / 0.07)', border: 'hsl(148 68% 30% / 0.18)' }
              : preset.laborType === 'internal'
                ? { dot: 'hsl(var(--status-internal))', bg: 'hsl(26 85% 42% / 0.07)', border: 'hsl(26 85% 42% / 0.18)' }
                : null; // customer-pay uses default card styling

            return (
              <button
                key={preset.id}
                onClick={() => onSelect(preset)}
                className={cn(
                  'flex items-center gap-2 px-3 h-10 rounded-xl border text-left transition-all duration-150 active:scale-[0.97]',
                  animatingId === preset.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : preset.isFavorite
                      ? 'bg-primary/8 border-primary/20 text-foreground'
                      : 'bg-card border-border/50 text-foreground',
                )}
                style={animatingId !== preset.id ? {
                  boxShadow: 'var(--shadow-sm)',
                  ...(laborColor && !preset.isFavorite ? { backgroundColor: laborColor.bg, borderColor: laborColor.border } : {}),
                } : undefined}
              >
                <span className="flex-shrink-0 w-4 flex items-center justify-center">
                  {animatingId === preset.id ? (
                    <Check className="h-3 w-3" />
                  ) : preset.isFavorite ? (
                    <Star className="h-3 w-3 fill-primary text-primary" />
                  ) : laborColor ? (
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: laborColor.dot }} />
                  ) : (
                    <Plus className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </span>
                <span className="flex-1 truncate text-[13px] font-semibold">{preset.name}</span>
                {preset.defaultHours != null && (
                  <span className={cn(
                    'flex-shrink-0 text-[11px] font-bold tabular-nums',
                    animatingId === preset.id ? 'opacity-80' : 'text-primary/70'
                  )}>{preset.defaultHours}h</span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground py-1">No presets found</div>
        )}

        {filtered.length > 8 && (
          <button
            onClick={() => setShowAllMobile(v => !v)}
            className="w-full h-11 rounded-xl border border-primary/20 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            {showAllMobile ? '↑ Show fewer presets' : `↓ Show ${filtered.length - 8} more presets`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={cn('flex items-center gap-2', isMobile && '-mx-4 px-4')}>
        {/* Search input */}
        <div className="relative flex-shrink-0" style={{ width: isMobile ? 140 : 180 }}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search presets…"
            style={isMobile ? { fontSize: '16px' } : undefined}
            className={cn(
              'w-full pl-8 pr-7 bg-secondary border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors',
              isMobile ? 'h-10' : 'h-8',
            )}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Rail container */}
        <div className="relative flex-1 min-w-0">
          {/* Left fade / chevron */}
          {canScrollLeft && (
            <button
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-0 bottom-0 z-10 w-7 flex items-center justify-start bg-gradient-to-r from-background via-background/80 to-transparent"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Scrollable rail */}
          <div
            ref={attachRef}
            className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
            onScroll={checkScroll}
          >
            {filtered.length === 0 && (
              <span className="flex-shrink-0 px-3 py-1.5 text-sm text-muted-foreground whitespace-nowrap">
                No presets found
              </span>
            )}
            {filtered.map((preset, idx) => (
              <React.Fragment key={preset.id}>
                {/* Separator between favorites and rest */}
                {idx === firstNonFavIndex && firstNonFavIndex > 0 && (
                  <div className="flex-shrink-0 w-px bg-border mx-1 self-stretch" />
                )}
                <button
                  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                  onClick={(e) => { const delta = Math.abs(e.clientX - (touchStartX.current ?? e.clientX)); if (delta > 8) return; onSelect(preset); }}
                  className={cn(
                    'flex-shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all duration-150',
                    isMobile
                      ? 'py-2.5 tap-target'
                      : 'py-1.5',
                    animatingId === preset.id
                      ? 'bg-primary text-primary-foreground border-primary scale-95 shadow-none'
                      : preset.isFavorite
                        ? 'bg-primary/10 border-primary/30 text-foreground hover:border-primary/50 hover:bg-primary/15 active:scale-95'
                        : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-95',
                  )}
                  style={animatingId !== preset.id ? { boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.08)' } : undefined}
                >
                  {animatingId === preset.id ? (
                    <Check className="h-3 w-3" />
                  ) : preset.isFavorite ? (
                    <Star className="h-3 w-3 fill-primary text-primary" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {preset.name}
                  {preset.defaultHours != null && preset.defaultHours > 0 && (
                    <span className="opacity-60">({preset.defaultHours}h)</span>
                  )}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Right fade / chevron */}
          {canScrollRight && (
            <button
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-0 bottom-0 z-10 w-7 flex items-center justify-end bg-gradient-to-l from-background via-background/80 to-transparent"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
