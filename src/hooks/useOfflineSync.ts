import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  enqueue,
  dequeue,
  getAllQueued,
  incrementRetry,
  type QueuedAction,
  type QueuedActionType,
  type SyncConflict,
} from '@/lib/offlineQueue';

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
  const executeAction = useCallback(async (action: QueuedAction): Promise<boolean> => {
    if (!user) return false;
    try {
      switch (action.type) {
        case 'addRO': {
          const { ro } = action.payload;
          const { data: newRow, error } = await supabase
            .from('ros')
            .insert({
              user_id: user.id,
              ro_number: ro.roNumber,
              date: ro.date,
              advisor_name: ro.advisor,
              customer_name: ro.customerName || null,
              notes: ro.notes || null,
              status: 'draft',
            })
            .select()
            .single();
          if (error) throw error;
          if (ro.lines?.length > 0) {
            const lineInserts = ro.lines.map((l: any, i: number) => ({
              ro_id: newRow.id,
              user_id: user.id,
              line_no: i + 1,
              description: l.description,
              labor_type: l.laborType || 'customer-pay',
              hours_paid: l.hoursPaid,
              is_tbd: !!l.isTbd,
              matched_reference_id: l.matchedReferenceId || null,
            }));
            const { error: lErr } = await supabase.from('ro_lines').insert(lineInserts);
            if (lErr) throw lErr;
          }
          return true;
        }
        case 'updateRO': {
          const { id, updates } = action.payload;
          const dbUpdates: any = {};
          if (updates.roNumber !== undefined) dbUpdates.ro_number = updates.roNumber;
          if (updates.advisor !== undefined) dbUpdates.advisor_name = updates.advisor;
          if (updates.date !== undefined) dbUpdates.date = updates.date;
          if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
          if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName || null;
          if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('ros').update(dbUpdates).eq('id', id);
            if (error) throw error;
          }
          if (updates.lines) {
            await supabase.from('ro_lines').delete().eq('ro_id', id);
            if (updates.lines.length > 0) {
              const lineInserts = updates.lines.map((l: any, i: number) => ({
                ro_id: id,
                user_id: user.id,
                line_no: i + 1,
                description: l.description,
                labor_type: l.laborType || 'customer-pay',
                hours_paid: l.hoursPaid,
                is_tbd: !!l.isTbd,
                matched_reference_id: l.matchedReferenceId || null,
              }));
              const { error } = await supabase.from('ro_lines').insert(lineInserts);
              if (error) throw error;
            }
          }
          return true;
        }
        case 'deleteRO': {
          const { error } = await supabase.from('ros').delete().eq('id', action.payload.id);
          if (error) throw error;
          return true;
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
          return true;
        }
        case 'clearFlag': {
          const { error } = await supabase
            .from('ro_flags')
            .update({ cleared_at: new Date().toISOString() })
            .eq('id', action.payload.flagId);
          if (error) throw error;
          return true;
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
          return true;
        }
        case 'addAdvisor': {
          const { name } = action.payload;
          const { error } = await supabase.from('advisors').insert({
            user_id: user.id,
            name,
          });
          if (error) throw error;
          return true;
        }
        case 'deleteAdvisor': {
          const { id: advisorId } = action.payload;
          const { error } = await supabase.from('advisors').delete().eq('id', advisorId);
          if (error) throw error;
          return true;
        }
        default:
          console.warn('Unknown queued action type:', action.type);
          return true; // dequeue unknown actions
      }
    } catch (err: any) {
      console.error(`Sync failed for ${action.type}:`, err?.message);
      return false;
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

    const newConflicts: SyncConflict[] = [];
    let synced = 0;

    for (const action of items) {
      if (!navigator.onLine) break; // stop if we lose connection mid-sync

      const success = await executeAction(action);
      if (success) {
        await dequeue(action.id);
        synced++;
      } else {
        await incrementRetry(action.id);
        if (action.retries + 1 >= MAX_RETRIES) {
          newConflicts.push({
            queuedAction: action,
            error: `Failed after ${MAX_RETRIES} attempts`,
          });
        }
      }
    }

    if (newConflicts.length > 0) {
      setConflicts(prev => [...prev, ...newConflicts]);
    }

    await refreshPendingCount();

    if (synced > 0) {
      toast.success(`Synced ${synced} pending change${synced > 1 ? 's' : ''}`);
      // Refresh data from server
      if (refreshCallbackRef.current) {
        await refreshCallbackRef.current();
      }
    }

    syncingRef.current = false;
    setSyncing(false);
  }, [user, executeAction, refreshPendingCount]);

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
  }, [refreshPendingCount]);

  // Queue an action (used when offline)
  const queueAction = useCallback(async (type: QueuedActionType, payload: any) => {
    await enqueue({ type, payload });
    await refreshPendingCount();
  }, [refreshPendingCount]);

  // Resolve a conflict by keeping local (retry) or discarding
  const resolveConflict = useCallback(async (conflict: SyncConflict, resolution: 'local' | 'server') => {
    if (resolution === 'server') {
      // Discard the local action
      await dequeue(conflict.queuedAction.id);
    } else {
      // Reset retries and try again
      // We just re-attempt immediately
      const success = await executeAction(conflict.queuedAction);
      if (success) {
        await dequeue(conflict.queuedAction.id);
      } else {
        toast.error('Still unable to sync. Try again later.');
        return;
      }
    }
    setConflicts(prev => prev.filter(c => c.queuedAction.id !== conflict.queuedAction.id));
    await refreshPendingCount();
    if (refreshCallbackRef.current) {
      await refreshCallbackRef.current();
    }
  }, [executeAction, refreshPendingCount]);

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
