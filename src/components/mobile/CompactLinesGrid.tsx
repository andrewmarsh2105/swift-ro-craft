import { useState, useRef } from 'react';
import { Trash2, Maximize2 } from 'lucide-react';
import { haptics } from '@/lib/haptics';
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
  onSaveAsPreset?: (line: ROLine) => void;
}


const LABOR_TYPES: { value: LaborType; label: string; short: string }[] = [
  { value: 'warranty', label: 'Warranty', short: 'Warr' },
  { value: 'customer-pay', label: 'Customer Pay', short: 'Cust' },
  { value: 'internal', label: 'Internal', short: 'Int' },
];


export function CompactLinesGrid({
  lines,
  onLinesChange,
  presets = [],
  readOnly = false,
  highlightedIds = [],
  roVehicle,
  showVehicleChips = true,
  onSaveAsPreset,
}: CompactLinesGridProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const [expandedLine, setExpandedLine] = useState<{ lineNo: number; description: string; id: string } | null>(null);

  const handleRemoveLine = (index: number) => {
    haptics.light();
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
                'rounded-lg p-2 border transition-all duration-300',
                isHighlighted
                  ? 'border-primary bg-primary/10 shadow-md border-l-[3px] border-l-primary'
                  : 'border-border bg-card shadow-sm',
              )}>
                {/* Row 1: Line # + Description + Hours + Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
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
                    className="flex-1 min-w-[150px] h-9 px-2.5 bg-background border border-input rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary placeholder:text-muted-foreground/50 disabled:opacity-60 transition-shadow"
                  />
                  <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                    <DecimalHoursInput
                      value={line.hoursPaid}
                      onChange={(v) => handleHoursInput(index, v)}
                      placeholder="0.0"
                      disabled={readOnly}
                      className={cn(
                        'w-[68px] h-9 px-2 bg-secondary border border-border rounded-md text-sm font-bold text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/60 disabled:opacity-60 transition-shadow',
                        isHighlighted && 'ring-2 ring-primary border-primary',
                      )}
                    />
                    <button
                      onClick={() => setExpandedLine({ lineNo: line.lineNo, description: line.description, id: line.id })}
                      className="h-9 w-8 text-muted-foreground hover:text-foreground rounded flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                      title="View full description"
                      aria-label="View full description"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => handleRemoveLine(index)}
                        aria-label={`Remove line ${line.lineNo}`}
                        className="h-9 w-8 text-destructive/60 hover:text-destructive rounded flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Labor Type + metadata chips */}
                <div className="flex flex-wrap items-center gap-2 pl-7 pt-1.5">
                  <select
                    value={line.laborType || ''}
                    onChange={(e) => handleLineChange(index, { laborType: e.target.value as LaborType || undefined })}
                    disabled={readOnly}
                    className="h-8 px-2.5 bg-secondary border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/60 disabled:opacity-60 min-w-[82px] flex-shrink-0"
                  >
                    <option value="">Default</option>
                    {LABOR_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.short}</option>
                    ))}
                  </select>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                    {line.matchedReferenceId && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
                        {presets.find(p => p.id === line.matchedReferenceId)?.name || 'Preset'}
                      </span>
                    )}
                    {showVehicleChips && (() => {
                      const veh = line.vehicleOverride && line.lineVehicle ? line.lineVehicle : roVehicle;
                      const chip = formatVehicleChip(veh);
                      return chip ? (
                        <span className="inline-flex items-center px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-medium rounded">
                          🚗 {chip}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
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
        onSaveAsPreset={!readOnly && onSaveAsPreset && expandedLine
          ? () => { const l = lines.find(ln => ln.id === expandedLine.id); if (l) onSaveAsPreset(l); }
          : undefined}
      />
    </div>
  );
}
