import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Plus, Trash2, Maximize2, Minimize2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calcLineHours } from '@/lib/roDisplay';
import { toast } from 'sonner';
import type { ROLine, LaborType, Preset, VehicleInfo } from '@/types/ro';
import { formatVehicleChip } from '@/types/ro';
import { DecimalHoursInput } from '@/components/shared/DecimalHoursInput';
import { createEmptyLine } from '@/lib/roLine';

interface LinesGridProps {
  lines: ROLine[];
  onLinesChange: (lines: ROLine[]) => void;
  presets?: Preset[];
  readOnly?: boolean;
  highlightedIds?: string[];
  roVehicle?: VehicleInfo;
  showVehicleChips?: boolean;
  defaultLaborType?: LaborType;
  onSaveAsPreset?: (line: ROLine) => void;
}


const LABOR_TYPE_OPTIONS: { value: LaborType | ''; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'customer-pay', label: 'Customer Pay' },
  { value: 'internal', label: 'Internal' },
];

/** Auto-grow textarea: adjusts height to fit content */
function AutoTextarea({
  value,
  onChange,
  onKeyDown,
  disabled,
  placeholder,
  onRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  onRef?: (el: HTMLTextAreaElement | null) => void;
}) {
  const internalRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        onRef?.(el);
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={cn(
        'w-full resize-none overflow-hidden bg-transparent border border-transparent',
        'hover:border-border focus:border-primary focus:bg-background',
        'rounded-[10px] px-2 py-1.5 text-sm leading-relaxed focus:outline-none transition-colors',
        'disabled:opacity-60 min-h-[36px]'
      )}
    />
  );
}

export function LinesGrid({
  lines,
  onLinesChange,
  presets = [],
  readOnly = false,
  highlightedIds = [],
  roVehicle,
  showVehicleChips = true,
  defaultLaborType = 'customer-pay',
  onSaveAsPreset,
}: LinesGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const handleAddLine = () => {
    const newLine = createEmptyLine(lines.length + 1, defaultLaborType);
    onLinesChange([...lines, newLine]);
    setTimeout(() => {
      const key = `${lines.length}-description`;
      inputRefs.current.get(key)?.focus();
    }, 50);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      toast.error('Cannot remove the last line');
      return;
    }
    const updatedLines = lines
      .filter((_, i) => i !== index)
      .map((line, i) => ({ ...line, lineNo: i + 1 }));
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
      // In expanded textarea, Enter should just insert newline — don't nav
      if (colName === 'description' && expandedId === lines[rowIndex]?.id && e.key === 'Enter') return;

      e.preventDefault();
      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.shiftKey) {
        nextCol--;
        if (nextCol < 0) { nextCol = cols.length - 1; nextRow--; }
      } else {
        nextCol++;
        if (nextCol >= cols.length) { nextCol = 0; nextRow++; }
      }

      if (nextRow >= lines.length && !e.shiftKey) {
        handleAddLine();
        nextRow = lines.length;
      } else if (nextRow < 0) {
        nextRow = 0;
      }

      setTimeout(() => {
        const key = `${nextRow}-${cols[nextCol]}`;
        const el = inputRefs.current.get(key);
        if (el) { el.focus(); if ('select' in el) el.select(); }
      }, 50);
    }
  };

  const setRef = (key: string, el: HTMLInputElement | HTMLSelectElement | null) => {
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  };

  const setTextareaRef = (id: string, el: HTMLTextAreaElement | null) => {
    if (el) textareaRefs.current.set(id, el);
    else textareaRefs.current.delete(id);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    // Focus textarea after expand
    if (expandedId !== id) {
      setTimeout(() => {
        textareaRefs.current.get(id)?.focus();
      }, 60);
    }
  };

  const totalHours = calcLineHours(lines);
  const tableColumns = 'grid-cols-[40px_minmax(0,1fr)_minmax(90px,0.6fr)_minmax(64px,0.4fr)_72px]';

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Table Header */}
      <div className={cn('grid bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide', tableColumns)}>
        <div className="px-3 py-2 text-center">#</div>
        <div className="px-3 py-2">Description</div>
        <div className="px-3 py-2">Type</div>
        <div className="px-3 py-2 text-right">Hours</div>
        <div className="px-3 py-2 text-center">Actions</div>
      </div>

      {/* Table Body */}
      <div>
        {lines.map((line, index) => {
          const isExpanded = expandedId === line.id;
          const isHighlighted = highlightedIds.includes(line.id);

          return (
            <div
              key={line.id}
              data-line-id={line.id}
              className={cn(
                'border-b border-border/50 transition-colors overflow-hidden',
                index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                isHighlighted && 'ring-2 ring-primary ring-inset bg-primary/10'
              )}
            >
              {/* Compact row — always visible */}
              <div className={cn('grid hover:bg-muted/30 transition-colors', tableColumns)}>
                {/* Line Number */}
                <div className="px-3 py-2 text-center text-sm font-medium text-muted-foreground flex items-center justify-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">
                    {line.lineNo}
                  </span>
                </div>

                {/* Description (compact, truncated) */}
                <div className="px-2 py-1 flex items-center gap-1 min-w-0 group">
                  <input
                    ref={(el) => setRef(`${index}-description`, el)}
                    type="text"
                    value={line.description}
                    onChange={(e) => handleLineChange(index, { description: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                    placeholder="Job description..."
                    disabled={readOnly}
                    className="flex-1 h-8 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded-[10px] text-sm focus:outline-none transition-colors disabled:opacity-60 truncate"
                  />
                  {/* Expand/collapse button — original Maximize2 style */}
                  {!readOnly && (
                    <button
                      onClick={() => toggleExpand(line.id)}
                      className={cn(
                        'p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0',
                        isExpanded ? 'opacity-100 text-primary hover:text-primary' : 'opacity-0 group-hover:opacity-100'
                      )}
                      title={isExpanded ? 'Collapse' : 'Expand description'}
                      aria-label={isExpanded ? 'Collapse line' : 'Expand line'}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') toggleExpand(line.id); }}
                    >
                      {isExpanded
                        ? <Minimize2 className="h-3.5 w-3.5" />
                        : <Maximize2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  )}
                  {showVehicleChips && (() => {
                    const veh = line.vehicleOverride && line.lineVehicle ? line.lineVehicle : roVehicle;
                    const chip = formatVehicleChip(veh);
                    return chip ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-accent text-accent-foreground text-[10px] font-medium rounded-full whitespace-nowrap flex-shrink-0">
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
                    onChange={(e) =>
                      handleLineChange(index, {
                        laborType: (e.target.value as LaborType | undefined) || undefined,
                      })
                    }
                    onKeyDown={(e) => handleKeyDown(e, index, 'laborType')}
                    disabled={readOnly}
                    className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded-[10px] text-sm focus:outline-none transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {LABOR_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
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
                    className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-border focus:border-primary focus:bg-background rounded-[10px] text-sm text-right font-medium tabular-nums focus:outline-none transition-colors disabled:opacity-60"
                  />
                </div>

                {/* Actions */}
                <div className="px-2 py-1 flex items-center justify-center gap-0.5">
                  {!readOnly && (
                    <>
                      {onSaveAsPreset && (
                        <button
                          onClick={() => onSaveAsPreset(line)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Save as preset"
                        >
                          <Zap className="h-3.5 w-3.5" />
                        </button>
                      )}
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

              {/* Expanded description editor — inline below the row, no overlay */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-2 border-t border-border/40 bg-muted/5 animate-in fade-in-0 duration-150">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                    Full Description
                  </label>
                  <AutoTextarea
                    value={line.description}
                    onChange={(v) => handleLineChange(index, { description: v })}
                    placeholder="Job description…"
                    disabled={readOnly}
                    onRef={(el) => setTextareaRef(line.id, el)}
                  />
                </div>
              )}
            </div>
          );
        })}
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
      <div className={cn('grid bg-muted/30 border-t border-border font-semibold', tableColumns)}>
        <div className="px-3 py-3" />
        <div className="px-3 py-3 text-sm text-muted-foreground">
          Total ({lines.length} lines)
        </div>
        <div className="px-3 py-3" />
        <div className="px-3 py-3 text-right text-primary tabular-nums">{totalHours.toFixed(1)}h</div>
        <div className="px-3 py-3" />
      </div>
    </div>
  );
}
