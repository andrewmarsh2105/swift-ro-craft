import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset } from '@/types/ro';
import { DecimalHoursInput } from '@/components/shared/DecimalHoursInput';
import { PresetSearchRail } from '@/components/shared/PresetSearchRail';
import { cn } from '@/lib/utils';

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
    
    setAnimatingPresetId(preset.id);
    setTimeout(() => setAnimatingPresetId(null), 600);
    
    setRecentlyAddedPresets(prev => {
      const updated = [preset.id, ...prev.filter(id => id !== preset.id)].slice(0, 3);
      return updated;
    });

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
    
    const updatedLines = [...lines, newLine].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
    
    const presetHours = Number(preset.defaultHours || 0).toFixed(1);
    toast.success(`Added ${preset.name} — ${presetHours}h`);
    onPresetApplied?.(preset);
  };

  const totalHours = lines.reduce((sum, line) => sum + line.hoursPaid, 0);
  const hasEmptyHours = lines.some(line => line.description && !line.hoursPaid);

  return (
    <div className="space-y-3">
      {/* ── Presets ── */}
      {presets.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55">
              Presets
            </span>
            {recentlyAddedPresets.length > 0 && (
              <div className="flex items-center gap-1">
                {recentlyAddedPresets.slice(0, 2).map(id => {
                  const preset = presets.find(p => p.id === id);
                  return preset ? (
                    <span key={id} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      ✓ {preset.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <PresetSearchRail
            presets={presets}
            onSelect={handlePresetSelect}
            animatingId={animatingPresetId}
            layout="mobile"
            mobileMode="grid"
          />
        </div>
      )}

      {hasEmptyHours && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-lg">
          <span className="text-amber-600 text-sm">⚠️</span>
          <span className="text-xs font-medium text-amber-700">Some lines have descriptions but no hours</span>
        </div>
      )}

      {/* ── Add Line ── */}
      <button
        onClick={handleAddLine}
        className="w-full h-11 rounded-xl flex items-center justify-center gap-2 font-medium text-sm tap-target transition-all active:scale-[0.98] border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        <span>Add Line</span>
      </button>

      {/* ── Lines ── */}
      {lines.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55">
                Lines
              </span>
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-muted rounded-full text-muted-foreground tabular-nums">
                {lines.length}
              </span>
            </div>
            <span className="text-xs font-bold text-primary tabular-nums">
              {totalHours.toFixed(1)}h
            </span>
          </div>

          <AnimatePresence initial={false}>
            {lines.map((line, index) => {
              const accentColor = line.laborType === 'warranty'
                ? 'hsl(var(--status-warranty))'
                : line.laborType === 'internal'
                  ? 'hsl(var(--status-internal))'
                  : 'hsl(var(--status-customer-pay))';
              return (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className="flex bg-card rounded-xl border border-border/50 overflow-hidden"
                    style={{ boxShadow: 'var(--shadow-sm)' }}
                  >
                    {/* Left accent bar — color-coded by labor type */}
                    <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: accentColor }} />

                    {/* Line number */}
                    <div className="flex-shrink-0 w-7 flex items-center justify-center border-r border-border/25">
                      <span className="text-[10px] font-bold text-muted-foreground/40 tabular-nums">
                        {line.lineNo}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(index, { description: e.target.value })}
                        placeholder="Job description..."
                        className="w-full h-11 px-2.5 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/35"
                      />
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 self-center bg-border/40 flex-shrink-0" />

                    {/* Hours */}
                    <div className="flex-shrink-0 w-[72px]">
                      <DecimalHoursInput
                        value={line.hoursPaid}
                        onChange={(v) => handleHoursInput(index, v)}
                        placeholder="0.0"
                        className="w-full h-11 px-2 bg-transparent text-sm font-bold text-center tabular-nums focus:outline-none focus:bg-primary/5 transition-colors"
                      />
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleRemoveLine(index)}
                      className="flex-shrink-0 w-9 h-11 flex items-center justify-center text-muted-foreground/30 hover:text-destructive active:text-destructive transition-colors"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Labor type row (optional) */}
                  {showLaborType && (
                    <div className="px-4 pb-2 pt-1">
                      <select
                        value={line.laborType || ''}
                        onChange={(e) => handleLineChange(index, {
                          laborType: e.target.value as LaborType | undefined,
                        })}
                        className="h-7 px-2 bg-muted/50 rounded text-[11px] border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow"
                      >
                        <option value="">Default</option>
                        <option value="warranty">Warranty</option>
                        <option value="customer-pay">Customer Pay</option>
                        <option value="internal">Internal</option>
                      </select>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {lines.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No lines yet. Add a line or select a preset.</p>
        </div>
      )}
    </div>
  );
}

export { createEmptyLine };
