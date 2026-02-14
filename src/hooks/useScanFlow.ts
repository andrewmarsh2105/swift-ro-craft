import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  createScanSession,
  generateLineId,
  type ScanSession,
  type ScanState,
  type ExtractedData,
  type ExtractedLine,
} from '@/lib/scanStateMachine';

const MAX_RETRIES = 2;

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
    setSession(createScanSession());
  }, []);

  const runUploadAndOCR = useCallback(async (
    file: File,
    currentScanId: string,
    roId?: string,
    templateFieldMap?: Record<string, any>,
  ) => {
    if (!user) return;

    // Reentrancy guard
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

    try {
      // Upload to storage
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${roId || 'new'}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('ro-photos')
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Staleness check
      if (scanIdRef.current !== currentScanId) return;

      updateDebug({ uploadDone: true });

      if (roId) {
        await supabase.from('ro_photos').insert({
          ro_id: roId,
          user_id: user.id,
          storage_path: path,
        });
      }

      // OCR
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

      // Staleness check
      if (scanIdRef.current !== currentScanId) return;

      if (!ocrResponse.ok) {
        const errBody = await ocrResponse.json().catch(() => ({}));
        throw new Error(errBody.error || 'OCR extraction failed');
      }

      const ocrResult = await ocrResponse.json();

      const extractedLines: ExtractedLine[] = (ocrResult.lines || []).map((line: any) => ({
        id: generateLineId(),
        description: line.description || '',
        hours: Number(line.hours) || 0,
        laborType: line.laborType || 'customer-pay',
        confidence: Number(line.confidence) || 0.5,
      }));

      const candidateDates = Array.isArray(ocrResult.candidateDates)
        ? ocrResult.candidateDates.map((c: any) => ({
            value: c.value,
            source: c.source || 'text',
            originalFormat: c.originalFormat || c.value,
          }))
        : [];

      const extractedData: ExtractedData = {
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

      // Final staleness check
      if (scanIdRef.current !== currentScanId) return;

      updateDebug({ ocrDone: true });
      updateState('review', { extractedData });
    } catch (err: any) {
      // Only apply error if this scan is still current
      if (scanIdRef.current !== currentScanId) return;
      const errorMsg = err?.message || 'Unknown error';
      updateDebug({ lastError: errorMsg });
      updateState('error', { errorMessage: errorMsg });
      toast.error(errorMsg);
    } finally {
      busyRef.current = false;
    }
  }, [user, updateState, updateDebug]);

  const handleFileSelected = useCallback((file: File, roId?: string, templateFieldMap?: Record<string, any>) => {
    // New file = new scan, reset retry counter
    const newScanId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    scanIdRef.current = newScanId;
    retryCountRef.current = 0;
    fileRef.current = file;
    runUploadAndOCR(file, newScanId, roId, templateFieldMap);
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

  return {
    session,
    handleFileSelected,
    reset,
    retry,
    goToReview,
    updateExtractedData,
    updateState,
  };
}
