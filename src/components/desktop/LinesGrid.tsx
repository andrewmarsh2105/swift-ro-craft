import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Plus, Trash2, Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset } from '@/types/ro';
import { DecimalHoursInput } from '@/components/shared/DecimalHoursInput';

interface LinesGridProps {
  lines: ROLine[];
  onLinesChange: (lines: ROLine[]) => void;
  presets?: Preset[];
  readOnly?: boolean;
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

const LABOR_TYPE_OPTIONS: { value: LaborType | ''; label: string; short: string }[] = [
  { value: '', label: 'Default', short: '-' },
  { value: 'warranty', label: 'Warranty', short: 'W' },
  { value: 'customer-pay', label: 'Customer Pay', short: 'CP' },
  { value: 'internal', label: 'Internal', short: 'Int' },
];

export function LinesGrid({ lines, onLinesChange, presets = [], readOnly = false }: LinesGridProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  const handleAddLine = () => {
    const newLine = createEmptyLine(lines.length + 1);
    onLinesChange([...lines, newLine]);
    // Focus the new line's description after render
    setTimeout(() => {
      const key = `${lines.length}-description`;
      inputRefs.current.get(key)?.focus();
    }, 50);
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
    onLinesChange([...lines, newLine].map((l, i) => ({ ...l, lineNo: i + 1 })));
    toast.success(`Duplicated: ${lineToDuplicate.description || 'Line'}`);
  };

  const handleRemoveLine = (index: number) => {
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

  const handleHoursChange = (index: number, value: number) => {
    handleLineChange(index, { hoursPaid: Math.max(0, value) });
  };

  const handleKeyDown = (e: KeyboardEvent, rowIndex: number, colName: string) => {
    const cols = ['description', 'laborType', 'hours'];
    const colIndex = cols.indexOf(colName);

    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.shiftKey) {
        nextCol--;
        if (nextCol < 0) {
          nextCol = cols.length - 1;
          nextRow--;
        }
      } else {
        nextCol++;
        if (nextCol >= cols.length) {
          nextCol = 0;
          nextRow++;
        }
      }

      // If we're past the last row and pressing Enter/Tab forward, add a new line
      if (nextRow >= lines.length && !e.shiftKey) {
        handleAddLine();
        nextRow = lines.length; // Will be the new index after add
      } else if (nextRow < 0) {
        nextRow = 0;
      }

      // Focus the next cell
      setTimeout(() => {
        const key = `${nextRow}-${cols[nextCol]}`;
        const el = inputRefs.current.get(key);
        if (el) {
          el.focus();
          if ('select' in el) el.select();
        }
      }, 50);
    }
  };

  const setRef = (key: string, el: HTMLInputElement | HTMLSelectElement | null) => {
    if (el) {
      inputRefs.current.set(key, el);
    } else {
      inputRefs.current.delete(key);
    }
  };

  const totalHours = lines.reduce((sum, line) => sum + line.hoursPaid, 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Table Header */}
      <div className="grid grid-cols-[48px_1fr_120px_100px_80px] bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <div className="px-3 py-2 text-center">#</div>
        <div className="px-3 py-2">Description</div>
        <div className="px-3 py-2">Type</div>
        <div className="px-3 py-2 text-right">Hours</div>
        <div className="px-3 py-2 text-center">Actions</div>
      </div>

      {/* Table Body - scrollable */}
      <div className="max-h-[400px] overflow-y-auto">
        {lines.map((line, index) => (
          <div
            key={line.id}
            className={cn(
              "grid grid-cols-[48px_1fr_120px_100px_80px] border-b border-border/50 hover:bg-muted/30 transition-colors",
              index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
            )}
          >
            {/* Line Number */}
            <div className="px-3 py-2 text-center text-sm font-medium text-muted-foreground flex items-center justify-center">
              {line.lineNo}
            </div>

            {/* Description */}
            <div className="px-2 py-1">
              <input
                ref={(el) => setRef(`${index}-description`, el)}
                type="text"
                value={line.description}
                onChange={(e) => handleLineChange(index, { description: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                placeholder="Job description..."
                disabled={readOnly}
                className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded text-sm focus:outline-none transition-colors disabled:opacity-60"
              />
            </div>

            {/* Labor Type */}
            <div className="px-2 py-1">
              <select
                ref={(el) => setRef(`${index}-laborType`, el)}
                value={line.laborType || ''}
                onChange={(e) => handleLineChange(index, { laborType: e.target.value as LaborType | undefined || undefined })}
                onKeyDown={(e) => handleKeyDown(e, index, 'laborType')}
                disabled={readOnly}
                className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded text-sm focus:outline-none transition-colors disabled:opacity-60 cursor-pointer"
              >
                {LABOR_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Hours */}
            <div className="px-2 py-1">
              <DecimalHoursInput
                value={line.hoursPaid}
                onChange={(v) => handleHoursChange(index, v)}
                placeholder="0.0"
                disabled={readOnly}
                className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded text-sm text-right font-medium focus:outline-none transition-colors disabled:opacity-60"
              />
            </div>

            {/* Actions */}
            <div className="px-2 py-1 flex items-center justify-center gap-1">
              {!readOnly && (
                <>
                  <button
                    onClick={() => handleDuplicateLine(index)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveLine(index)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Line Row */}
      {!readOnly && (
        <button
          onClick={handleAddLine}
          className="w-full py-2 px-4 flex items-center justify-center gap-2 text-sm text-primary hover:bg-primary/5 transition-colors border-t border-border"
        >
          <Plus className="h-4 w-4" />
          Add Line
        </button>
      )}

      {/* Footer with Total */}
      <div className="grid grid-cols-[48px_1fr_120px_100px_80px] bg-muted/30 border-t border-border font-semibold">
        <div className="px-3 py-3" />
        <div className="px-3 py-3 text-sm text-muted-foreground">Total ({lines.length} lines)</div>
        <div className="px-3 py-3" />
        <div className="px-3 py-3 text-right text-primary">{totalHours.toFixed(1)}h</div>
        <div className="px-3 py-3" />
      </div>
    </div>
  );
}

export { createEmptyLine };
