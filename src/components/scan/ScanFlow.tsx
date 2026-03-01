import { useState, useEffect } from 'react';
import { X, Camera, Image, Upload, Loader2, AlertCircle, RefreshCw, FileText, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScanFlow } from '@/hooks/useScanFlow';
import { useFlagContext } from '@/contexts/FlagContext';
import { useROSafe } from '@/contexts/ROContext';
import { useTemplates } from '@/hooks/useTemplates';
import { ScanReviewScreen } from './ScanReviewScreen';
import { cn } from '@/lib/utils';
import type { ROLine, VehicleInfo } from '@/types/ro';

interface ScanFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ScanApplyData) => void;
  roId?: string;
  hasExistingLines?: boolean;
  existingLineDescriptions?: string[];
}

export interface ScanApplyData {
  roNumber?: string;
  advisor?: string;
  date?: string;
  customerName?: string;
  vehicle?: VehicleInfo;
  mileage?: string;
  lines: ROLine[];
  mode: 'prepend' | 'replace';
}

export function ScanFlow({ isOpen, onClose, onApply, roId, hasExistingLines, existingLineDescriptions = [] }: ScanFlowProps) {
  const isMobile = useIsMobile();

  // Lock screen orientation while scan flow is active to prevent disruption
  useEffect(() => {
    if (!isOpen) return;
    const lock = async () => {
      try {
        // @ts-ignore – Screen Orientation API not fully typed
        await screen.orientation?.lock?.('portrait');
      } catch {
        // lock() unsupported or denied – silently ignore
      }
    };
    lock();
    return () => {
      try {
        screen.orientation?.unlock?.();
      } catch {
        // ignore
      }
    };
  }, [isOpen]);
  const { userSettings } = useFlagContext();
  const roContext = useROSafe();
  const presets = roContext?.settings?.presets ?? [];
  const {
    session,
    handleFileSelected,
    handleAddPage,
    reset,
    retry,
    updateExtractedData,
    resolveHeaderConflicts,
    cancelPendingPage,
  } = useScanFlow();
  const { templates, loading: templatesLoading } = useTemplates();

  // Template selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateReady, setTemplateReady] = useState(false);

  // Auto-select default template when templates load
  useEffect(() => {
    if (!isOpen || templatesLoading) return;
    if (templateReady) return; // Already initialized
    if (userSettings.defaultTemplateId) {
      const found = templates.find(t => t.id === userSettings.defaultTemplateId);
      if (found) {
        setSelectedTemplateId(found.id);
      }
    }
    setTemplateReady(true);
  }, [isOpen, templatesLoading, templates, userSettings.defaultTemplateId, templateReady]);

  // Reset template state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplateId(null);
      setTemplateReady(false);
      setShowTemplatePicker(false);
    }
  }, [isOpen]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fieldMap = selectedTemplate?.fieldMapJson || undefined;
      handleFileSelected(file, roId, fieldMap, presets, userSettings.keywordAutofill, selectedTemplateId);
    }
    e.target.value = '';
  };

  const onAddPageFile = (file: File) => {
    const fieldMap = selectedTemplate?.fieldMapJson || undefined;
    handleAddPage(file, roId, fieldMap, presets, userSettings.keywordAutofill, selectedTemplateId);
  };

  if (!isOpen) return null;

  const {
    state,
    debug,
    imagePreviewUrl,
    extractedData,
    errorMessage,
    pages,
    pendingHeaderConflicts,
  } = session;

  // Determine if we're adding a page (uploading/extracting with pages already present)
  const isAddingPage = (state === 'uploading' || state === 'extracting') && pages.length > 0;

  // Review screen — show if in review OR if we're adding a subsequent page (don't hide existing review)
  if ((state === 'review' || isAddingPage) && extractedData) {
    return (
      <ScanReviewScreen
        extractedData={extractedData}
        imagePreviewUrl={imagePreviewUrl}
        showConfidence={userSettings.showScanConfidence}
        hasExistingLines={!!hasExistingLines}
        existingLineDescriptions={existingLineDescriptions}
        pages={pages}
        pendingHeaderConflicts={pendingHeaderConflicts}
        isAddingPage={isAddingPage}
        onUpdateData={updateExtractedData}
        onApply={onApply}
        onRetake={() => reset()}
        onClose={handleClose}
        onAddPage={onAddPageFile}
        onResolveConflicts={resolveHeaderConflicts}
        onCancelPendingPage={cancelPendingPage}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border safe-top">
        <button onClick={handleClose} className="p-2 tap-target touch-feedback">
          <X className="h-6 w-6" />
        </button>
        <h2 className="font-semibold text-lg">Scan RO</h2>
        <div className="w-10" />
      </div>

      {/* Content based on state */}
      <div className={cn(
        "flex-1 flex flex-col items-center justify-center p-8 gap-6",
        isMobile && (state === 'idle' || state === 'selecting') && "pb-[calc(6rem+env(safe-area-inset-bottom,0px))]"
      )}>
        {(state === 'idle' || state === 'selecting') && (
          <>
            {/* Template indicator */}
            {templates.length > 0 && (
              <div className="w-full max-w-sm relative">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {selectedTemplate ? (
                      <span className="text-sm font-medium truncate block max-w-[200px]">
                        Using: {selectedTemplate.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No template selected</span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className="text-xs text-primary font-medium flex items-center gap-1 flex-shrink-0 ml-2"
                  >
                    Change
                    <ChevronDown className={cn('h-3 w-3 transition-transform', showTemplatePicker && 'rotate-180')} />
                  </button>
                </div>

                {/* Template dropdown */}
                {showTemplatePicker && (
                  <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10">
                    <button
                      onClick={() => {
                        setSelectedTemplateId(null);
                        setShowTemplatePicker(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-muted/50 transition-colors border-b border-border',
                        !selectedTemplateId && 'bg-primary/10 font-medium'
                      )}
                    >
                      <span>No template (extract all)</span>
                      {!selectedTemplateId && <span className="text-primary text-xs">✓</span>}
                    </button>
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTemplateId(t.id);
                          setShowTemplatePicker(false);
                        }}
                        className={cn(
                          'w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-muted/50 transition-colors',
                          selectedTemplateId === t.id && 'bg-primary/10 font-medium'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>{t.name}</span>
                          {userSettings.defaultTemplateId === t.id && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-semibold">DEFAULT</span>
                          )}
                        </div>
                        {selectedTemplateId === t.id && <span className="text-primary text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Visual-only dropzone */}
            <div className="w-full max-w-sm aspect-[3/4] border-4 border-dashed border-primary/30 rounded-3xl flex flex-col items-center justify-center gap-4 bg-primary/5">
              <Camera className="h-16 w-16 text-primary/40" />
              <p className="text-muted-foreground text-center px-6 text-sm">
                {isMobile
                  ? 'Use the buttons below to scan or pick a photo'
                  : 'Click "Upload RO Photo" to select an image'}
              </p>
            </div>

            {/* Desktop: inline upload button */}
            {!isMobile && (
              <label className="py-4 px-8 bg-primary text-primary-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/90 transition-colors">
                <Upload className="h-5 w-5" />
                Upload RO Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>
            )}
          </>
        )}

        {(state === 'uploading' || state === 'extracting') && (
          <div className="flex flex-col items-center gap-6">
            {imagePreviewUrl && (
              <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-lg">
                <img src={imagePreviewUrl} alt="Scanned RO" className="w-full h-full object-cover" />
              </div>
            )}
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium">
              {state === 'uploading' ? 'Uploading…' : 'Reading RO…'}
            </p>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">Template: {selectedTemplate.name}</p>
            )}
            <p className="text-sm text-muted-foreground">This may take a few seconds</p>
            <button onClick={handleClose} className="text-sm text-muted-foreground underline">
              Cancel
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4 max-w-sm text-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <p className="text-lg font-medium">Scan Failed</p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <div className="flex gap-3">
              <button
                onClick={retry}
                className="py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <button
                onClick={handleClose}
                className="py-3 px-6 bg-secondary rounded-xl font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Fixed bottom action bar */}
      {isMobile && (state === 'idle' || state === 'selecting') && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-border bg-card"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex gap-3 p-4">
            <label className="flex-1 min-h-[56px] bg-primary text-primary-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform">
              <Camera className="h-5 w-5" />
              Take Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFileChange}
                className="hidden"
              />
            </label>
            <label className="min-h-[56px] px-6 bg-secondary text-secondary-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97] transition-transform">
              <Image className="h-5 w-5" />
              Photos
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Dev Debug Panel */}
      {import.meta.env.DEV && (
        <div className="absolute top-16 left-4 right-4 p-2 bg-muted/80 backdrop-blur rounded-lg text-[10px] font-mono space-y-0.5 pointer-events-none opacity-60">
          <div>State: <span className="text-primary font-bold">{state}</span> | Template: {selectedTemplateId ? selectedTemplate?.name || 'unknown' : 'none'} | File: {debug.fileSelected ? '✅' : '❌'} | Up: {debug.uploadStarted ? (debug.uploadDone ? '✅' : '⏳') : '❌'} | OCR: {debug.ocrStarted ? (debug.ocrDone ? '✅' : '⏳') : '❌'}</div>
          {debug.lastError && <div className="text-destructive">Err: {debug.lastError}</div>}
        </div>
      )}
    </motion.div>
  );
}
