import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Plus, Trash2, Copy, Check, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset, VehicleInfo } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';
import { DecimalHoursInput } from '@/components/shared/DecimalHoursInput';
import { LineTextModal } from '@/components/shared/LineTextModal';

interface LinesGridProps {
  lines: ROLine[];
  onLinesChange: (lines: ROLine[]) => void;
  presets?: Preset[];
  readOnly?: boolean;
  highlightedIds?: string[];
  roVehicle?: VehicleInfo;
  showVehicleChips?: boolean;
  defaultLaborType?: LaborType;
}

function createEmptyLine(lineNo: number, laborType: LaborType = 'customer-pay'): ROLine {
  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    lineNo,
    description: '',
    hoursPaid: 0,
    laborType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const LABOR_TYPE_OPTIONS: { value: LaborType | ''; label: string; short: string }[] = [
  { value: '', label: 'Default', short: '-' },
  { value: 'warranty', label: 'Warranty', short: 'W' },
  { value: 'customer-pay', label: 'Customer Pay', short: 'CP' },
  { value: 'internal', label: 'Internal', short: 'I' },
];

export function LinesGrid({ lines, onLinesChange, presets = [], readOnly = false, highlightedIds = [], roVehicle, showVehicleChips = true, defaultLaborType = 'customer-pay' }: LinesGridProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());
  const [expandedLine, setExpandedLine] = useState<{ lineNo: number; description: string; id: string } | null>(null);

  const handleAddLine = () => {
    const newLine = createEmptyLine(lines.length + 1, defaultLaborType);
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

  const totalHours = lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0);
  const tbdCount = lines.filter(l => l.isTbd).length;

  return (
    <>
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Table Header */}
      <div className="grid grid-cols-[48px_1fr_120px_60px_100px_80px] bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <div className="px-3 py-2 text-center">#</div>
        <div className="px-3 py-2">Description</div>
        <div className="px-3 py-2">Type</div>
        <div className="px-3 py-2 text-center">TBD</div>
        <div className="px-3 py-2 text-right">Hours</div>
        <div className="px-3 py-2 text-center">Actions</div>
      </div>

      {/* Table Body - scrollable */}
      <div className="max-h-[400px] overflow-y-auto">
        {lines.map((line, index) => (
          <div
            key={line.id}
            data-line-id={line.id}
            className={cn(
              "grid grid-cols-[48px_1fr_120px_60px_100px_80px] border-b border-border/50 hover:bg-muted/30 transition-colors",
              index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
              line.isTbd && 'opacity-60',
              highlightedIds.includes(line.id) && 'ring-2 ring-primary ring-inset bg-primary/10'
            )}
          >
            {/* Line Number */}
            <div className="px-3 py-2 text-center text-sm font-medium text-muted-foreground flex items-center justify-center">
              {line.lineNo}
            </div>

            {/* Description */}
            <div className="px-2 py-1 flex items-center gap-1 group">
              <input
                ref={(el) => setRef(`${index}-description`, el)}
                type="text"
                value={line.description}
                onChange={(e) => handleLineChange(index, { description: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                placeholder="Job description..."
                disabled={readOnly}
                className="flex-1 h-8 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded text-sm focus:outline-none transition-colors disabled:opacity-60"
              />
              <button
                onClick={() => setExpandedLine({ lineNo: line.lineNo, description: line.description, id: line.id })}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0"
                title="View full description"
                aria-label="View full description"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setExpandedLine({ lineNo: line.lineNo, description: line.description, id: line.id }); }}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              {showVehicleChips && (() => {
                const veh = line.vehicleOverride && line.lineVehicle ? line.lineVehicle : roVehicle;
                const chip = formatVehicleChip(veh);
                return chip ? (
                  <span className="inline-flex items-center ml-1 px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-medium rounded whitespace-nowrap">
                    🚗 {chip}
                  </span>
                ) : null;
              })()}
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

            {/* TBD Toggle */}
            <div className="px-2 py-1 flex items-center justify-center">
              {!readOnly && (
                <button
                  onClick={() => handleLineChange(index, { isTbd: !line.isTbd })}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] font-bold transition-colors',
                    line.isTbd
                      ? 'bg-warning/20 text-warning border border-warning/40'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  TBD
                </button>
              )}
              {readOnly && line.isTbd && (
                <span className="px-2 py-1 bg-warning/20 text-warning text-[10px] font-bold rounded">TBD</span>
              )}
            </div>

            {/* Hours */}
            <div className="px-2 py-1">
              <DecimalHoursInput
                value={line.hoursPaid}
                onChange={(v) => handleHoursChange(index, v)}
                placeholder={line.isTbd ? '—' : '0.0'}
                disabled={readOnly}
                className={cn(
                  'w-full h-8 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded text-sm text-right font-medium focus:outline-none transition-colors disabled:opacity-60',
                  line.isTbd && 'line-through text-muted-foreground'
                )}
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
      <div className="grid grid-cols-[48px_1fr_120px_60px_100px_80px] bg-muted/30 border-t border-border font-semibold">
        <div className="px-3 py-3" />
        <div className="px-3 py-3 text-sm text-muted-foreground">
          Total ({lines.length} lines)
          {tbdCount > 0 && (
            <span className="ml-2 text-warning text-xs font-medium">
              • {tbdCount} TBD
            </span>
          )}
        </div>
        <div className="px-3 py-3" />
        <div className="px-3 py-3" />
        <div className="px-3 py-3 text-right text-primary">{totalHours.toFixed(1)}h</div>
        <div className="px-3 py-3" />
      </div>
    </div>

    {/* Full description modal */}
    <LineTextModal
      open={!!expandedLine}
      onClose={() => setExpandedLine(null)}
      lineNo={expandedLine?.lineNo ?? 0}
      description={expandedLine?.description ?? ''}
    />
    </>
  );
}

export { createEmptyLine };
