import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  createScanSession,
  generateLineId,
  detectHeaderConflicts,
  mergePageIntoSession,
  type ScanSession,
  type ScanState,
  type ExtractedData,
  type ExtractedLine,
  type HeaderConflict,
} from '@/lib/scanStateMachine';
import type { Preset } from '@/types/ro';

const MAX_RETRIES = 2;
const LOW_CONFIDENCE_THRESHOLD = 0.5;

/** Match extracted line descriptions against presets to fill missing hours */
function applyKeywordAutofill(lines: ExtractedLine[], presets: Preset[]): ExtractedLine[] {
  if (!presets.length) return lines;

  return lines.map(line => {
    const needsFill = line.hours === 0 || line.confidence < LOW_CONFIDENCE_THRESHOLD;
    if (!needsFill) return line;

    const descLower = line.description.toLowerCase();

    for (const preset of presets) {
      const nameMatch = descLower.includes(preset.name.toLowerCase());
      if (nameMatch && preset.defaultHours && preset.defaultHours > 0) {
        return {
          ...line,
          hours: preset.defaultHours,
          laborType: preset.laborType || line.laborType,
          confidence: Math.max(line.confidence, 0.6),
        };
      }
    }

    return line;
  });
}

export function useScanFlow() {
  const { user } = useAuth();
  const [session, setSession] = useState<ScanSession>(createScanSession());

  // Reentrancy guard — prevents concurrent upload/OCR runs
  const busyRef = useRef(false);
  // Current scan ID — used to discard stale results
  const scanIdRef = useRef<string | null>(null);
  // Retry counter per scan
  const retryCountRef = useRef(0);
  // Keep File in a ref so it never gets serialized
  const fileRef = useRef<File | null>(null);
  // Per-page template for the current upload
  const pageTemplateIdRef = useRef<string | null>(null);

  const updateState = useCallback((state: ScanState, partial?: Partial<ScanSession>) => {
    setSession(prev => ({ ...prev, ...partial, state }));
  }, []);

  const updateDebug = useCallback((partial: Partial<ScanSession['debug']>) => {
    setSession(prev => ({
      ...prev,
      debug: { ...prev.debug, ...partial },
    }));
  }, []);

  const reset = useCallback(() => {
    busyRef.current = false;
    scanIdRef.current = null;
    retryCountRef.current = 0;
    fileRef.current = null;
    pageTemplateIdRef.current = null;
    setSession(createScanSession());
  }, []);

  const runUploadAndOCR = useCallback(async (
    file: File,
    currentScanId: string,
    roId?: string,
    templateFieldMap?: Record<string, any>,
    presets?: Preset[],
    keywordAutofill?: boolean,
    templateId?: string | null,
  ) => {
    if (!user) return;

    if (busyRef.current) {
      console.warn('[ScanFlow] Ignoring — already busy');
      return;
    }
    busyRef.current = true;

    const previewUrl = URL.createObjectURL(file);

    updateState('uploading', {
      imagePreviewUrl: previewUrl,
      errorMessage: null,
    });
    updateDebug({ fileSelected: true, uploadStarted: true, lastError: null });

    let path: string | null = null;

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      path = `${user.id}/${roId || 'new'}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('ro-photos')
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      if (scanIdRef.current !== currentScanId) return;

      updateDebug({ uploadDone: true });

      if (roId) {
        await supabase.from('ro_photos').insert({
          ro_id: roId,
          user_id: user.id,
          storage_path: path,
        });
      }

      updateState('extracting', { storagePath: path });
      updateDebug({ ocrStarted: true });

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const ocrResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-extract`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            storagePath: path,
            templateFieldMap: templateFieldMap || null,
          }),
        }
      );

      if (scanIdRef.current !== currentScanId) return;

      if (!ocrResponse.ok) {
        const errBody = await ocrResponse.json().catch(() => ({}));
        throw new Error(errBody.error || 'OCR extraction failed');
      }

      const ocrResult = await ocrResponse.json();

      let extractedLines: ExtractedLine[] = (ocrResult.lines || []).map((line: any) => ({
        id: generateLineId(),
        description: line.description || '',
        hours: Number(line.hours) || 0,
        laborType: line.laborType || 'customer-pay',
        confidence: Number(line.confidence) || 0.5,
      }));

      if (keywordAutofill && presets && presets.length > 0) {
        extractedLines = applyKeywordAutofill(extractedLines, presets);
      }

      const candidateDates = Array.isArray(ocrResult.candidateDates)
        ? ocrResult.candidateDates.map((c: any) => ({
            value: c.value,
            source: c.source || 'text',
            originalFormat: c.originalFormat || c.value,
          }))
        : [];

      const pageExtractedData: ExtractedData = {
        roNumber: ocrResult.roNumber || null,
        advisor: ocrResult.advisor || null,
        date: ocrResult.date || null,
        customerName: ocrResult.customerName || null,
        mileage: ocrResult.mileage || null,
        vehicleYear: ocrResult.vehicleYear ?? null,
        vehicleMake: ocrResult.vehicleMake ?? null,
        vehicleModel: ocrResult.vehicleModel ?? null,
        candidateDates,
        lines: extractedLines,
        fieldConfidence: {
          roNumber: ocrResult.fieldConfidence?.roNumber ?? 0.5,
          advisor: ocrResult.fieldConfidence?.advisor ?? 0.5,
          date: ocrResult.fieldConfidence?.date ?? 0.5,
        },
      };

      if (scanIdRef.current !== currentScanId) return;

      updateDebug({ ocrDone: true });

      // Merge the page into the session
      setSession(prev => {
        const pageNumber = prev.pages.length + 1;
        const isFirstPage = prev.pages.length === 0;

        if (!isFirstPage && prev.extractedData) {
          // Detect header conflicts before merging
          const conflicts = detectHeaderConflicts(prev.extractedData, pageExtractedData, pageNumber);

          if (conflicts.length > 0) {
            // Store pending page data for user to resolve conflicts
            return {
              ...prev,
              state: 'review',
              pendingHeaderConflicts: conflicts,
              pendingPageData: pageExtractedData,
              pendingPageNumber: pageNumber,
              // Temporarily show the new page's image during conflict resolution
              imagePreviewUrl: previewUrl,
            };
          }
        }

        return mergePageIntoSession(prev, pageExtractedData, previewUrl, path!, templateId || null);
      });

      // Non-blocking background cleanup
      void (async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));

          const { error: storageError } = await supabase.storage
            .from('ro-photos')
            .remove([path!]);

          if (storageError) {
            console.warn('[ScanFlow] Storage cleanup failed (non-critical):', storageError.message);
            return;
          }

          if (roId) {
            await supabase
              .from('ro_photos')
              .delete()
              .eq('storage_path', path);
          }

          console.log('[ScanFlow] Photo auto-deleted after OCR success');
        } catch (e) {
          console.warn('[ScanFlow] Cleanup error (non-critical):', e);
        }
      })();
    } catch (err: any) {
      if (scanIdRef.current !== currentScanId) return;
      const errorMsg = err?.message || 'Unknown error';
      updateDebug({ lastError: errorMsg });
      updateState('error', { errorMessage: errorMsg });
      toast.error(errorMsg);
    } finally {
      busyRef.current = false;
    }
  }, [user, updateState, updateDebug]);

  const handleFileSelected = useCallback((
    file: File,
    roId?: string,
    templateFieldMap?: Record<string, any>,
    presets?: Preset[],
    keywordAutofill?: boolean,
    templateId?: string | null,
  ) => {
    const newScanId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    scanIdRef.current = newScanId;
    retryCountRef.current = 0;
    fileRef.current = file;
    pageTemplateIdRef.current = templateId ?? null;
    runUploadAndOCR(file, newScanId, roId, templateFieldMap, presets, keywordAutofill, templateId);
  }, [runUploadAndOCR]);

  /**
   * Add another page to the existing scan session.
   * Does NOT reset the session — only clears the current-page upload state.
   */
  const handleAddPage = useCallback((
    file: File,
    roId?: string,
    templateFieldMap?: Record<string, any>,
    presets?: Preset[],
    keywordAutofill?: boolean,
    templateId?: string | null,
  ) => {
    // Generate a new scan ID for this page (stale result protection)
    const newScanId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    scanIdRef.current = newScanId;
    retryCountRef.current = 0;
    fileRef.current = file;
    pageTemplateIdRef.current = templateId ?? null;

    runUploadAndOCR(file, newScanId, roId, templateFieldMap, presets, keywordAutofill, templateId);
  }, [runUploadAndOCR]);

  const retry = useCallback(() => {
    if (busyRef.current) return;

    retryCountRef.current += 1;
    if (retryCountRef.current > MAX_RETRIES) {
      updateState('error', { errorMessage: 'Too many attempts. Please try another photo.' });
      toast.error('Too many attempts. Please try another photo.');
      return;
    }

    const file = fileRef.current;
    if (file && scanIdRef.current) {
      runUploadAndOCR(file, scanIdRef.current);
    } else {
      reset();
    }
  }, [runUploadAndOCR, reset, updateState]);

  const goToReview = useCallback(() => {
    updateState('review');
  }, [updateState]);

  const updateExtractedData = useCallback((data: ExtractedData) => {
    setSession(prev => ({ ...prev, extractedData: data }));
  }, []);

  /**
   * Resolve header conflicts: user chose which values to keep.
   * overrides: map of field -> 'keep' | 'replace'
   */
  const resolveHeaderConflicts = useCallback((
    resolutions: Record<string, 'keep' | 'replace'>,
  ) => {
    setSession(prev => {
      if (!prev.pendingPageData || prev.pendingPageNumber === null) return prev;

      const overrides: Partial<Pick<ExtractedData, 'roNumber' | 'date' | 'mileage'>> = {};
      const existing = prev.extractedData;

      for (const conflict of prev.pendingHeaderConflicts) {
        const res = resolutions[conflict.field] ?? 'keep';
        if (res === 'replace') {
          (overrides as any)[conflict.field] = conflict.newValue;
        } else if (existing) {
          (overrides as any)[conflict.field] = (existing as any)[conflict.field];
        }
      }

      return mergePageIntoSession(
        { ...prev, pendingHeaderConflicts: [], pendingPageData: null },
        prev.pendingPageData,
        prev.imagePreviewUrl,
        prev.storagePath,
        pageTemplateIdRef.current,
        overrides,
      );
    });
  }, []);

  /**
   * Dismiss the pending page scan — go back to review without merging
   */
  const cancelPendingPage = useCallback(() => {
    setSession(prev => ({
      ...prev,
      state: 'review',
      pendingHeaderConflicts: [],
      pendingPageData: null,
      pendingPageNumber: null,
      imagePreviewUrl: prev.pages[0]?.imagePreviewUrl ?? prev.imagePreviewUrl,
    }));
  }, []);

  return {
    session,
    handleFileSelected,
    handleAddPage,
    reset,
    retry,
    goToReview,
    updateExtractedData,
    updateState,
    resolveHeaderConflicts,
    cancelPendingPage,
  };
}
