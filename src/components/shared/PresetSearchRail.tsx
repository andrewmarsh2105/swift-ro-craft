import { useState, useRef, useCallback } from 'react';
import { Search, X, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Preset } from '@/types/ro';

interface PresetSearchRailProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  animatingId?: string | null;
  layout?: 'mobile' | 'desktop';
}

export function PresetSearchRail({
  presets,
  onSelect,
  animatingId,
  layout = 'desktop',
}: PresetSearchRailProps) {
  const [search, setSearch] = useState('');
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const filtered = presets.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.workTemplate && p.workTemplate.toLowerCase().includes(q))
    );
  });

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
            {filtered.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelect(preset)}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all duration-150',
                  isMobile
                    ? 'py-2.5 tap-target'
                    : 'py-1.5',
                  animatingId === preset.id
                    ? 'bg-primary text-primary-foreground border-primary scale-95 shadow-none'
                    : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-95',
                )}
                style={animatingId !== preset.id ? { boxShadow: '0 1px 3px 0 hsl(0 0% 0% / 0.08)' } : undefined}
              >
                {animatingId === preset.id ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {preset.name}
                {preset.defaultHours != null && preset.defaultHours > 0 && (
                  <span className="opacity-60">({preset.defaultHours}h)</span>
                )}
              </button>
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
