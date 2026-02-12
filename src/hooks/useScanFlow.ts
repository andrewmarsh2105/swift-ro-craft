import { useState, useCallback } from 'react';
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

export function useScanFlow() {
  const { user } = useAuth();
  const [session, setSession] = useState<ScanSession>(createScanSession());

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
    setSession(createScanSession());
  }, []);

  const handleFileSelected = useCallback(async (file: File, roId?: string, templateFieldMap?: Record<string, any>) => {
    if (!user) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    updateState('uploading', {
      imageFile: file,
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

      updateDebug({ uploadDone: true });

      // Create ro_photos record if we have an roId
      if (roId) {
        await supabase.from('ro_photos').insert({
          ro_id: roId,
          user_id: user.id,
          storage_path: path,
        });
      }

      // Now extract via OCR
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

      if (!ocrResponse.ok) {
        const errBody = await ocrResponse.json().catch(() => ({}));
        throw new Error(errBody.error || 'OCR extraction failed');
      }

      const ocrResult = await ocrResponse.json();

      // Map OCR result to our ExtractedData format
      const extractedLines: ExtractedLine[] = (ocrResult.lines || []).map((line: any) => ({
        id: generateLineId(),
        description: line.description || '',
        hours: Number(line.hours) || 0,
        laborType: line.laborType || 'customer-pay',
        confidence: Number(line.confidence) || 0.5,
      }));

      const extractedData: ExtractedData = {
        roNumber: ocrResult.roNumber || null,
        advisor: ocrResult.advisor || null,
        date: ocrResult.date || null,
        customerName: ocrResult.customerName || null,
        lines: extractedLines,
        fieldConfidence: {
          roNumber: ocrResult.fieldConfidence?.roNumber ?? 0.5,
          advisor: ocrResult.fieldConfidence?.advisor ?? 0.5,
          date: ocrResult.fieldConfidence?.date ?? 0.5,
        },
      };

      updateDebug({ ocrDone: true });
      updateState('review', { extractedData });

    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error';
      updateDebug({ lastError: errorMsg });
      updateState('error', { errorMessage: errorMsg });
      toast.error(errorMsg);
    }
  }, [user, updateState, updateDebug]);

  const retry = useCallback(() => {
    if (session.imageFile) {
      handleFileSelected(session.imageFile);
    } else {
      reset();
    }
  }, [session.imageFile, handleFileSelected, reset]);

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
