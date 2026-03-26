import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset } from '@/types/ro';
import { DecimalHoursInput } from '@/components/shared/DecimalHoursInput';
import { PresetSearchRail } from '@/components/shared/PresetSearchRail';

interface LineItemEditorProps {
  lines: ROLine[];
  onLinesChange: (lines: ROLine[]) => void;
  presets?: Preset[];
  showLaborType?: boolean;
  onPresetApplied?: (preset: Preset) => void;
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
  showLaborType = false,
  onPresetApplied,
}: LineItemEditorProps) {
  const [recentlyAddedPresets, setRecentlyAddedPresets] = useState<string[]>([]);
  const [animatingPresetId, setAnimatingPresetId] = useState<string | null>(null);

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

    // Create new line at bottom to avoid viewport jump while users add multiple presets
    const newLine: ROLine = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      lineNo: lines.length + 1,
      description: preset.workTemplate || preset.name,
      hoursPaid: preset.defaultHours || 0,
      laborType: preset.laborType,
      matchedReferenceId: preset.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add at bottom and renumber all lines
    const updatedLines = [...lines, newLine].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
    
    // Show toast feedback
    const presetHours = Number(preset.defaultHours || 0).toFixed(1);
    toast.success(`Added ${preset.name} -${presetHours}hrs`);
    onPresetApplied?.(preset);
  };

  const totalHours = lines.reduce((sum, line) => sum + line.hoursPaid, 0);
  const hasEmptyHours = lines.some(line => line.description && !line.hoursPaid);

  return (
    <div className="space-y-4">
      {/* ── Presets section ── */}
      {presets.length > 0 && (
        <div className="space-y-2.5">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Quick Presets</span>
          <PresetSearchRail
            presets={presets}
            onSelect={handlePresetSelect}
            animatingId={animatingPresetId}
            layout="mobile"
            mobileMode="grid"
          />
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

      {/* ── Add Line CTA ── */}
      <button
        onClick={handleAddLine}
        className="w-full h-12 bg-card rounded-2xl border border-primary/25 flex items-center justify-center gap-2.5 text-primary font-semibold tap-target touch-feedback active:scale-[0.98] transition-all"
        style={{ boxShadow: '0 1px 6px -1px hsl(214 100% 46% / 0.12), 0 0 0 1px hsl(214 100% 46% / 0.08)' }}
      >
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Plus className="h-4 w-4 text-primary-foreground" />
        </div>
        <span>Add Line</span>
      </button>

      {/* ── Lines section ── */}
      {lines.length > 0 && (
        <div className="space-y-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Lines</span>
          <AnimatePresence initial={false}>
            {lines.map((line, index) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-3 last:mb-0"
              >
                <div
                  className="bg-card rounded-2xl overflow-hidden border border-border/60"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  {/* Line card header */}
                  <div className="flex items-center px-4 py-2.5 bg-muted/25 border-b border-border/40">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground flex-1">
                      Line {line.lineNo}
                    </span>
                    <button
                      onClick={() => handleRemoveLine(index)}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-destructive/60 hover:text-destructive tap-target touch-feedback rounded-lg transition-colors"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Line card body */}
                  <div className="p-4 space-y-3">
                    {/* Description Input */}
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => handleLineChange(index, { description: e.target.value })}
                      placeholder="Job description..."
                      className="w-full h-11 px-3.5 bg-background rounded-xl border border-border/60 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-shadow"
                    />

                    {/* Hours and Labor Type Row */}
                    <div className="flex gap-3">
                      {/* Hours Input */}
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                          Hours Paid
                        </label>
                        <DecimalHoursInput
                          value={line.hoursPaid}
                          onChange={(v) => handleHoursInput(index, v)}
                          placeholder="0.0"
                          className="w-full h-12 px-4 bg-background rounded-xl border border-border/60 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-shadow"
                        />
                      </div>

                      {/* Labor Type (Optional) */}
                      {showLaborType && (
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                            Type
                          </label>
                          <select
                            value={line.laborType || ''}
                            onChange={(e) => handleLineChange(index, {
                              laborType: e.target.value as LaborType | undefined,
                            })}
                            className="w-full h-12 px-3 bg-background rounded-xl border border-border/60 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
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
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

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
