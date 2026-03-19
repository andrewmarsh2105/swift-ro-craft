import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  enqueue,
  dequeue,
  getAllQueued,
  incrementRetry,
  resetRetry,
  type QueuedAction,
  type QueuedActionType,
  type SyncConflict,
} from '@/lib/offlineQueue';
import { toRosInsert, toRoLineInserts, toRosUpdate } from '@/features/ro/data/roMapper';

const MAX_RETRIES = 3;

export function useOfflineSync() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const syncingRef = useRef(false);
  const refreshCallbackRef = useRef<(() => Promise<void>) | null>(null);

  // Register a callback to refresh data after sync
  const registerRefresh = useCallback((cb: () => Promise<void>) => {
    refreshCallbackRef.current = cb;
  }, []);

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    const items = await getAllQueued();
    setPendingCount(items.length);
  }, []);

  const refreshConflicts = useCallback(async () => {
    const items = await getAllQueued();
    setConflicts(items
      .filter(item => item.blocked)
      .map(item => ({
        queuedAction: item,
        error: item.lastError || `Failed after ${MAX_RETRIES} attempts`,
      })));
  }, []);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Execute a single queued action against Supabase
  const executeAction = useCallback(async (action: QueuedAction): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };
    try {
      switch (action.type) {
        case 'addRO': {
          const { ro } = action.payload;
          // Use the canonical mapper so all fields (vehicle, mileage, paidDate, etc.) are included
          const { data: newRow, error } = await supabase
            .from('ros')
            .insert(toRosInsert(user.id, ro))
            .select()
            .single();
          if (error) throw error;
          if (ro.lines?.length > 0) {
            const lineInserts = toRoLineInserts({
              userId: user.id,
              roId: newRow.id,
              lines: ro.lines,
              fallbackLaborType: ro.laborType || 'customer-pay',
            });
            const { error: lErr } = await supabase.from('ro_lines').insert(lineInserts);
            if (lErr) throw lErr;
          }
          return { success: true };
        }
        case 'updateRO': {
          const { id, updates } = action.payload;
          // Use the canonical mapper so all fields are included
          const dbUpdates = toRosUpdate(updates);
          if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('ros').update(dbUpdates).eq('id', id);
            if (error) throw error;
          }
          if (updates.lines) {
            // Snapshot existing line IDs before touching anything
            const { data: existingLines } = await supabase
              .from('ro_lines').select('id').eq('ro_id', id);
            const existingIds = (existingLines || []).map((l: { id: string }) => l.id);

            // Insert new lines first — if this fails we throw and retry the whole action
            if (updates.lines.length > 0) {
              const lineInserts = toRoLineInserts({
                userId: user.id,
                roId: id,
                lines: updates.lines,
                fallbackLaborType: updates.laborType || 'customer-pay',
              });
              const { error: insErr } = await supabase.from('ro_lines').insert(lineInserts);
              if (insErr) throw insErr;
            }

            // Delete old lines only after new ones are safely written
            if (existingIds.length > 0) {
              const { error: delErr } = await supabase.from('ro_lines').delete().in('id', existingIds);
              if (delErr) throw delErr;
            }
          }
          return { success: true };
        }
        case 'deleteRO': {
          const { error } = await supabase.from('ros').delete().eq('id', action.payload.id);
          if (error) throw error;
          return { success: true };
        }
        case 'addFlag': {
          const { roId, flagType, note, roLineId } = action.payload;
          const { error } = await supabase.from('ro_flags').insert({
            user_id: user.id,
            ro_id: roId,
            ro_line_id: roLineId || null,
            flag_type: flagType as any,
            note: note || null,
          });
          if (error) throw error;
          return { success: true };
        }
        case 'clearFlag': {
          const { error } = await supabase
            .from('ro_flags')
            .update({ cleared_at: new Date().toISOString() })
            .eq('id', action.payload.flagId);
          if (error) throw error;
          return { success: true };
        }
        case 'uploadPhoto': {
          const { bucket, path, file } = action.payload;
          const blob = base64ToBlob(file.base64, file.type);
          const { error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(path, blob, { contentType: file.type, upsert: true });
          if (uploadErr) throw uploadErr;
          if (action.payload.roId) {
            const { error: recErr } = await supabase.from('ro_photos').insert({
              ro_id: action.payload.roId,
              user_id: user.id,
              storage_path: path,
            });
            if (recErr) throw recErr;
          }
          return { success: true };
        }
        case 'addAdvisor': {
          const { name } = action.payload;
          const { error } = await supabase.from('advisors').insert({
            user_id: user.id,
            name,
          });
          if (error) throw error;
          return { success: true };
        }
        case 'deleteAdvisor': {
          const { id: advisorId } = action.payload;
          const { error } = await supabase.from('advisors').delete().eq('id', advisorId);
          if (error) throw error;
          return { success: true };
        }
        default:
          console.warn('Unknown queued action type:', action.type);
          return { success: true }; // dequeue unknown actions
      }
    } catch (err: any) {
      const message = err?.message || 'Unknown sync error';
      console.error(`Sync failed for ${action.type}:`, message);
      return { success: false, error: message };
    }
  }, [user]);

  // Process the entire queue
  const processQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine || !user) return;
    syncingRef.current = true;
    setSyncing(true);

    const items = await getAllQueued();
    if (items.length === 0) {
      syncingRef.current = false;
      setSyncing(false);
      return;
    }

    let synced = 0;

    for (const action of items) {
      if (!navigator.onLine) break; // stop if we lose connection mid-sync
      if (action.blocked) continue;

      const result = await executeAction(action);
      if (result.success) {
        await dequeue(action.id);
        synced++;
      } else {
        const nextRetryCount = action.retries + 1;
        await incrementRetry(action.id, result.error, nextRetryCount >= MAX_RETRIES);
      }
    }

    await refreshPendingCount();
    await refreshConflicts();

    if (synced > 0) {
      toast.success(`Synced ${synced} pending change${synced > 1 ? 's' : ''}`);
      // Refresh data from server
      if (refreshCallbackRef.current) {
        await refreshCallbackRef.current();
      }
    }

    syncingRef.current = false;
    setSyncing(false);
  }, [user, executeAction, refreshPendingCount, refreshConflicts]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && user) {
      processQueue();
    }
  }, [isOnline, user, processQueue]);

  // Periodic sync attempt every 30s when online
  useEffect(() => {
    if (!isOnline || !user) return;
    const interval = setInterval(() => {
      if (pendingCount > 0) processQueue();
    }, 30_000);
    return () => clearInterval(interval);
  }, [isOnline, user, pendingCount, processQueue]);

  // Init pending count
  useEffect(() => {
    refreshPendingCount();
    refreshConflicts();
  }, [refreshPendingCount, refreshConflicts]);

  // Queue an action (used when offline)
  const queueAction = useCallback(async (type: QueuedActionType, payload: any) => {
    try {
      await enqueue({ type, payload });
      await refreshPendingCount();
      await refreshConflicts();
      return true;
    } catch (err) {
      console.error('Failed to queue offline action', err);
      toast.error('Could not store offline change on this device');
      return false;
    }
  }, [refreshPendingCount, refreshConflicts]);

  // Resolve a conflict by keeping local (retry) or discarding
  const resolveConflict = useCallback(async (conflict: SyncConflict, resolution: 'local' | 'server') => {
    if (resolution === 'server') {
      // Discard the local action
      await dequeue(conflict.queuedAction.id);
    } else {
      await resetRetry(conflict.queuedAction.id);
      const retryable = { ...conflict.queuedAction, retries: 0, blocked: false, lastError: undefined };
      const result = await executeAction(retryable);
      if (result.success) {
        await dequeue(conflict.queuedAction.id);
      } else {
        await incrementRetry(conflict.queuedAction.id, result.error, false);
        toast.error(`Still unable to sync: ${result.error || 'Unknown error'}`);
        return;
      }
    }
    await refreshPendingCount();
    await refreshConflicts();
    if (refreshCallbackRef.current) {
      await refreshCallbackRef.current();
    }
  }, [executeAction, refreshPendingCount, refreshConflicts]);

  return {
    isOnline,
    pendingCount,
    syncing,
    conflicts,
    queueAction,
    processQueue,
    resolveConflict,
    registerRefresh,
  };
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}
