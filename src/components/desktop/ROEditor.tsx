import { useState, useEffect, useRef } from 'react';
import { Camera, X, ChevronDown, ChevronUp, Save, Plus, Upload, Calendar, User, Clock, FileText } from 'lucide-react';
import { localDateStr } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LinesGrid, createEmptyLine } from './LinesGrid';
import { AdvisorCombobox } from './AdvisorCombobox';
import { StatusPill } from '@/components/mobile/StatusPill';
import { ScanFlow, type ScanApplyData } from '@/components/scan/ScanFlow';
import { useRO } from '@/contexts/ROContext';
import type { LaborType, ROLine, RepairOrder } from '@/types/ro';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ROEditorProps {
  ro?: RepairOrder | null;
  isNew?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  onSaveAndAddAnother?: () => void;
}

const LABOR_TYPES: { value: LaborType; label: string }[] = [
  { value: 'warranty', label: 'Warranty' },
  { value: 'customer-pay', label: 'Customer Pay' },
  { value: 'internal', label: 'Internal' },
];

export function ROEditor({ ro, isNew = false, onSave, onCancel, onSaveAndAddAnother }: ROEditorProps) {
  const { settings, addRO, updateRO, updateAdvisors } = useRO();
  
  // Form state
  const [roNumber, setRoNumber] = useState(ro?.roNumber || '');
  const [advisor, setAdvisor] = useState(ro?.advisor || '');
  const [customerName, setCustomerName] = useState(ro?.customerName || '');
  const [date, setDate] = useState(ro?.date || localDateStr());
  const [laborType, setLaborType] = useState<LaborType>(ro?.laborType || 'customer-pay');
  const [notes, setNotes] = useState(ro?.notes || '');
  const [lines, setLines] = useState<ROLine[]>(() => {
    if (ro?.lines?.length) return ro.lines.map(l => ({ ...l, laborType: l.laborType || 'customer-pay' }));
    if (ro && ro.paidHours > 0) {
      return [{
        id: Date.now().toString(),
        lineNo: 1,
        description: ro.workPerformed || 'General Labor',
        hoursPaid: ro.paidHours,
        laborType: ro.laborType || 'customer-pay',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
    }
    return [createEmptyLine(1)];
  });
  const [showNotes, setShowNotes] = useState(!!ro?.notes);
  const [showScanFlow, setShowScanFlow] = useState(false);
  const [highlightedLineIds, setHighlightedLineIds] = useState<string[]>([]);

  // Sync with ro prop changes
  useEffect(() => {
    if (ro) {
      setRoNumber(ro.roNumber);
      setAdvisor(ro.advisor);
      setCustomerName(ro.customerName || '');
      setDate(ro.date);
      setLaborType(ro.laborType);
      setNotes(ro.notes || '');
      if (ro.lines?.length) {
        setLines(ro.lines);
      } else if (ro.paidHours > 0) {
        setLines([{
          id: Date.now().toString(),
          lineNo: 1,
          description: ro.workPerformed || 'General Labor',
          hoursPaid: ro.paidHours,
          laborType: ro.laborType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]);
      }
    } else if (isNew) {
      setRoNumber('');
      setAdvisor('');
      setCustomerName('');
      setDate(localDateStr());
      setLaborType('customer-pay');
      setNotes('');
      setLines([createEmptyLine(1)]);
      setShowNotes(false);
    }
  }, [ro, isNew]);

  // Clear highlights after 2 seconds
  useEffect(() => {
    if (highlightedLineIds.length > 0) {
      const timer = setTimeout(() => setHighlightedLineIds([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedLineIds]);

  const totalHours = lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0);
  const tbdCount = lines.filter(l => l.isTbd).length;
  const isValid = roNumber.trim() !== '' && advisor.trim() !== '' && (totalHours > 0 || tbdCount > 0);

  const handleScanApply = (data: ScanApplyData) => {
    if (data.roNumber) setRoNumber(data.roNumber);
    if (data.advisor) setAdvisor(data.advisor);
    if (data.date) setDate(data.date);
    if (data.customerName) setCustomerName(data.customerName);

    const newLineIds = data.lines.map(l => l.id);

    if (data.mode === 'replace') {
      setLines(data.lines.map((l, i) => ({ ...l, lineNo: i + 1 })));
    } else {
      setLines(prev => {
        const filtered = prev.filter(l => l.description || l.hoursPaid > 0);
        return [...data.lines, ...filtered].map((l, i) => ({ ...l, lineNo: i + 1 }));
      });
    }

    setHighlightedLineIds(newLineIds);
    setShowScanFlow(false);
  };

  const handleSave = (addAnother: boolean = false) => {
    const computedWorkPerformed = lines.map(l => l.description).filter(Boolean).join('\n');
    
    const roData = {
      roNumber,
      advisor,
      customerName: customerName.trim() || undefined,
      paidHours: totalHours,
      laborType,
      workPerformed: computedWorkPerformed,
      notes,
      date,
      photos: ro?.photos,
      lines,
      isSimpleMode: false,
    };

    if (ro) {
      updateRO(ro.id, roData);
      toast.success('RO updated');
    } else {
      addRO(roData);
      toast.success('RO created');
    }

    if (addAnother) {
      setRoNumber('');
      setCustomerName('');
      setNotes('');
      setLines([createEmptyLine(1)]);
      setShowNotes(false);
      onSaveAndAddAnother?.();
    } else {
      onSave?.();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sticky Header Strip */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* RO Number */}
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={roNumber}
                onChange={(e) => setRoNumber(e.target.value)}
                placeholder="RO #"
                className="w-24 h-8 px-2 bg-muted rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Advisor */}
            <AdvisorCombobox
              value={advisor}
              onChange={setAdvisor}
              advisors={settings.advisors}
              onCreateAdvisor={(name) => {
                const newAdvisor = { id: Date.now().toString(), name };
                updateAdvisors([...settings.advisors, newAdvisor]);
              }}
            />

            {/* Labor Type */}
            <select
              value={laborType}
              onChange={(e) => setLaborType(e.target.value as LaborType)}
              className="h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {LABOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Customer Name */}
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer (optional)"
              className="h-8 px-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary w-36"
            />
          </div>

          {/* Right-aligned actions: Upload icon + Total */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowScanFlow(true)}
              className="h-8 w-8 flex items-center justify-center bg-secondary rounded hover:bg-secondary/80 transition-colors"
              title="Upload RO Photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold text-primary">{totalHours.toFixed(1)}h</span>
              {tbdCount > 0 && (
                <span className="text-xs text-warning font-medium">({tbdCount} TBD)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Presets Toolbar */}
      {settings.presets.length > 0 && (
        <div className="flex-shrink-0 border-b border-border bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <span className="text-xs text-muted-foreground font-medium flex-shrink-0">Quick Add:</span>
            {settings.presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
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
                  const updatedLines = [newLine, ...lines].map((l, i) => ({ ...l, lineNo: i + 1 }));
                  setLines(updatedLines);
                  setHighlightedLineIds([newLine.id]);
                  toast.success(`Added: ${preset.name} (${preset.defaultHours || 0}h)`);
                }}
                className="flex-shrink-0 px-3 py-1.5 bg-card border border-border rounded text-xs font-medium hover:bg-primary/10 hover:border-primary/30 transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3 w-3" />
                {preset.name}
                {preset.defaultHours && <span className="opacity-60">({preset.defaultHours}h)</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - Lines Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <LinesGrid
          lines={lines}
          onLinesChange={setLines}
          presets={settings.presets}
          highlightedIds={highlightedLineIds}
        />

        {/* Notes Section */}
        <div className="mt-4">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Notes
          </button>
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full mt-2 p-3 bg-muted rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isNew && (
              <button
                onClick={() => handleSave(true)}
                disabled={!isValid}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                  isValid
                    ? 'border-primary text-primary hover:bg-primary/10'
                    : 'border-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                Save + Add Another
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={!isValid}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors',
                isValid
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Scan Flow */}
      <ScanFlow
        isOpen={showScanFlow}
        onClose={() => setShowScanFlow(false)}
        onApply={handleScanApply}
        roId={ro?.id}
        hasExistingLines={lines.some(l => l.description.trim() !== '' || l.hoursPaid > 0)}
      />
    </div>
  );
}
