import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { toast } from 'sonner';
import type { ROFlag, FlagType } from '@/types/flags';

function dbToFlag(row: any): ROFlag {
  return {
    id: row.id,
    userId: row.user_id,
    roId: row.ro_id,
    roLineId: row.ro_line_id || null,
    flagType: row.flag_type as FlagType,
    note: row.note || null,
    createdAt: row.created_at,
    clearedAt: row.cleared_at || null,
  };
}

export function useFlags() {
  const { user } = useAuth();
  const { isOnline, queueAction } = useOffline();
  const [flags, setFlags] = useState<ROFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    if (!user) { setFlags([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('ro_flags')
        .select('*')
        .is('cleared_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFlags((data || []).map(dbToFlag));
    } catch (err: any) {
      console.error('Failed to fetch flags', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const addFlag = useCallback(async (
    roId: string,
    flagType: FlagType,
    note?: string,
    roLineId?: string
  ) => {
    if (!user) return;

    if (!isOnline) {
      await queueAction('addFlag', { roId, flagType, note, roLineId });
      toast.info('Flag saved offline — will sync when back online');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ro_flags')
        .insert({
          user_id: user.id,
          ro_id: roId,
          ro_line_id: roLineId || null,
          flag_type: flagType as any,
          note: note || null,
        })
        .select()
        .single();
      if (error) {
        const msg = error.message || '';
        if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
          await queueAction('addFlag', { roId, flagType, note, roLineId });
          toast.info('Network issue — flag saved offline');
          return;
        }
        toast.error(`Failed to add flag: ${error.message}`);
        return;
      }
      setFlags(prev => [dbToFlag(data), ...prev]);
      toast.success('Flag added');
    } catch (err: any) {
      await queueAction('addFlag', { roId, flagType, note, roLineId });
      toast.info('Network issue — flag saved offline');
    }
  }, [user, isOnline, queueAction]);

  const clearFlag = useCallback(async (flagId: string) => {
    if (!user) return;

    if (!isOnline) {
      await queueAction('clearFlag', { flagId });
      setFlags(prev => prev.filter(f => f.id !== flagId));
      toast.info('Flag cleared offline — will sync when back online');
      return;
    }

    try {
      const { error } = await supabase
        .from('ro_flags')
        .update({ cleared_at: new Date().toISOString() })
        .eq('id', flagId);
      if (error) {
        const msg = error.message || '';
        if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
          await queueAction('clearFlag', { flagId });
          setFlags(prev => prev.filter(f => f.id !== flagId));
          toast.info('Network issue — flag cleared offline');
          return;
        }
        toast.error(`Failed to clear flag: ${error.message}`);
        return;
      }
      setFlags(prev => prev.filter(f => f.id !== flagId));
      toast.success('Flag cleared');
    } catch (err: any) {
      await queueAction('clearFlag', { flagId });
      setFlags(prev => prev.filter(f => f.id !== flagId));
      toast.info('Network issue — flag cleared offline');
    }
  }, [user, isOnline, queueAction]);

  const getFlagsForRO = useCallback((roId: string) => {
    return flags.filter(f => f.roId === roId && !f.roLineId);
  }, [flags]);

  const getFlagsForLine = useCallback((lineId: string) => {
    return flags.filter(f => f.roLineId === lineId);
  }, [flags]);

  /** Bulk-clear a specific set of flag IDs (used for "Clear All" in inbox). */
  const clearFlagsBulk = useCallback(async (flagIds: string[]) => {
    if (!user || flagIds.length === 0) return;
    setFlags(prev => prev.filter(f => !flagIds.includes(f.id)));
    if (!isOnline) {
      await Promise.all(flagIds.map(id => queueAction('clearFlag', { flagId: id })));
      toast.info('Flags cleared offline — will sync when back online');
      return;
    }
    try {
      await supabase
        .from('ro_flags')
        .update({ cleared_at: new Date().toISOString() })
        .in('id', flagIds);
      toast.success(`Cleared ${flagIds.length} flag${flagIds.length === 1 ? '' : 's'}`);
    } catch (err: any) {
      await Promise.all(flagIds.map(id => queueAction('clearFlag', { flagId: id })));
      toast.info('Network issue — flags cleared offline');
    }
  }, [user, isOnline, queueAction]);

  /** Bulk-clear all active flags for a set of RO IDs (used on period close-out). No individual toasts. */
  const clearFlagsForPeriod = useCallback(async (roIds: string[]) => {
    if (!user || roIds.length === 0) return;
    const toRemove = flags.filter(f => roIds.includes(f.roId));
    if (!toRemove.length) return;
    const ids = toRemove.map(f => f.id);

    // Optimistically remove from local state immediately
    setFlags(prev => prev.filter(f => !ids.includes(f.id)));

    if (!isOnline) {
      await Promise.all(ids.map(id => queueAction('clearFlag', { flagId: id })));
      return;
    }

    try {
      const { error } = await supabase
        .from('ro_flags')
        .update({ cleared_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to clear period flags', err);
      // Revert the optimistic removal so flags reappear and the user can retry
      setFlags(prev => {
        const clearedSet = new Set(ids);
        const missing = toRemove.filter(f => !prev.some(p => p.id === f.id));
        return clearedSet.size > 0 && missing.length > 0 ? [...prev, ...missing] : prev;
      });
      toast.error('Failed to clear flags for this period. Please try again.');
    }
  }, [user, isOnline, queueAction, flags]);

  const activeCount = flags.length;

  return {
    flags,
    loading,
    addFlag,
    clearFlag,
    clearFlagsBulk,
    clearFlagsForPeriod,
    getFlagsForRO,
    getFlagsForLine,
    activeCount,
    refetch: fetchFlags,
  };
}
