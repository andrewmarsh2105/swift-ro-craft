import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Plus, Trash2, Check, ChevronDown, AlertTriangle, FileImage, Camera, Image, Loader2, Clock, X, ZoomIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generateLineId, normalizeDesc, type ExtractedData, type ExtractedLine, type ScanPage, type HeaderConflict } from '@/lib/scanStateMachine';
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
  existingLineDescriptions: string[];
  pages: ScanPage[];
  pendingHeaderConflicts: HeaderConflict[];
  isAddingPage: boolean;
  errorMessage: string | null;
  onUpdateData: (data: ExtractedData) => void;
  onApply: (data: ScanApplyData) => void;
  onRetake: () => void;
  onClose: () => void;
  onAddPage: (file: File) => void;
  onResolveConflicts: (resolutions: Record<string, 'keep' | 'replace'>) => void;
  onCancelPendingPage: () => void;
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

function PageBadge({ page }: { page: number }) {
  return (
    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase tracking-wide">
      Pg {page}
    </span>
  );
}

export function ScanReviewScreen({
  extractedData,
  imagePreviewUrl,
  showConfidence,
  hasExistingLines,
  existingLineDescriptions,
  pages,
  pendingHeaderConflicts,
  isAddingPage,
  errorMessage,
  onUpdateData,
  onApply,
  onRetake,
  onClose,
  onAddPage,
  onResolveConflicts,
  onCancelPendingPage,
}: ScanReviewScreenProps) {
  const isMobile = useIsMobile();
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [showDateCandidates, setShowDateCandidates] = useState(false);
  const [userEditedDate, setUserEditedDate] = useState(false);
  const [data, setData] = useState(extractedData);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [pendingApplyData, setPendingApplyData] = useState<ScanApplyData | null>(null);
  const [duplicateDescriptions, setDuplicateDescriptions] = useState<string[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'keep' | 'replace'>>({});
  /** IDs of newly-added lines (from the most recent page append) — highlighted briefly */
  const [newLineIds, setNewLineIds] = useState<Set<string>>(new Set());
  /** Full-screen lightbox image URL */
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const addPageCameraRef = useRef<HTMLInputElement>(null);
  const addPagePhotoRef = useRef<HTMLInputElement>(null);
  const addPageDesktopRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const pageCount = pages.length;
  const isMultiPage = pageCount > 1;

  // Keep local data in sync when parent pushes new pages
  const prevLinesRef = useRef<string[]>(data.lines.map(l => l.id));
  const latestExtracted = extractedData;

  useEffect(() => {
    const prevIds = new Set(prevLinesRef.current);
    const nextIds = latestExtracted.lines.map(l => l.id);
    const added = nextIds.filter(id => !prevIds.has(id));
    if (added.length > 0) {
      setNewLineIds(new Set(added));
      setTimeout(() => setNewLineIds(new Set()), 2500);
    }
    prevLinesRef.current = nextIds;
    setData(latestExtracted);
  }, [latestExtracted]);

  // Auto-scroll to top when new page lines arrive
  useEffect(() => {
    if (newLineIds.size > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [newLineIds]);

  const existingNormalized = useMemo(
    () => new Set(existingLineDescriptions.map(normalizeDesc).filter(t => t.length > 0)),
    [existingLineDescriptions]
  );

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
      isTbd: false,
    };
    const updated = { ...data, lines: [newLine, ...data.lines] };
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
      isTbd: line.isTbd || false,
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
      vehicle: (data.vehicleYear || data.vehicleMake || data.vehicleModel || data.vehicleVin)
        ? { year: data.vehicleYear ?? undefined, make: data.vehicleMake ?? undefined, model: data.vehicleModel ?? undefined, vin: data.vehicleVin ?? undefined }
        : undefined,
      lines,
      mode,
    };
  };

  const findDuplicates = (applyData: ScanApplyData): string[] => {
    if (existingNormalized.size === 0) return [];
    return applyData.lines
      .filter(l => existingNormalized.has(normalizeDesc(l.description)))
      .map(l => l.description);
  };

  const applyWithDuplicateCheck = (applyData: ScanApplyData, successMsg: string) => {
    const dupes = findDuplicates(applyData);
    if (dupes.length > 0) {
      setDuplicateDescriptions(dupes);
      setPendingApplyData(applyData);
      setShowDuplicatePrompt(true);
    } else {
      onApply(applyData);
      toast.success(successMsg);
    }
  };



  const handleApplyClick = () => {
    if (hasExistingLines) {
      setShowApplyPrompt(true);
    } else {
      const applyData = buildApplyData('prepend');
      applyWithDuplicateCheck(applyData, 'Scan applied');
    }
  };

  const handleAddPageFile = (file: File) => {
    onAddPage(file);
  };

  // Group lines by source page for multi-page display
  const linesByPage = useMemo(() => {
    if (!isMultiPage) return null;
    const map = new Map<number, ExtractedLine[]>();
    for (const line of data.lines) {
      const pg = line.sourcePage ?? 1;
      if (!map.has(pg)) map.set(pg, []);
      map.get(pg)!.push(line);
    }
    // Sort pages descending so newest page appears first
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [data.lines, isMultiPage]);

  const crossPageDupes = useMemo(() => {
    if (!isMultiPage) return [];
    const seen = new Map<string, string>();
    const dupes: { lineId: string; description: string }[] = [];
    for (const line of data.lines) {
      const norm = normalizeDesc(line.description);
      if (!norm) continue;
      const existingPage = seen.get(norm);
      if (existingPage !== undefined && existingPage !== String(line.sourcePage ?? 1)) {
        dupes.push({ lineId: line.id, description: line.description });
      } else {
        seen.set(norm, String(line.sourcePage ?? 1));
      }
    }
    return dupes;
  }, [data.lines, isMultiPage]);

  // Header conflict dialog
  if (pendingHeaderConflicts.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border safe-top">
          <div />
          <h2 className="font-semibold text-lg">Header Conflict</h2>
          <button onClick={onCancelPendingPage} className="text-sm text-muted-foreground">Cancel</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Page {pendingHeaderConflicts[0].pageNumber} has different header values. Choose which to keep:
            </p>
          </div>

          {pendingHeaderConflicts.map(conflict => {
            const label = conflict.field === 'roNumber' ? 'RO Number' : conflict.field === 'date' ? 'Date' : 'Mileage';
            const resolution = conflictResolutions[conflict.field] ?? 'keep';
            return (
              <div key={conflict.field} className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-semibold">{label}</p>
                <button
                  onClick={() => setConflictResolutions(r => ({ ...r, [conflict.field]: 'keep' }))}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg border-2 transition-colors',
                    resolution === 'keep' ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                  )}
                >
                  <div className="text-xs text-muted-foreground mb-0.5">Keep (Page 1)</div>
                  <div className="font-semibold">{conflict.existingValue}</div>
                </button>
                <button
                  onClick={() => setConflictResolutions(r => ({ ...r, [conflict.field]: 'replace' }))}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg border-2 transition-colors',
                    resolution === 'replace' ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                  )}
                >
                  <div className="text-xs text-muted-foreground mb-0.5">Replace (Page {conflict.pageNumber})</div>
                  <div className="font-semibold">{conflict.newValue}</div>
                </button>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-border safe-bottom flex flex-col gap-2">
          <Button
            onClick={() => {
              const finalResolutions: Record<string, 'keep' | 'replace'> = {};
              for (const c of pendingHeaderConflicts) {
                finalResolutions[c.field] = conflictResolutions[c.field] ?? 'keep';
              }
              setConflictResolutions({});
              onResolveConflicts(finalResolutions);
            }}
            className="w-full"
          >
            <Check className="h-4 w-4 mr-2" />
            Confirm & Merge Lines
          </Button>
          <Button variant="outline" onClick={onCancelPendingPage} className="w-full">
            Cancel This Page
          </Button>
        </div>
      </motion.div>
    );
  }

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
        <div className="flex flex-col items-center">
          <h2 className="font-semibold text-lg">Review Scan</h2>
          {pageCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'} scanned
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-sm text-muted-foreground">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-destructive/10 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-xs text-destructive">{errorMessage}</span>
          </div>
        )}

        {/* Page thumbnails strip (multi-page) */}
        {isMultiPage && (
          <div className="px-4 pt-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pages.map(p => (
                <button
                  key={p.pageId}
                  onClick={() => p.imagePreviewUrl && setLightboxUrl(p.imagePreviewUrl)}
                  className="relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 border-primary/30 bg-muted cursor-pointer active:scale-95 transition-transform"
                >
                  {p.imagePreviewUrl ? (
                    <>
                      <img src={p.imagePreviewUrl} alt={`Page ${p.pageNumber}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <ZoomIn className="h-4 w-4 text-white drop-shadow" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5 font-bold">
                    Pg {p.pageNumber}
                  </div>
                </button>
              ))}
              {/* "Add page" mini-slot */}
              <label className="flex-shrink-0 w-16 h-20 rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center cursor-pointer hover:border-primary/60 transition-colors">
                <div className="flex flex-col items-center gap-0.5">
                  <Plus className="h-5 w-5 text-primary/50" />
                  <span className="text-[9px] text-primary/60 font-medium">Add</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPageFile(f); e.target.value = ''; }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Image Preview (single page) */}
        {imagePreviewUrl && !isMultiPage && (
          <button
            onClick={() => setLightboxUrl(imagePreviewUrl)}
            className={cn('m-4 rounded-2xl overflow-hidden relative group cursor-pointer active:scale-[0.98] transition-transform', isMobile ? 'aspect-video' : 'h-48 w-auto')}
          >
            <img
              src={imagePreviewUrl}
              alt="Scanned RO"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="bg-black/40 rounded-full p-2 opacity-70 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full font-medium">
              Tap to inspect
            </span>
          </button>
        )}

        {/* Adding page spinner overlay */}
        {isAddingPage && (
          <div className="mx-4 mt-3 p-3 bg-primary/10 rounded-xl flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-primary">Scanning page {pageCount + 1}…</span>
          </div>
        )}

        {/* Cross-page duplicate warning */}
        {crossPageDupes.length > 0 && (
          <div className="mx-4 mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <span className="text-xs text-yellow-700 dark:text-yellow-300">
              {crossPageDupes.length} duplicate {crossPageDupes.length === 1 ? 'line' : 'lines'} detected across pages. Review below.
            </span>
          </div>
        )}

        {/* Extracted Fields */}
        <div className="px-4 mt-3 space-y-3">
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

            {/* Vehicle */}
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
              <input
                type="text"
                value={data.vehicleVin || ''}
                onChange={e => {
                  const updated = { ...data, vehicleVin: e.target.value.toUpperCase() || null };
                  setData(updated);
                  onUpdateData(updated);
                }}
                placeholder="VIN (optional)"
                maxLength={17}
                className="w-full h-10 px-2 bg-muted rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Lines — grouped by page for multi-page, flat for single-page */}
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
          ) : isMultiPage && linesByPage ? (
            // Multi-page: grouped by page
            <div className="space-y-4">
              {linesByPage.map(([pageNum, pageLines]) => (
                <div key={pageNum}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                      Page {pageNum}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-2">
                    {pageLines.map((line, idx) => (
                      <LineRow
                        key={line.id}
                        line={line}
                        idx={data.lines.indexOf(line)}
                        showConfidence={showConfidence}
                        isNew={newLineIds.has(line.id)}
                        isDuplicate={crossPageDupes.some(d => d.lineId === line.id)}
                        showPageBadge={false}
                        onUpdate={updateLine}
                        onRemove={removeLine}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Single-page: flat list
            <div className="space-y-2">
              {data.lines.map((line, idx) => (
                <LineRow
                  key={line.id}
                  line={line}
                  idx={idx}
                  showConfidence={showConfidence}
                  isNew={newLineIds.has(line.id)}
                  isDuplicate={false}
                  showPageBadge={false}
                  onUpdate={updateLine}
                  onRemove={removeLine}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-border safe-bottom">
        {/* Add more pages */}
        <div className="px-4 pt-3 pb-2">
          {isMobile ? (
            <div className="flex gap-2">
              <label className={cn(
                'flex-1 min-h-[44px] border border-primary text-primary rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform text-sm',
                isAddingPage && 'opacity-50 pointer-events-none'
              )}>
                <Camera className="h-4 w-4" />
                Scan More
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPageFile(f); e.target.value = ''; }}
                  className="hidden"
                  disabled={isAddingPage}
                />
              </label>
              <label className={cn(
                'flex-1 min-h-[44px] border border-border bg-muted/40 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform text-sm',
                isAddingPage && 'opacity-50 pointer-events-none'
              )}>
                <Image className="h-4 w-4" />
                Photos
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPageFile(f); e.target.value = ''; }}
                  className="hidden"
                  disabled={isAddingPage}
                />
              </label>
            </div>
          ) : (
            <label className={cn(
              'w-full min-h-[40px] border border-primary text-primary rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition-colors text-sm',
              isAddingPage && 'opacity-50 pointer-events-none'
            )}>
              <Plus className="h-4 w-4" />
              {isAddingPage ? 'Scanning…' : 'Add More Pages / Lines'}
              <input
                type="file"
                accept="image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPageFile(f); e.target.value = ''; }}
                className="hidden"
                disabled={isAddingPage}
              />
            </label>
          )}
        </div>

        {/* Apply & Save */}
        <div className="px-4 pb-4">
          <button
            onClick={handleApplyClick}
            disabled={data.lines.length === 0 || isAddingPage}
            className={cn(
              'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 tap-target touch-feedback',
              data.lines.length > 0 && !isAddingPage
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Check className="h-5 w-5" />
            Apply & Save RO
            {pageCount > 1 && <span className="text-xs opacity-80 ml-1">({pageCount} pages)</span>}
          </button>
        </div>
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
                const applyData = buildApplyData('prepend');
                applyWithDuplicateCheck(applyData, 'Scanned lines added at top');
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

      {/* Duplicate lines prompt */}
      <Dialog
        open={showDuplicatePrompt}
        onOpenChange={(open) => {
          setShowDuplicatePrompt(open);
          if (!open) {
            setPendingApplyData(null);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Duplicate lines detected
            </DialogTitle>
            <DialogDescription>
              {duplicateDescriptions.length} scanned {duplicateDescriptions.length === 1 ? 'line matches' : 'lines match'} existing lines on this RO:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto space-y-1 px-1">
            {duplicateDescriptions.map((desc, i) => (
              <div key={i} className="text-sm px-3 py-1.5 bg-muted rounded-lg truncate">
                {desc || <span className="text-muted-foreground italic">Empty description</span>}
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={() => {
                if (pendingApplyData) {
                  const dupeNorm = new Set(duplicateDescriptions.map(normalizeDesc));
                  const filtered: ScanApplyData = {
                    ...pendingApplyData,
                    lines: pendingApplyData.lines.filter(l => !dupeNorm.has(normalizeDesc(l.description))),
                  };
                  setShowDuplicatePrompt(false);
                  setPendingApplyData(null);
                  if (filtered.lines.length > 0) {
                    onApply(filtered);
                    toast.success('Duplicates skipped');
                  } else {
                    toast.info('All lines were duplicates — nothing added');
                  }
                }
              }}
              className="w-full"
            >
              Skip duplicates (recommended)
            </Button>
            <Button
              onClick={() => {
                if (pendingApplyData) {
                  setShowDuplicatePrompt(false);
                  onApply(pendingApplyData);
                  setPendingApplyData(null);
                  toast.success('All lines added (including duplicates)');
                }
              }}
              className="w-full"
            >
              Add duplicates anyway
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDuplicatePrompt(false);
                setPendingApplyData(null);
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Image Lightbox ─── */}
      {lightboxUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors safe-top z-10"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Scanned RO — full size"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <p className="absolute bottom-6 left-0 right-0 text-center text-white/60 text-xs safe-bottom">
            Tap outside or ✕ to close
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Sub-component: Line row ───────────────────────────────────────────────

interface LineRowProps {
  line: ExtractedLine;
  idx: number;
  showConfidence: boolean;
  isNew: boolean;
  isDuplicate: boolean;
  showPageBadge: boolean;
  onUpdate: (id: string, field: keyof ExtractedLine, value: any) => void;
  onRemove: (id: string) => void;
}

function LineRow({ line, idx, showConfidence, isNew, isDuplicate, showPageBadge, onUpdate, onRemove }: LineRowProps) {
  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -8 } : false}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 rounded-xl border-2 transition-colors',
      isNew ? 'border-primary/60 bg-primary/10' : isDuplicate ? 'border-yellow-400/60 bg-yellow-50/50 dark:bg-yellow-900/10' : 'bg-muted/50 border-border'
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs text-muted-foreground font-mono mt-2 w-5">{idx + 1}</span>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={line.description}
              onChange={e => onUpdate(line.id, 'description', e.target.value)}
              placeholder="Line description"
              className="flex-1 h-9 px-2 bg-background rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {showPageBadge && line.sourcePage && <PageBadge page={line.sourcePage} />}
            {isDuplicate && (
              <span className="text-[9px] px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded font-bold uppercase">
                Dup
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={line.hours || ''}
              onChange={e => {
                const val = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                onUpdate(line.id, 'hours', parseFloat(val) || 0);
              }}
              placeholder="Hours"
              className="w-20 h-8 px-2 bg-background rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={line.laborType}
              onChange={e => onUpdate(line.id, 'laborType', e.target.value)}
              className="h-8 px-2 bg-background rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {LABOR_TYPES.map(lt => (
                <option key={lt.value} value={lt.value}>{lt.label}</option>
              ))}
            </select>
            <button
              onClick={() => onUpdate(line.id, 'isTbd', !line.isTbd)}
              className={cn(
                'h-8 px-2 rounded text-xs font-bold flex items-center gap-1 transition-colors',
                line.isTbd
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              title="Mark as TBD"
            >
              <Clock className="h-3 w-3" />
              TBD
            </button>
            {showConfidence && <ConfidenceBadge value={line.confidence} />}
          </div>
        </div>
        <button
          onClick={() => onRemove(line.id)}
          className="p-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
