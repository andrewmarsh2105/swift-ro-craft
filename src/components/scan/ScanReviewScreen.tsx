import { useState } from 'react';
import { ChevronLeft, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generateLineId, type ExtractedData, type ExtractedLine, type CandidateDate } from '@/lib/scanStateMachine';
import type { ScanApplyData } from './ScanFlow';
import type { ROLine } from '@/types/ro';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ScanReviewScreenProps {
  extractedData: ExtractedData;
  imagePreviewUrl: string | null;
  showConfidence: boolean;
  hasExistingLines: boolean;
  onUpdateData: (data: ExtractedData) => void;
  onApply: (data: ScanApplyData) => void;
  onRetake: () => void;
  onClose: () => void;
}

const LABOR_TYPES = [
  { value: 'warranty', label: 'W' },
  { value: 'customer-pay', label: 'CP' },
  { value: 'internal', label: 'Int' },
] as const;

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    : pct >= 50 ? 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  return <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', color)}>{pct}%</span>;
}

export function ScanReviewScreen({
  extractedData,
  imagePreviewUrl,
  showConfidence,
  hasExistingLines,
  onUpdateData,
  onApply,
  onRetake,
  onClose,
}: ScanReviewScreenProps) {
  const isMobile = useIsMobile();
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [showDateCandidates, setShowDateCandidates] = useState(false);
  const [userEditedDate, setUserEditedDate] = useState(false);
  const [data, setData] = useState(extractedData);

  const updateField = (field: keyof Pick<ExtractedData, 'roNumber' | 'advisor' | 'date' | 'customerName' | 'mileage'>, value: string) => {
    const updated = { ...data, [field]: value || null };
    setData(updated);
    onUpdateData(updated);
  };

  const updateLine = (lineId: string, field: keyof ExtractedLine, value: any) => {
    const updated = {
      ...data,
      lines: data.lines.map(l => l.id === lineId ? { ...l, [field]: value } : l),
    };
    setData(updated);
    onUpdateData(updated);
  };

  const addLine = () => {
    const newLine: ExtractedLine = {
      id: generateLineId(),
      description: '',
      hours: 0,
      laborType: 'customer-pay',
      confidence: 1,
    };
    const updated = { ...data, lines: [...data.lines, newLine] };
    setData(updated);
    onUpdateData(updated);
  };

  const removeLine = (lineId: string) => {
    const updated = { ...data, lines: data.lines.filter(l => l.id !== lineId) };
    setData(updated);
    onUpdateData(updated);
  };

  const buildApplyData = (mode: 'prepend' | 'replace'): ScanApplyData => {
    const lines: ROLine[] = data.lines.map((line, i) => ({
      id: line.id,
      lineNo: i + 1,
      description: line.description,
      hoursPaid: line.hours,
      laborType: line.laborType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    return {
      roNumber: data.roNumber || undefined,
      advisor: data.advisor || undefined,
      date: data.date || undefined,
      customerName: data.customerName || undefined,
      mileage: data.mileage || undefined,
      vehicle: (data.vehicleYear || data.vehicleMake || data.vehicleModel)
        ? { year: data.vehicleYear ?? undefined, make: data.vehicleMake ?? undefined, model: data.vehicleModel ?? undefined }
        : undefined,
      lines,
      mode,
    };
  };

  const handleApplyClick = () => {
    if (hasExistingLines) {
      setShowApplyPrompt(true);
    } else {
      onApply(buildApplyData('prepend'));
      toast.success('Scan applied');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border safe-top">
        <button
          onClick={onRetake}
          className="p-2 tap-target touch-feedback flex items-center gap-1 text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
          Retake
        </button>
        <h2 className="font-semibold text-lg">Review Scan</h2>
        <button onClick={onClose} className="text-sm text-muted-foreground">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Image Preview */}
        {imagePreviewUrl && (
          <div className={cn('m-4 rounded-2xl overflow-hidden', isMobile ? 'aspect-video' : 'h-48')}>
            <img
              src={imagePreviewUrl}
              alt="Scanned RO"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Extracted Fields */}
        <div className="px-4 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Extracted Fields
          </h3>

          <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
            {/* RO Number */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">RO Number</label>
                {showConfidence && data.fieldConfidence.roNumber > 0 && (
                  <ConfidenceBadge value={data.fieldConfidence.roNumber} />
                )}
              </div>
              <input
                type="text"
                value={data.roNumber || ''}
                onChange={e => updateField('roNumber', e.target.value)}
                placeholder="—"
                className="w-full h-10 px-3 bg-muted rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Advisor */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Advisor</label>
                {showConfidence && data.fieldConfidence.advisor > 0 && (
                  <ConfidenceBadge value={data.fieldConfidence.advisor} />
                )}
              </div>
              <input
                type="text"
                value={data.advisor || ''}
                onChange={e => updateField('advisor', e.target.value)}
                placeholder="—"
                className="w-full h-10 px-3 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Date */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                {showConfidence && data.fieldConfidence.date > 0 && (
                  <ConfidenceBadge value={data.fieldConfidence.date} />
                )}
              </div>
              <input
                type="date"
                value={data.date || ''}
                onChange={e => {
                  setUserEditedDate(true);
                  updateField('date', e.target.value);
                }}
                className="w-full h-10 px-3 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {/* Candidate dates dropdown */}
              {data.candidateDates.length >= 2 && !userEditedDate && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDateCandidates(!showDateCandidates)}
                    className="flex items-center gap-1 text-xs text-primary font-medium mt-1"
                  >
                    <ChevronDown className={cn('h-3 w-3 transition-transform', showDateCandidates && 'rotate-180')} />
                    {data.candidateDates.length} dates detected
                  </button>
                  {showDateCandidates && (
                    <div className="mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                      {data.candidateDates.map((c, i) => (
                        <button
                          key={`${c.value}-${i}`}
                          type="button"
                          onClick={() => {
                            updateField('date', c.value);
                            setShowDateCandidates(false);
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-muted/50 transition-colors',
                            c.value === data.date && 'bg-primary/10 font-medium'
                          )}
                        >
                          <span>{c.value}</span>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded',
                            c.source === 'header'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {c.source === 'header' ? 'Header' : 'Text'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Customer */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Customer</label>
              <input
                type="text"
                value={data.customerName || ''}
                onChange={e => updateField('customerName', e.target.value)}
                placeholder="—"
                className="w-full h-10 px-3 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Mileage */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mileage</label>
              <input
                type="text"
                inputMode="numeric"
                value={data.mileage || ''}
                onChange={e => updateField('mileage', e.target.value)}
                placeholder="—"
                className="w-full h-10 px-3 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Vehicle (optional) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Vehicle</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.vehicleYear || ''}
                  onChange={e => {
                    const updated = { ...data, vehicleYear: parseInt(e.target.value) || null };
                    setData(updated);
                    onUpdateData(updated);
                  }}
                  placeholder="Year"
                  maxLength={4}
                  className="w-16 h-10 px-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={data.vehicleMake || ''}
                  onChange={e => {
                    const updated = { ...data, vehicleMake: e.target.value || null };
                    setData(updated);
                    onUpdateData(updated);
                  }}
                  placeholder="Make"
                  className="flex-1 h-10 px-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={data.vehicleModel || ''}
                  onChange={e => {
                    const updated = { ...data, vehicleModel: e.target.value || null };
                    setData(updated);
                    onUpdateData(updated);
                  }}
                  placeholder="Model"
                  className="flex-1 h-10 px-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="px-4 mt-6 space-y-3 pb-8">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Extracted Lines ({data.lines.length})
            </h3>
            <button
              onClick={addLine}
              className="flex items-center gap-1 text-primary text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {data.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No lines detected. Add lines manually or retake photo.
            </p>
          ) : (
            <div className="space-y-2">
              {data.lines.map((line, idx) => (
                <div key={line.id} className="p-3 bg-muted/50 rounded-xl border border-border space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground font-mono mt-2 w-5">{idx + 1}</span>
                    <div className="flex-1 space-y-2">
                      {/* Description */}
                      <input
                        type="text"
                        value={line.description}
                        onChange={e => updateLine(line.id, 'description', e.target.value)}
                        placeholder="Line description"
                        className="w-full h-9 px-2 bg-background rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {/* Hours + Type row */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.hours || ''}
                          onChange={e => {
                            const val = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                            updateLine(line.id, 'hours', parseFloat(val) || 0);
                          }}
                          placeholder="Hours"
                          className="w-20 h-8 px-2 bg-background rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <select
                          value={line.laborType}
                          onChange={e => updateLine(line.id, 'laborType', e.target.value)}
                          className="h-8 px-2 bg-background rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {LABOR_TYPES.map(lt => (
                            <option key={lt.value} value={lt.value}>{lt.label}</option>
                          ))}
                        </select>
                        {showConfidence && <ConfidenceBadge value={line.confidence} />}
                      </div>
                    </div>
                    <button
                      onClick={() => removeLine(line.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="p-4 border-t border-border safe-bottom">
        <button
          onClick={handleApplyClick}
          disabled={data.lines.length === 0}
          className={cn(
            'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 tap-target touch-feedback',
            data.lines.length > 0
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Check className="h-5 w-5" />
          Apply to RO
        </button>
      </div>

      {/* Apply mode prompt */}
      <Dialog open={showApplyPrompt} onOpenChange={setShowApplyPrompt}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add scanned lines</DialogTitle>
            <DialogDescription>
              This RO already has lines. How would you like to add the scanned lines?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => {
                setShowApplyPrompt(false);
                onApply(buildApplyData('prepend'));
                toast.success('Scanned lines added at top');
              }}
              className="w-full"
            >
              Add to top (keep existing)
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowApplyPrompt(false);
                onApply(buildApplyData('replace'));
                toast.success('Existing lines replaced');
              }}
              className="w-full"
            >
              Replace existing lines
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowApplyPrompt(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
