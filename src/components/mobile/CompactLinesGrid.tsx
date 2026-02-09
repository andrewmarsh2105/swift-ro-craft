import { useState, useRef, useEffect } from 'react';
import { Plus, Copy, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset } from '@/types/ro';

interface CompactLinesGridProps {
  lines: ROLine[];
  onLinesChange: (lines: ROLine[]) => void;
  presets?: Preset[];
  readOnly?: boolean;
  highlightedIds?: string[];
}

function createEmptyLine(lineNo: number): ROLine {
  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    lineNo,
    description: '',
    hoursPaid: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const LABOR_TYPES: { value: LaborType; label: string; short: string }[] = [
  { value: 'warranty', label: 'Warranty', short: 'W' },
  { value: 'customer-pay', label: 'Customer Pay', short: 'CP' },
  { value: 'internal', label: 'Internal', short: 'Int' },
];

function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export function CompactLinesGrid({ 
  lines, 
  onLinesChange, 
  presets = [],
  readOnly = false,
  highlightedIds = []
}: CompactLinesGridProps) {
  const [recentlyAddedPresets, setRecentlyAddedPresets] = useState<string[]>([]);
  const [animatingPresetId, setAnimatingPresetId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const handleDuplicateLine = (index: number) => {
    triggerHaptic();
    const lineToDuplicate = lines[index];
    const newLine: ROLine = {
      ...lineToDuplicate,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      lineNo: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedLines = [newLine, ...lines].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
    toast.success(`Duplicated: ${lineToDuplicate.description || 'Line'}`);
  };

  const handleRemoveLine = (index: number) => {
    triggerHaptic();
    if (lines.length <= 1) {
      toast.error('Cannot remove the last line');
      return;
    }
    const updatedLines = lines.filter((_, i) => i !== index).map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
  };

  const handleLineChange = (index: number, updates: Partial<ROLine>) => {
    const updatedLines = lines.map((line, i) =>
      i === index ? { ...line, ...updates, updatedAt: new Date().toISOString() } : line
    );
    onLinesChange(updatedLines);
  };

  const handleHoursInput = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanValue;
    const numValue = parseFloat(sanitized) || 0;
    handleLineChange(index, { hoursPaid: Math.max(0, numValue) });
  };

  const handlePresetSelect = (preset: Preset) => {
    triggerHaptic();
    setAnimatingPresetId(preset.id);
    setTimeout(() => setAnimatingPresetId(null), 600);
    
    setRecentlyAddedPresets(prev => {
      const updated = [preset.id, ...prev.filter(id => id !== preset.id)].slice(0, 3);
      return updated;
    });

    const newLine: ROLine = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      lineNo: 1,
      description: preset.workTemplate || preset.name,
      hoursPaid: preset.defaultHours || 0,
      laborType: preset.laborType,
      matchedReferenceId: preset.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedLines = [newLine, ...lines].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
    toast.success(`Added: ${preset.name} (${preset.defaultHours || 0}h)`);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-2" ref={topRef}>
      {/* Preset Quick Add - Horizontal strip (only shown when not externally managed) */}
      {presets.length > 0 && !readOnly && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className={cn(
                'flex-shrink-0 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 min-h-[36px]',
                animatingPresetId === preset.id && 'bg-primary text-primary-foreground scale-95'
              )}
            >
              {animatingPresetId === preset.id ? (
                <Check className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {preset.name}
              {preset.defaultHours && (
                <span className="opacity-70">({preset.defaultHours}h)</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Recently Added */}
      {recentlyAddedPresets.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1">
          <span>Recent:</span>
          {recentlyAddedPresets.map(id => {
            const preset = presets.find(p => p.id === id);
            return preset ? (
              <span key={id} className="px-1.5 py-0.5 bg-primary/10 rounded text-primary">
                {preset.name}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Compact Lines List */}
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {lines.map((line, index) => {
            const isHighlighted = highlightedIds.includes(line.id);
            
            return (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  height: 'auto', 
                  scale: 1,
                  backgroundColor: isHighlighted ? 'hsl(var(--primary) / 0.15)' : 'transparent'
                }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className={cn(
                  'rounded-lg p-2 border transition-all duration-500',
                  isHighlighted 
                    ? 'border-primary bg-primary/10 shadow-md' 
                    : 'border-border/50 bg-secondary/50'
                )}>
                  {/* Row 1: Line # + Description */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 transition-colors',
                      isHighlighted 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground bg-muted'
                    )}>
                      L{line.lineNo}
                    </span>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => handleLineChange(index, { description: e.target.value })}
                      placeholder="Description..."
                      disabled={readOnly}
                      className="flex-1 h-8 px-2 bg-background rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                    />
                    {!readOnly && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => handleDuplicateLine(index)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded min-w-[32px] min-h-[32px] flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveLine(index)}
                          className="p-1.5 text-destructive/70 hover:text-destructive rounded min-w-[32px] min-h-[32px] flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Labor Type + Hours */}
                  <div className="flex items-center gap-2 pl-7">
                    <select
                      value={line.laborType || ''}
                      onChange={(e) => handleLineChange(index, { laborType: e.target.value as LaborType || undefined })}
                      disabled={readOnly}
                      className="h-8 px-2 bg-background rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 min-w-[80px]"
                    >
                      <option value="">Default</option>
                      {LABOR_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.short}</option>
                      ))}
                    </select>
                    
                    <div className="flex-1" />
                    
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={line.hoursPaid || ''}
                        onChange={(e) => handleHoursInput(index, e.target.value)}
                        placeholder="0.0"
                        disabled={readOnly}
                        className={cn(
                          'w-16 h-8 px-2 bg-background rounded text-sm font-semibold text-right focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60',
                          isHighlighted && 'ring-2 ring-primary'
                        )}
                      />
                      <span className="text-xs text-muted-foreground">hrs</span>
                    </div>
                  </div>

                  {/* Reference chip if matched */}
                  {line.matchedReferenceId && (
                    <div className="mt-1.5 pl-7">
                      <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                        {presets.find(p => p.id === line.matchedReferenceId)?.name || 'Preset'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {lines.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <p>No lines yet. Add a line or select a preset above.</p>
        </div>
      )}
    </div>
  );
}

export { createEmptyLine };
