import { useState } from 'react';
import { X, Camera, Image, Upload, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScanFlow } from '@/hooks/useScanFlow';
import { useFlagContext } from '@/contexts/FlagContext';
import { ScanReviewScreen } from './ScanReviewScreen';
import { cn } from '@/lib/utils';
import type { ROLine, VehicleInfo } from '@/types/ro';

interface ScanFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ScanApplyData) => void;
  roId?: string;
  hasExistingLines?: boolean;
}

export interface ScanApplyData {
  roNumber?: string;
  advisor?: string;
  date?: string;
  customerName?: string;
  vehicle?: VehicleInfo;
  lines: ROLine[];
  mode: 'prepend' | 'replace';
}

export function ScanFlow({ isOpen, onClose, onApply, roId, hasExistingLines }: ScanFlowProps) {
  const isMobile = useIsMobile();
  const { userSettings } = useFlagContext();
  const { session, handleFileSelected, reset, retry, updateExtractedData } = useScanFlow();

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file, roId);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  if (!isOpen) return null;

  const { state, debug, imagePreviewUrl, extractedData, errorMessage } = session;

  // Review screen
  if (state === 'review' && extractedData) {
    return (
      <ScanReviewScreen
        extractedData={extractedData}
        imagePreviewUrl={imagePreviewUrl}
        showConfidence={userSettings.showScanConfidence}
        hasExistingLines={!!hasExistingLines}
        onUpdateData={updateExtractedData}
        onApply={onApply}
        onRetake={() => reset()}
        onClose={handleClose}
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

      {/* File inputs are now embedded inside their <label> buttons below */}

      {/* Content based on state */}
      <div className={cn(
        "flex-1 flex flex-col items-center justify-center p-8 gap-6",
        isMobile && (state === 'idle' || state === 'selecting') && "pb-[calc(6rem+env(safe-area-inset-bottom,0px))]"
      )}>
        {(state === 'idle' || state === 'selecting') && (
          <>
            {/* Visual-only dropzone (not the interaction point) */}
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

      {/* Mobile: Fixed bottom action bar — always visible */}
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
      {/* Dev Debug — positioned at top so it never blocks action buttons */}
      {import.meta.env.DEV && (
        <div className="absolute top-16 left-4 right-4 p-2 bg-muted/80 backdrop-blur rounded-lg text-[10px] font-mono space-y-0.5 pointer-events-none opacity-60">
          <div>State: <span className="text-primary font-bold">{state}</span> | File: {debug.fileSelected ? '✅' : '❌'} | Up: {debug.uploadStarted ? (debug.uploadDone ? '✅' : '⏳') : '❌'} | OCR: {debug.ocrStarted ? (debug.ocrDone ? '✅' : '⏳') : '❌'}</div>
          {debug.lastError && <div className="text-destructive">Err: {debug.lastError}</div>}
        </div>
      )}
    </motion.div>
  );
}
