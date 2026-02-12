import { useState, useRef, useEffect } from 'react';
import { Plus, Copy, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset } from '@/types/ro';
import { DecimalHoursInput } from '@/components/shared/DecimalHoursInput';

interface LineItemEditorProps {
  lines: ROLine[];
  onLinesChange: (lines: ROLine[]) => void;
  presets?: Preset[];
  showLaborType?: boolean;
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

// Haptic feedback helper
function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

export function LineItemEditor({ 
  lines, 
  onLinesChange, 
  presets = [],
  showLaborType = false 
}: LineItemEditorProps) {
  const [recentlyAddedPresets, setRecentlyAddedPresets] = useState<string[]>([]);
  const [animatingPresetId, setAnimatingPresetId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const handleAddLine = () => {
    triggerHaptic();
    const newLine = createEmptyLine(1);
    // Add at top and renumber
    const updatedLines = [newLine, ...lines].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
  };

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
    // Add at top and renumber
    const updatedLines = [newLine, ...lines].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
    toast.success(`Duplicated: ${lineToDuplicate.description || 'Line'}`);
  };

  const handleRemoveLine = (index: number) => {
    triggerHaptic();
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

  const handlePresetSelect = (preset: Preset) => {
    triggerHaptic();
    
    // Show animation on the preset button
    setAnimatingPresetId(preset.id);
    setTimeout(() => setAnimatingPresetId(null), 600);
    
    // Add to recently added
    setRecentlyAddedPresets(prev => {
      const updated = [preset.id, ...prev.filter(id => id !== preset.id)].slice(0, 3);
      return updated;
    });

    // Create new line at TOP
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
    
    // Add at top and renumber all lines
    const updatedLines = [newLine, ...lines].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
    
    // Show toast feedback
    toast.success(`Added: ${preset.name} (${preset.defaultHours || 0}h)`);
    
    // Scroll to top to show new line
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totalHours = lines.reduce((sum, line) => sum + line.hoursPaid, 0);
  const hasEmptyHours = lines.some(line => line.description && !line.hoursPaid);

  return (
    <div className="space-y-4" ref={topRef}>
      {/* Preset Quick Add - At TOP */}
      {presets.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Quick Add Presets
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  'flex-shrink-0 px-4 py-3 bg-primary/10 border border-primary/30 rounded-xl text-sm font-medium tap-target touch-feedback whitespace-nowrap transition-all duration-200 flex items-center gap-2',
                  animatingPresetId === preset.id && 'bg-primary text-primary-foreground scale-95'
                )}
              >
                {animatingPresetId === preset.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {preset.name}
                {preset.defaultHours && (
                  <span className="text-xs opacity-70">({preset.defaultHours}h)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recently Added Indicator */}
      {recentlyAddedPresets.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Recently added:</span>
          {recentlyAddedPresets.map(id => {
            const preset = presets.find(p => p.id === id);
            return preset ? (
              <span key={id} className="px-2 py-1 bg-primary/10 rounded-full">
                {preset.name}
              </span>
            ) : null;
          })}
        </div>
      )}

      {hasEmptyHours && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-sm text-warning">
          ⚠️ Some lines have descriptions but no hours
        </div>
      )}

      {/* Add Line Button - At TOP */}
      <button
        onClick={handleAddLine}
        className="w-full py-4 bg-primary/10 border-2 border-dashed border-primary/50 rounded-xl flex items-center justify-center gap-2 text-primary font-semibold tap-target touch-feedback"
      >
        <Plus className="h-5 w-5" />
        Add Line
      </button>

      {/* Lines List - No reordering, standard layout */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {lines.map((line, index) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-secondary rounded-xl p-4 space-y-3">
                {/* Line Header */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Line {line.lineNo}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => handleDuplicateLine(index)}
                    className="p-2 text-muted-foreground hover:text-foreground tap-target touch-feedback rounded-lg"
                    aria-label="Duplicate line"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveLine(index)}
                    className="p-2 text-destructive tap-target touch-feedback rounded-lg"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Description Input */}
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => handleLineChange(index, { description: e.target.value })}
                  placeholder="Job description..."
                  className="w-full h-12 px-4 bg-background rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {/* Hours and Labor Type Row */}
                <div className="flex gap-3">
                  {/* Hours Input - Primary */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Hours Paid
                    </label>
                    <DecimalHoursInput
                      value={line.hoursPaid}
                      onChange={(v) => handleHoursInput(index, v)}
                      placeholder="0.0"
                      className="w-full h-12 px-4 bg-background rounded-xl text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Labor Type (Optional) */}
                  {showLaborType && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Type
                      </label>
                      <select
                        value={line.laborType || ''}
                        onChange={(e) => handleLineChange(index, { 
                          laborType: e.target.value as LaborType | undefined 
                        })}
                        className="w-full h-12 px-3 bg-background rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Default</option>
                        <option value="warranty">Warranty</option>
                        <option value="customer-pay">Customer Pay</option>
                        <option value="internal">Internal</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {lines.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No lines yet. Add a line or select a preset above.</p>
        </div>
      )}
    </div>
  );
}

export { createEmptyLine };
