
## Auto-Delete Photos After OCR Extraction

### What Changes

One file only: **`src/hooks/useScanFlow.ts`**

After OCR returns a successful result and the extracted data is verified, a background cleanup task fires silently. It waits 2 seconds as a safety buffer, then removes both the file from storage and the database record (if one was created).

### Exact Insertion Point

After line 203 (`updateState('review', { extractedData });`) — inside the `try` block, after the final staleness check passes and the state is set to `review`.

### The Cleanup Logic

```typescript
// Non-blocking background cleanup — fires only after successful OCR
void (async () => {
  try {
    // 2-second safety buffer: ensures OCR edge function has fully
    // finished reading before we delete the file from storage
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('ro-photos')
      .remove([path]);

    if (storageError) {
      console.warn('[ScanFlow] Storage cleanup failed (non-critical):', storageError.message);
      return;
    }

    // Also remove the database record if we inserted one
    if (roId) {
      await supabase
        .from('ro_photos')
        .delete()
        .eq('storage_path', path);
    }

    console.log('[ScanFlow] Photo auto-deleted after OCR success');
  } catch (e) {
    // Cleanup failure is silent — never affects the user
    console.warn('[ScanFlow] Cleanup error (non-critical):', e);
  }
})();
```

### Safety Guarantees

- **OCR always reads first**: The cleanup only starts after `ocrResponse.json()` has fully resolved and `updateState('review', ...)` has been called. The OCR edge function processes the file completely before sending any response back.
- **2-second buffer**: Adds extra time beyond the OCR response to cover any residual in-flight signed URL reads.
- **OCR failure = no delete**: The cleanup is inside the successful `try` path, after the staleness check. If OCR throws or returns an error, execution jumps to `catch` and cleanup never runs — the file is kept so the user can retry.
- **Stale scan = no delete**: The final staleness check (`if (scanIdRef.current !== currentScanId) return;`) runs before cleanup fires, so a cancelled or superseded scan never triggers cleanup on the wrong file.
- **Multi-user safe**: Storage paths are `userId/roId/timestamp.ext`, so no user can ever touch another user's files. RLS on `ro_photos` adds a second layer.
- **Non-blocking**: The `void (async () => { ... })()` pattern means cleanup runs in the background without blocking the UI transition to the review screen.
