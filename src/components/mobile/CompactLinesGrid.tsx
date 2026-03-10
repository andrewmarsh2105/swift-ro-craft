import { useState, useRef } from 'react';
import { Trash2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset, VehicleInfo } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';
import { DecimalHoursInput } from '@/components/shared/DecimalHoursInput';
import { LineTextModal } from '@/components/shared/LineTextModal';

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
  { value: 'internal', label: 'Internal', short: 'I' },
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
  const [expandedLine, setExpandedLine] = useState<{ lineNo: number; description: string; id: string; index: number } | null>(null);

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
              data-line-id={line.id}
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
                'rounded-lg p-2.5 border transition-all duration-300',
                // Highlighted from flag nav takes priority
                isHighlighted 
                  ? 'border-primary bg-primary/10 shadow-md border-l-[3px] border-l-primary' 
                  : 'border-border bg-card shadow-sm',
                // Left accent ONLY for flagged (TBD state) — keeps neutral otherwise
                !isHighlighted && line.isTbd && 'border-l-[3px] border-l-amber-400',
              )}>
                {/* Row 1: Line # + Description */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 transition-colors tabular-nums',
                    isHighlighted 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground bg-secondary border border-border'
                  )}>
                    L{line.lineNo}
                  </span>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => handleLineChange(index, { description: e.target.value })}
                    placeholder="Enter job description..."
                    disabled={readOnly}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        setExpandedLine({ lineNo: line.lineNo, description: line.description, id: line.id });
                      }
                    }}
                    className="flex-1 h-11 px-3 bg-card border border-input rounded-[10px] text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary placeholder:text-muted-foreground/50 disabled:opacity-60 transition-shadow"
                  />
                  {/* Expand button */}
                  <button
                    onClick={() => setExpandedLine({ lineNo: line.lineNo, description: line.description, id: line.id, index })}
                    className="h-11 w-11 text-muted-foreground hover:text-foreground rounded flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                    title="View full description"
                    aria-label="View full description"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveLine(index)}
                      className="h-11 w-11 text-destructive/60 hover:text-destructive rounded flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Row 2: Labor Type + TBD + Hours */}
                <div className="flex items-center gap-2 pl-7">
                  <select
                    value={line.laborType || ''}
                    onChange={(e) => handleLineChange(index, { laborType: e.target.value as LaborType || undefined })}
                    disabled={readOnly}
                    className="h-11 px-3 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary/60 disabled:opacity-60 min-w-[80px]"
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
                        'h-11 px-3 rounded-md text-xs font-bold transition-all flex-shrink-0 border min-w-[44px]',
                        line.isTbd
                          ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700'
                          : 'bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      TBD
                    </button>
                  )}
                  {readOnly && line.isTbd && (
                    <span className="h-11 px-3 bg-amber-50 text-amber-600 text-xs font-bold rounded-md border border-amber-300 flex-shrink-0 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700 flex items-center">TBD</span>
                  )}

                  <div className="flex-1" />
                  
                  <div className="flex items-center gap-1">
                    <DecimalHoursInput
                      value={line.hoursPaid}
                      onChange={(v) => handleHoursInput(index, v)}
                      placeholder={line.isTbd ? '—' : '0.0'}
                      disabled={readOnly}
                      className={cn(
                        'w-20 h-11 px-2 bg-secondary border border-border rounded-md text-base font-bold text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/60 disabled:opacity-60 transition-shadow',
                        isHighlighted && 'ring-2 ring-primary border-primary',
                        line.isTbd && 'line-through text-muted-foreground'
                      )}
                    />
                    <span className="text-xs text-muted-foreground font-medium">hrs</span>
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

      {/* Full description modal */}
      <LineTextModal
        open={!!expandedLine}
        onClose={() => setExpandedLine(null)}
        lineNo={expandedLine?.lineNo ?? 0}
        description={expandedLine?.description ?? ''}
        onDuplicate={!readOnly && expandedLine ? () => handleDuplicateLine(expandedLine.index) : undefined}
      />
    </div>
  );
}

export { createEmptyLine };
