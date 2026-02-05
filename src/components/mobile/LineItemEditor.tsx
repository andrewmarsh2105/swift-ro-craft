import { useState } from 'react';
import { Plus, Copy, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ROLine, LaborType, Preset } from '@/types/ro';

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function LineItemEditor({ 
  lines, 
  onLinesChange, 
  presets = [],
  showLaborType = false 
}: LineItemEditorProps) {
  const handleAddLine = () => {
    const newLine = createEmptyLine(lines.length + 1);
    onLinesChange([...lines, newLine]);
  };

  const handleDuplicateLine = (index: number) => {
    const lineToDuplicate = lines[index];
    const newLine: ROLine = {
      ...lineToDuplicate,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      lineNo: lines.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onLinesChange([...lines, newLine]);
  };

  const handleRemoveLine = (index: number) => {
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

  const handleReorder = (reorderedLines: ROLine[]) => {
    const updatedLines = reorderedLines.map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    onLinesChange(updatedLines);
  };

  const handleHoursInput = (index: number, value: string) => {
    // Allow empty string, numbers, and decimals
    const cleanValue = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleanValue.split('.');
    const sanitized = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('') 
      : cleanValue;
    
    const numValue = parseFloat(sanitized) || 0;
    // Prevent negative numbers
    const finalValue = Math.max(0, numValue);
    
    handleLineChange(index, { hoursPaid: finalValue });
  };

  const handlePresetSelect = (preset: Preset) => {
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
    onLinesChange([...lines, newLine]);
  };

  const totalHours = lines.reduce((sum, line) => sum + line.hoursPaid, 0);
  const hasEmptyHours = lines.some(line => line.description && !line.hoursPaid);

  return (
    <div className="space-y-4">
      {/* Total Hours Display */}
      <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl">
        <span className="font-medium text-foreground">Total RO Hours</span>
        <span className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}h</span>
      </div>

      {hasEmptyHours && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-sm text-warning">
          ⚠️ Some lines have descriptions but no hours
        </div>
      )}

      {/* Preset Quick Add */}
      {presets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className="flex-shrink-0 px-4 py-2 bg-secondary rounded-full text-sm font-medium tap-target touch-feedback whitespace-nowrap"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      )}

      {/* Lines List */}
      <Reorder.Group axis="y" values={lines} onReorder={handleReorder} className="space-y-3">
        <AnimatePresence initial={false}>
          {lines.map((line, index) => (
            <Reorder.Item
              key={line.id}
              value={line}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="touch-none"
            >
              <div className="bg-secondary rounded-xl p-4 space-y-3">
                {/* Line Header */}
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />
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
                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.hoursPaid || ''}
                      onChange={(e) => handleHoursInput(index, e.target.value)}
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
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Add Line Button */}
      <button
        onClick={handleAddLine}
        className="w-full py-4 bg-primary/10 border-2 border-dashed border-primary/50 rounded-xl flex items-center justify-center gap-2 text-primary font-semibold tap-target touch-feedback"
      >
        <Plus className="h-5 w-5" />
        Add Line
      </button>
    </div>
  );
}

export { createEmptyLine };
