import { useState, useRef } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset, VehicleInfo } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';
import { DecimalHoursInput } from '@/components/shared/DecimalHoursInput';

interface CompactLinesGridProps {
  lines: ROLine[];
  onLinesChange: (lines: ROLine[]) => void;
  presets?: Preset[];
  readOnly?: boolean;
  highlightedIds?: string[];
  roVehicle?: VehicleInfo;
  showVehicleChips?: boolean;
}

function createEmptyLine(lineNo: number): ROLine {
  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    lineNo,
    description: '',
    hoursPaid: 0,
    laborType: 'customer-pay',
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
  highlightedIds = [],
  roVehicle,
  showVehicleChips = true,
}: CompactLinesGridProps) {
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

  const handleHoursInput = (index: number, value: number) => {
    handleLineChange(index, { hoursPaid: Math.max(0, value) });
  };

  return (
    <div className="space-y-1.5" ref={topRef}>
      {/* Compact Lines List - No presets here, they're in parent */}
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

                {/* Row 2: Labor Type + TBD + Hours */}
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
                  
                  {/* TBD Toggle */}
                  {!readOnly && (
                    <button
                      onClick={() => handleLineChange(index, { isTbd: !line.isTbd })}
                      className={cn(
                        'px-2 py-1 rounded text-[10px] font-bold transition-colors flex-shrink-0',
                        line.isTbd
                          ? 'bg-warning/20 text-warning border border-warning/40'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      TBD
                    </button>
                  )}
                  {readOnly && line.isTbd && (
                    <span className="px-2 py-1 bg-warning/20 text-warning text-[10px] font-bold rounded flex-shrink-0">TBD</span>
                  )}

                  <div className="flex-1" />
                  
                  <div className="flex items-center gap-1">
                    <DecimalHoursInput
                      value={line.hoursPaid}
                      onChange={(v) => handleHoursInput(index, v)}
                      placeholder={line.isTbd ? '—' : '0.0'}
                      disabled={readOnly}
                      className={cn(
                        'w-16 h-8 px-2 bg-background rounded text-sm font-semibold text-right focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60',
                        isHighlighted && 'ring-2 ring-primary',
                        line.isTbd && 'line-through text-muted-foreground'
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

                {/* Vehicle chip */}
                {showVehicleChips && (() => {
                  const veh = line.vehicleOverride && line.lineVehicle ? line.lineVehicle : roVehicle;
                  const chip = formatVehicleChip(veh);
                  return chip ? (
                    <div className="mt-1 pl-7">
                      <span className="inline-flex items-center px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-medium rounded">
                        🚗 {chip}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

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
