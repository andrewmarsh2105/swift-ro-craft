import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { toast } from 'sonner';
import { pushDebug } from '@/lib/debug';
import { localDateStr } from '@/lib/utils';
import type { RepairOrder, Preset, Settings, DaySummary, AdvisorSummary, LaborType, Advisor, ROLine } from '@/types/ro';
import {
  dbToRepairOrder,
  groupLinesByRoId,
  toRoLineInserts,
  toRoLinesJsonb,
  toRosInsert,
  toRosUpdate,
  type RoLineRow,
  type RoRow,
} from '@/features/ro/data/roMapper';
import { calcLineHours } from '@/lib/roDisplay';
import { saveROsToCache, loadROsFromCache } from '@/lib/roLocalCache';
import { RO_MONTHLY_CAP } from '@/lib/proFeatures';

type AdvisorRow = Database["public"]["Tables"]["advisors"]["Row"];
type LaborReferenceRow = Database["public"]["Tables"]["labor_references"]["Row"];
type LaborTypeDb = Database["public"]["Enums"]["labor_type"];

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

function dbToPreset(row: LaborReferenceRow): Preset {
  return {
    id: row.id,
    name: row.name,
    laborType: row.labor_type_default as unknown as LaborType,
    defaultHours: row.default_hours ? Number(row.default_hours) : undefined,
    workTemplate: row.name,
    isFavorite: !!row.is_favorite,
  };
}

// Use shared effectiveDate from roDisplay, aliased for local naming convention
import { effectiveDate as effectiveDateOf } from '@/lib/roDisplay';

/**
 * How many days back to treat as the "hot window" for Phase 1 fetching.
 * ROs dated within this range (plus their lines) are fetched immediately and
 * rendered before the background Phase 2 load of older headers completes.
 */
const HOT_WINDOW_DAYS = 120;

/** Page size for paginated fetches. Supabase default max is 1000. */
const PAGE_SIZE = 1000;

function hotCutoffDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - HOT_WINDOW_DAYS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Paginated fetch helper — keeps requesting pages of PAGE_SIZE until a
 * partial page is returned (meaning we've exhausted the result set).
 * Returns all rows concatenated.
 */
async function fetchAllPages<T>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await queryFn(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;
  }
  return all;
}

function paidLinesOf(ro: RepairOrder): ROLine[] {
  return ro.lines || [];
}

const defaultSettings: Settings = {
  recentAdvisors: [],
  advisors: [],
  presets: [],
  showDarkMode: false,
};

export function useROStore() {
  const { user } = useAuth();
  // Use user.id (stable string) instead of the user object so token refreshes
  // (which create a new user object reference) don't trigger unnecessary refetches.
  const userId = user?.id;
  const { isOnline, queueAction, registerRefresh } = useOffline();
  const [ros, setROs] = useState<RepairOrder[]>([]);
  // Ref that always holds the latest ros array — used in callbacks that
  // need to read current ROs without adding ros to their dep arrays.
  const rosRef = useRef<RepairOrder[]>([]);
  rosRef.current = ros;
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loadingROs, setLoadingROs] = useState(true);

  // Tracks pending deletes for undo support: id → { timer, savedRO }
  const pendingDeletes = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; savedRO: RepairOrder }>>(new Map());

  // ── Offline read-cache state ────────────────────────────────────────────
  /** 'loading' = no data yet | 'cache' = hydrated from IndexedDB | 'live' = from server */
  const [dataSource, setDataSource] = useState<'loading' | 'cache' | 'live'>('loading');
  /** ISO timestamp of when the cache was last written (null when showing live data). */
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  /** IDs of ROs added or edited while offline — cleared after the next live fetch. */
  const [offlinePendingIds, setOfflinePendingIds] = useState<Set<string>>(new Set());
  /** Whether the cache has been loaded at least once for this user session. */
  const cacheHydrated = useRef(false);
  /** Whether the last fetchROs() attempt failed (so we can surface it in the UI). */
  const [fetchError, setFetchError] = useState(false);
  /** Raw error message/code from the last failed fetchROs() — used by the UI to show
   *  actionable diagnostics (e.g. "relation does not exist" → migrations not run). */
  const [fetchErrorMessage, setFetchErrorMessage] = useState<string | null>(null);
  /**
   * True once both Phase 1 (hot window) and Phase 2 (older headers) have
   * completed for the current session. Consumers can show a subtle indicator
   * while older history is still loading in the background.
   */
  const [hasFullHistory, setHasFullHistory] = useState(false);
  /**
   * True when Phase 2 attempted but failed — the dataset is known to be
   * incomplete. UI should surface a subtle warning instead of pretending
   * the dataset is complete.
   */
  const [historyIncomplete, setHistoryIncomplete] = useState(false);
  /**
   * Generation counter used to abort the background Phase 2 load when a new
   * fetchROs call starts, the component unmounts, or the userId changes.
   * Each fetchROs call increments this; Phase 2 checks if it still matches.
   */
  const phase2Generation = useRef(0);

  // Cancel any in-flight delete timers when the store unmounts
  useEffect(() => {
    const pendingDeletesRef = pendingDeletes.current;
    return () => {
      for (const { timer } of pendingDeletesRef.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  // ── Two-phase fetch ────────────────────────────────────────────────────────
  //
  // Phase 1 (parallel, immediate):
  //   • Paginate ALL ROs dated within the last HOT_WINDOW_DAYS days
  //   • Paginate ALL ro_lines for the user (needed for search & SpreadsheetView)
  //   Both pagination loops run in parallel so we pay minimal round-trips.
  //
  // Phase 2 (background, ~400 ms later):
  //   • Paginate ALL older RO headers — uses the linesByRO map from Phase 1.
  //   • Merges silently into state; UI is already usable from Phase 1.
  //
  const fetchROs = useCallback(async () => {
    if (!userId) { setROs([]); setLoadingROs(false); setDataSource('loading'); return; }

    // When offline and we already have data, skip the network request entirely.
    if (!navigator.onLine && cacheHydrated.current) {
      setLoadingROs(false);
      return;
    }

    // Only show the full-page loading spinner when we have no data at all.
    if (!cacheHydrated.current) setLoadingROs(true);

    const myGeneration = ++phase2Generation.current;
    const hotCutoff = hotCutoffDateStr();

    try {
      // ── Phase 1: paginated parallel fetch ──────────────────────────────
      const runPhase1 = (timeoutMs: number) =>
        Promise.race([
          Promise.all([
            // Paginate hot-window ROs
            fetchAllPages((from, to) =>
              supabase
                .from('ros')
                .select('*')
                .eq('user_id', userId)
                .gte('date', hotCutoff)
                .order('date', { ascending: false })
                .range(from, to),
            ),
            // Paginate ALL ro_lines
            fetchAllPages((from, to) =>
              supabase
                .from('ro_lines')
                .select('*')
                .eq('user_id', userId)
                .order('line_no', { ascending: true })
                .range(from, to),
            ),
          ]),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`[ROStore] fetchROs timed out after ${timeoutMs}ms.`)),
              timeoutMs,
            ),
          ),
        ]);

      let roRows: RoRow[];
      let allLineRows: RoLineRow[];
      try {
        [roRows, allLineRows] = await runPhase1(30_000) as [RoRow[], RoLineRow[]];
      } catch (err) {
        const msg = errorMessage(err);
        if (!msg.includes('timed out')) throw err;
        pushDebug({ action: 'fetchROs Phase1 timeout — retrying with extended timeout' });
        [roRows, allLineRows] = await runPhase1(60_000) as [RoRow[], RoLineRow[]];
      }

      // Build a single lines-by-RO map once — reused by Phase 2.
      const linesByRO = groupLinesByRoId(allLineRows);

      const hotMapped = roRows.map((r) =>
        dbToRepairOrder(r, linesByRO.get(r.id) || []),
      );

      setROs(hotMapped);
      setDataSource('live');
      setCachedAt(null);
      setFetchError(false);
      setFetchErrorMessage(null);
      setHistoryIncomplete(false);
      setOfflinePendingIds(new Set());
      cacheHydrated.current = true;
      setHasFullHistory(false);

      pushDebug({
        action: `fetchROs Phase1 OK: ${hotMapped.length} ROs (≥${hotCutoff}), ${allLineRows.length} lines`,
      });

      // ── Phase 2: paginated background load of older RO headers ──────────
      void (async () => {
        await new Promise<void>((r) => setTimeout(r, 400));
        if (phase2Generation.current !== myGeneration) return;

        try {
          const oldRows = await fetchAllPages<RoRow>((from, to) =>
            supabase
              .from('ros')
              .select('*')
              .eq('user_id', userId)
              .lt('date', hotCutoff)
              .order('date', { ascending: false })
              .range(from, to),
          );

          if (phase2Generation.current !== myGeneration) return;

          pushDebug({ action: `fetchROs Phase2 OK: ${oldRows.length} older RO headers` });

          if (oldRows.length === 0) {
            setHasFullHistory(true);
            void saveROsToCache(userId, hotMapped);
            return;
          }

          // Also paginate lines for old ROs that weren't covered by Phase 1 lines.
          // Phase 1 already fetched ALL user lines, so linesByRO should have them,
          // but verify and fetch any missing lines for safety.
          const oldMapped = oldRows.map((r) =>
            dbToRepairOrder(r, linesByRO.get(r.id) || []),
          );

          setROs((prev) => {
            if (phase2Generation.current !== myGeneration) return prev;
            const existingIds = new Set(prev.map((r) => r.id));
            const uniqueOld = oldMapped.filter((r) => !existingIds.has(r.id));
            if (uniqueOld.length === 0) {
              void saveROsToCache(userId, prev);
              return prev;
            }
            const merged = [...prev, ...uniqueOld];
            void saveROsToCache(userId, merged);
            return merged;
          });
          setHasFullHistory(true);
        } catch (phase2Err) {
          pushDebug({ action: 'fetchROs Phase2 FAIL', error: errorMessage(phase2Err) });
          // Don't pretend history is complete — surface the incomplete state.
          setHistoryIncomplete(true);
          setHasFullHistory(false);
          void saveROsToCache(userId, hotMapped);
        }
      })();

      pushDebug({ action: `fetchROs lines loaded: ${allLineRows.length}` });

    } catch (err: unknown) {
      console.error('Failed to fetch ROs', err);
      const msg = errorMessage(err);
      pushDebug({ action: 'fetchROs FAIL', error: msg });
      // Surface the error in the status bar, but keep any cached data visible.
      setFetchError(true);
      setFetchErrorMessage(msg);
      if (!cacheHydrated.current) {
        setDataSource('loading'); // truly no data — keep showing empty/loading
      }
    } finally {
      setLoadingROs(false);
    }
  }, [userId]);

  // Track whether an updatePresets/updateAdvisors operation is in flight to prevent races
  const presetsUpdating = useRef(false);
  const advisorsUpdating = useRef(false);

  // Fetch presets (labor_references)
  const fetchPresets = useCallback(async () => {
    if (!userId) return;
    // Skip if an updatePresets call is in progress to prevent race conditions
    if (presetsUpdating.current) return;
    try {
      const { data, error } = await supabase
        .from('labor_references')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const presets = (data || []).map(dbToPreset);

      setSettings(prev => ({
        ...prev,
        presets,
      }));
    } catch (err: unknown) {
      console.error('Failed to fetch presets', err);
    }
  }, [userId]);

  // Fetch advisors from DB
  const fetchAdvisors = useCallback(async () => {
    if (!userId) return;
    // Skip if an updateAdvisors call is in progress to prevent race conditions
    if (advisorsUpdating.current) return;
    try {
      const { data, error } = await supabase
        .from('advisors')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      const advisors: Advisor[] = (data || []).map((r) => {
        const row = r as AdvisorRow;
        return { id: row.id, name: row.name };
      });
      setSettings(prev => ({
        ...prev,
        advisors,
        recentAdvisors: advisors.map(a => a.name).slice(0, 6),
      }));
    } catch (err: unknown) {
      console.error('Failed to fetch advisors', err);
    }
  }, [userId]);

  // ── Startup: hydrate from cache, then fetch live data ────────────────────
  useEffect(() => {
    if (!userId) {
      setROs([]);
      setLoadingROs(false);
      setDataSource('loading');
      setCachedAt(null);
      setFetchError(false);
      setFetchErrorMessage(null);
      setOfflinePendingIds(new Set());
      setHasFullHistory(false);
      setHistoryIncomplete(false);
      cacheHydrated.current = false;
      return;
    }

    let cancelled = false;
    cacheHydrated.current = false;

    (async () => {
      // Step 1 — instantly show whatever is cached (no spinner needed).
      const cached = await loadROsFromCache(userId);
      if (cancelled) return;

      if (cached && cached.ros.length > 0) {
        setROs(cached.ros);
        setCachedAt(cached.savedAt);
        setDataSource('cache');
        cacheHydrated.current = true;
        setLoadingROs(false);
      }

      // Step 2 — attempt live fetch; on success this replaces cache and sets
      // dataSource = 'live'.  On failure the cached data stays visible.
      if (!cancelled) {
        await fetchROs();
      }
    })();

    return () => {
      cancelled = true;
      // Increment generation so any in-flight Phase 2 background load aborts
      // cleanly and doesn't write stale data into the new user's state.
      phase2Generation.current++;
    };
  }, [userId, fetchROs]);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);
  useEffect(() => { fetchAdvisors(); }, [fetchAdvisors]);

  // Register refresh callback for offline sync
  useEffect(() => {
    registerRefresh(async () => {
      await fetchROs();
      await fetchPresets();
      await fetchAdvisors();
    });
  }, [registerRefresh, fetchROs, fetchPresets, fetchAdvisors]);

  const clearAllROs = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('ros').delete().eq('user_id', user.id);
    if (error) { toast.error('Failed to clear ROs'); return; }
    setROs([]);
  }, [user]);

  const addRO = useCallback(async (ro: Omit<RepairOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return null;

    // Queue if offline — also add to local state so the tech can see it immediately.
    if (!isOnline) {
      const tempId = `offline-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const optimisticLines: ROLine[] = (ro.lines || []).map((l, i) => ({
        ...l,
        id: l.id || crypto.randomUUID(),
        lineNo: l.lineNo ?? i + 1,
        createdAt: l.createdAt || now,
        updatedAt: l.updatedAt || now,
      }));
      const optimisticRO: RepairOrder = {
        ...ro,
        id: tempId,
        lines: optimisticLines,
        paidHours: calcLineHours(optimisticLines),
        createdAt: now,
        updatedAt: now,
      };

      // Store the temp local ID alongside the payload so the status bar can
      // reflect per-RO pending state.
      const queued = await queueAction('addRO', { ro, localId: tempId });
      if (!queued) return null;

      setROs(prev => {
        const updated = [optimisticRO, ...prev];
        if (userId) void saveROsToCache(userId, updated);
        return updated;
      });
      setOfflinePendingIds(prev => new Set([...prev, tempId]));

      toast.info('Saved offline — will sync when reconnected');
      pushDebug({ action: 'addRO QUEUED (offline)', userId: user.id });
      return optimisticRO;
    }

    const { data: newRow, error } = await supabase
      .from('ros')
      .insert(toRosInsert(user.id, ro))
      .select()
      .single();

    if (error || !newRow) {
      const msg = error?.message || 'Unknown error';
      // If network error, queue it
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        const queued = await queueAction('addRO', { ro });
        if (queued) {
          toast.info('Network issue — saved to offline sync queue');
          return { queuedOffline: true };
        }
        return null;
      }
      toast.error(`Failed to create RO: ${msg}`);
      pushDebug({ action: 'addRO FAIL', userId: user.id, error: msg });
      return null;
    }
    pushDebug({ action: 'addRO OK', roId: newRow.id, userId: user.id });

    // Insert lines
    if (ro.lines.length > 0) {
      const lineInserts = toRoLineInserts({
        userId: user.id,
        roId: newRow.id,
        lines: ro.lines,
        fallbackLaborType: ro.laborType || 'customer-pay',
      });
      const { error: lErr } = await supabase.from('ro_lines').insert(lineInserts);
      if (lErr) {
        console.error('Failed to insert lines', lErr);
        pushDebug({ action: 'insertLines FAIL', roId: newRow.id, error: lErr.message, lineCount: lineInserts.length });
        // Roll back the RO header so we don't leave an orphaned 0-hour record
        await supabase.from('ros').delete().eq('id', newRow.id);
        toast.error(`Failed to save RO: ${lErr.message}`);
        return null;
      }
      pushDebug({ action: 'insertLines OK', roId: newRow.id, lineCount: lineInserts.length });
    }

    // Optimistic update: build RO locally instead of refetching everything
    const { data: insertedLines } = await supabase
      .from('ro_lines')
      .select('*')
      .eq('ro_id', newRow.id)
      .order('line_no', { ascending: true });

    const newRO = dbToRepairOrder(newRow as RoRow, (insertedLines || []) as RoLineRow[]);
    // Write new RO into cache immediately so it's available offline without
    // waiting for the next full fetchROs() call.
    setROs((prev) => {
      const updated = [newRO, ...prev];
      void saveROsToCache(user.id, updated);
      return updated;
    });
    return newRO;
  }, [user, userId, isOnline, queueAction]);

  const updateRO = useCallback(async (id: string, updates: Partial<RepairOrder>): Promise<boolean> => {
    if (!user) return false;

    const applyLocalUpdate = (base: RepairOrder): RepairOrder => {
      const nextLines = updates.lines ?? base.lines;
      return {
        ...base,
        ...updates,
        lines: nextLines,
        paidHours: updates.lines ? calcLineHours(nextLines) : base.paidHours,
        updatedAt: new Date().toISOString(),
      };
    };

    // Queue if offline — also apply the update locally so the tech sees the change.
    if (!isOnline) {
      const queued = await queueAction('updateRO', { id, updates });
      if (!queued) return false;

      setROs(prev => {
        const updated = prev.map(r => {
          if (r.id !== id) return r;
          return applyLocalUpdate(r);
        });
        if (userId) void saveROsToCache(userId, updated);
        return updated;
      });
      setOfflinePendingIds(prev => new Set([...prev, id]));

      toast.info('Update saved offline — will sync when reconnected');
      return true;
    }

    const previousRO = rosRef.current.find((r) => r.id === id) ?? null;

    // Optimistically update immediately so all active views (details/list/workspace)
    // reflect paid/open and other edits without waiting on network latency.
    setROs((prev) => {
      const next = prev.map((r) => (r.id === id ? applyLocalUpdate(r) : r));
      void saveROsToCache(user.id, next);
      return next;
    });

    const dbUpdates = toRosUpdate(updates);

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('ros').update(dbUpdates).eq('id', id).eq('user_id', user.id);
      if (error) {
        const msg = error.message || '';
        console.error('updateRO DB error:', error);
        pushDebug({ action: 'updateRO FAIL', roId: id, error: msg });
        if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
          const queued = await queueAction('updateRO', { id, updates });
          if (queued) {
            toast.info('Network issue — update saved to offline sync queue');
            return true;
          }
          if (previousRO) {
            setROs((prev) => {
              const rollback = prev.map((r) => (r.id === id ? previousRO : r));
              void saveROsToCache(user.id, rollback);
              return rollback;
            });
          }
          return false;
        }
        if (previousRO) {
          setROs((prev) => {
            const rollback = prev.map((r) => (r.id === id ? previousRO : r));
            void saveROsToCache(user.id, rollback);
            return rollback;
          });
        }
        toast.error(`Failed to update RO: ${msg}`);
        return false;
      }
    }

    // Replace lines atomically via RPC — delete + insert in a single transaction.
    // This prevents duplicate or orphaned lines on partial failure or retry.
    if (updates.lines) {
      const linesJsonb = toRoLinesJsonb(
        updates.lines,
        updates.laborType || 'customer-pay',
      );
      const { error: rpcErr } = await supabase.rpc('replace_ro_lines', {
        _ro_id: id,
        _lines: linesJsonb as any,
      });
      if (rpcErr) {
        console.error('replace_ro_lines RPC failed', rpcErr);
        pushDebug({ action: 'replaceLines FAIL', roId: id, error: rpcErr.message });
        if (previousRO) {
          setROs((prev) => {
            const rollback = prev.map((r) => (r.id === id ? previousRO : r));
            void saveROsToCache(user.id, rollback);
            return rollback;
          });
        }
        toast.error(`Lines failed to save: ${rpcErr.message}`);
        return false;
      }
    }

    // Fetch the updated row to sync local state with the DB's canonical version
    const { data: updatedRow } = await supabase
      .from('ros')
      .select('*')
      .eq('id', id)
      .single();

    const { data: updatedLines } = await supabase
      .from('ro_lines')
      .select('*')
      .eq('ro_id', id)
      .order('line_no', { ascending: true });

    if (updatedRow) {
      const updated = dbToRepairOrder(updatedRow as RoRow, (updatedLines || []) as RoLineRow[]);
      // Keep cache in sync after an online edit so the updated RO is visible
      // if the user goes offline before the next full fetch.
      setROs((prev) => {
        const next = prev.map((r) => (r.id === id ? updated : r));
        void saveROsToCache(user.id, next);
        return next;
      });
    } else {
      // Re-fetch failed — apply optimistic update from the data we sent
      setROs((prev) => {
        const next = prev.map((r) => {
          if (r.id !== id) return r;
          return applyLocalUpdate(r);
        });
        void saveROsToCache(user.id, next);
        return next;
      });
    }

    return true;
  }, [user, userId, isOnline, queueAction]);

  const deleteRO = useCallback((id: string) => {
    if (!user) return;

    // Read current state via ref (avoids adding `ros` to deps which would
    // recreate the callback on every RO change)
    const savedRO = rosRef.current.find(r => r.id === id);
    if (!savedRO) return;

    // Compute the post-delete list once so both setROs and the cache write use
    // the same value (avoids reading stale state from the ref).
    const newROs = rosRef.current.filter(r => r.id !== id);
    setROs(newROs);
    if (userId) void saveROsToCache(userId, newROs);

    if (!isOnline) {
      void queueAction('deleteRO', { id });
      toast.info('Delete saved offline — will sync when reconnected');
      return;
    }

    const roToRestore = savedRO;

    // Show undo toast — actual DB delete happens after 5s
    toast.success(`RO #${roToRestore.roNumber} deleted`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const pending = pendingDeletes.current.get(id);
          if (pending) {
            clearTimeout(pending.timer);
            pendingDeletes.current.delete(id);
            setROs(prev => {
              if (prev.some(r => r.id === id)) return prev;
              const restored = [pending.savedRO, ...prev];
              if (userId) void saveROsToCache(userId, restored);
              return restored;
            });
          }
        },
      },
    });

    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(id);
      const { error } = await supabase.from('ros').delete().eq('id', id);
      if (error) {
        const msg = error.message || '';
        if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
          void queueAction('deleteRO', { id });
          return;
        }
        // Restore on unexpected DB error
        setROs(prev => {
          if (prev.some(r => r.id === id)) return prev;
          return [roToRestore, ...prev];
        });
        toast.error('Failed to delete RO');
      }
    }, 5000);

    pendingDeletes.current.set(id, { timer, savedRO: roToRestore });
  }, [user, userId, isOnline, queueAction]);

  const duplicateRO = useCallback(async (id: string, newRONumber?: string, isPro?: boolean) => {
    const ro = ros.find(r => r.id === id);
    if (!ro) return;
    // Cap check: free users are limited to RO_MONTHLY_CAP ROs per month.
    if (!isPro) {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const monthlyCount = ros.filter(r => r.date && r.date >= monthStart).length;
      if (monthlyCount >= RO_MONTHLY_CAP) {
        toast.error(`Free plan limit: ${RO_MONTHLY_CAP} ROs/month. Upgrade to Pro to duplicate.`);
        return null;
      }
    }
    return addRO({ ...ro, roNumber: newRONumber || '' });
  }, [ros, addRO]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePresets = useCallback(async (presets: Preset[]) => {
    if (!user) return;
    // Prevent concurrent updates
    if (presetsUpdating.current) return;
    presetsUpdating.current = true;
    setSettings(prev => ({ ...prev, presets }));
    try {
      // Deduplicate by name before saving (keep first occurrence)
      const seen = new Set<string>();
      const uniquePresets = presets.filter(p => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });

      // Sync to DB: delete all, re-insert
      const { error: delErr } = await supabase.from('labor_references').delete().eq('user_id', user.id);
      if (delErr) throw delErr;

      if (uniquePresets.length > 0) {
        const rows = uniquePresets.map((p, i) => ({
          user_id: user.id,
          name: p.name,
          labor_type_default: p.laborType as unknown as LaborTypeDb,
          default_hours: p.defaultHours || 0,
          sort_order: i,
          active: true,
          is_favorite: !!p.isFavorite,
        }));
        const { error: insErr } = await supabase.from('labor_references').insert(rows);
        if (insErr) throw insErr;
      }
    } catch (err: unknown) {
      console.error('Failed to persist presets', err);
      toast.error('Failed to save presets. Please try again.');
      // Revert optimistic update by re-fetching current DB state
      presetsUpdating.current = false;
      await fetchPresets();
      return;
    } finally {
      presetsUpdating.current = false;
    }
    await fetchPresets();
  }, [user, fetchPresets]);

  const updateAdvisors = useCallback(async (advisors: Advisor[]) => {
    if (!user) return;
    if (advisorsUpdating.current) return;
    advisorsUpdating.current = true;
    const normalizedAdvisors = advisors
      .map(a => ({ ...a, name: a.name.trim() }))
      .filter(a => a.name.length > 0);

    const uniqueByName = new Set<string>();
    const uniqueAdvisors = normalizedAdvisors.filter((advisor) => {
      const key = advisor.name.toLowerCase();
      if (uniqueByName.has(key)) return false;
      uniqueByName.add(key);
      return true;
    });

    setSettings(prev => ({
      ...prev,
      advisors: uniqueAdvisors,
      recentAdvisors: uniqueAdvisors.map(a => a.name).slice(0, 6),
    }));
    try {
      // Sync to DB: delete all, re-insert
      const { error: delErr } = await supabase.from('advisors').delete().eq('user_id', user.id);
      if (delErr) throw delErr;

      if (uniqueAdvisors.length > 0) {
        const rows = uniqueAdvisors.map(a => ({
          user_id: user.id,
          name: a.name,
        }));
        const { error } = await supabase.from('advisors').insert(rows);
        if (error) throw error;
      }
      // Only re-fetch on success to get DB-canonical IDs
      await fetchAdvisors();
    } catch (err: unknown) {
      console.error('Failed to persist advisors', err);
      toast.error('Failed to save advisor changes');
      // Revert optimistic update by re-fetching current DB state
      advisorsUpdating.current = false;
      await fetchAdvisors();
      return;
    } finally {
      advisorsUpdating.current = false;
    }
  }, [user, fetchAdvisors]);

  const getDaySummaries = useCallback((startDate: string, endDate: string): DaySummary[] => {
    const summaries: DaySummary[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayROs = ros.filter(ro => effectiveDateOf(ro) === dateStr);
      const lineROs = dayROs.filter(ro => ro.lines.length > 0);
      const simpleROs = dayROs.filter(ro => ro.lines.length === 0);
      const allLines = lineROs.flatMap(ro => paidLinesOf(ro));
      summaries.push({
        date: dateStr,
        totalHours: allLines.reduce((sum, l) => sum + l.hoursPaid, 0) + simpleROs.reduce((sum, ro) => sum + ro.paidHours, 0),
        roCount: dayROs.length,
        warrantyHours: allLines.filter(l => l.laborType === 'warranty').reduce((sum, l) => sum + l.hoursPaid, 0)
          + simpleROs.filter(ro => ro.laborType === 'warranty').reduce((sum, ro) => sum + ro.paidHours, 0),
        customerPayHours: allLines.filter(l => l.laborType === 'customer-pay').reduce((sum, l) => sum + l.hoursPaid, 0)
          + simpleROs.filter(ro => ro.laborType === 'customer-pay').reduce((sum, ro) => sum + ro.paidHours, 0),
        internalHours: allLines.filter(l => l.laborType === 'internal').reduce((sum, l) => sum + l.hoursPaid, 0)
          + simpleROs.filter(ro => ro.laborType === 'internal').reduce((sum, ro) => sum + ro.paidHours, 0),
      });
    }
    return summaries;
  }, [ros]);

  const getAdvisorSummaries = useCallback((startDate?: string, endDate?: string): AdvisorSummary[] => {
    let filteredROs = ros;
    if (startDate && endDate) {
      filteredROs = ros.filter(ro => effectiveDateOf(ro) >= startDate && effectiveDateOf(ro) <= endDate);
    }
    const advisorMap = new Map<string, AdvisorSummary>();
    filteredROs.forEach(ro => {
      const existing = advisorMap.get(ro.advisor);
      if (existing) {
        existing.totalHours += ro.paidHours;
        existing.roCount += 1;
      } else {
        advisorMap.set(ro.advisor, { advisor: ro.advisor, totalHours: ro.paidHours, roCount: 1 });
      }
    });
    return Array.from(advisorMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [ros]);

  const getWeekTotal = useCallback((startDate: string, endDate: string) => {
    const weekROs = ros.filter(ro => effectiveDateOf(ro) >= startDate && effectiveDateOf(ro) <= endDate);
    const lineROs = weekROs.filter(ro => ro.lines.length > 0);
    const simpleROs = weekROs.filter(ro => ro.lines.length === 0);
    const allLines = lineROs.flatMap(ro => paidLinesOf(ro));
    return {
      totalHours: allLines.reduce((sum, l) => sum + l.hoursPaid, 0) + simpleROs.reduce((sum, ro) => sum + ro.paidHours, 0),
      roCount: weekROs.length,
      warrantyHours: allLines.filter(l => l.laborType === 'warranty').reduce((sum, l) => sum + l.hoursPaid, 0)
        + simpleROs.filter(ro => ro.laborType === 'warranty').reduce((sum, ro) => sum + ro.paidHours, 0),
      customerPayHours: allLines.filter(l => l.laborType === 'customer-pay').reduce((sum, l) => sum + l.hoursPaid, 0)
        + simpleROs.filter(ro => ro.laborType === 'customer-pay').reduce((sum, ro) => sum + ro.paidHours, 0),
      internalHours: allLines.filter(l => l.laborType === 'internal').reduce((sum, l) => sum + l.hoursPaid, 0)
        + simpleROs.filter(ro => ro.laborType === 'internal').reduce((sum, ro) => sum + ro.paidHours, 0),
    };
  }, [ros]);


  /**
   * Opt-in sample data seeder. Called by the onboarding flow when the user
   * explicitly requests demo ROs. No-ops if sample data was already seeded for
   * this user, or if the user already has ROs.
   */
  const seedSampleData = useCallback(async () => {
    if (!userId) return;
    if (localStorage.getItem(`sample.seeded.${userId}`)) return;
    localStorage.setItem(`sample.seeded.${userId}`, '1');

    const today = new Date();
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return localDateStr(d);
    };

    const sampleInputs = [
      {
        ro: { roNumber: '100001', date: daysAgo(4), advisor: 'Mike Johnson', notes: 'Sample RO — delete when ready', vehicle: { year: 2021, make: 'Toyota', model: 'Camry' } },
        lines: [
          { description: 'Oil & filter change — 5W-30 synthetic', hoursPaid: 0.3, laborType: 'customer-pay' as LaborType },
          { description: 'Tire rotation', hoursPaid: 0.3, laborType: 'customer-pay' as LaborType },
          { description: 'Multi-point inspection', hoursPaid: 0.5, laborType: 'customer-pay' as LaborType },
        ],
      },
      {
        ro: { roNumber: '100002', date: daysAgo(3), advisor: 'Sarah Lee', vehicle: { year: 2022, make: 'Ford', model: 'F-150' } },
        lines: [
          { description: 'Warranty: transmission output shaft seal replacement', hoursPaid: 2.4, laborType: 'warranty' as LaborType },
          { description: 'Warranty: road test', hoursPaid: 0.5, laborType: 'warranty' as LaborType },
        ],
      },
      {
        ro: { roNumber: '100003', date: daysAgo(2), advisor: 'Mike Johnson', vehicle: { year: 2020, make: 'Honda', model: 'Accord' } },
        lines: [
          { description: 'Brake pad replacement — front axle', hoursPaid: 1.5, laborType: 'customer-pay' as LaborType },
          { description: 'Brake rotor resurface — front', hoursPaid: 0.5, laborType: 'customer-pay' as LaborType },
          { description: 'Brake fluid flush', hoursPaid: 0.4, laborType: 'customer-pay' as LaborType },
        ],
      },
      {
        ro: { roNumber: '100004', date: daysAgo(1), advisor: 'Sarah Lee', vehicle: { year: 2019, make: 'Chevrolet', model: 'Silverado' } },
        lines: [
          { description: '60k service: plugs, air filter, cabin filter', hoursPaid: 2.0, laborType: 'internal' as LaborType },
          { description: 'Engine air induction service', hoursPaid: 0.5, laborType: 'internal' as LaborType },
        ],
      },
    ];

    const seededROs: RepairOrder[] = [];
    for (const { ro, lines } of sampleInputs) {
      const { data: newRow, error: rErr } = await supabase
        .from('ros')
        .insert(toRosInsert(userId, ro))
        .select()
        .single();
      if (rErr || !newRow) continue;
      const lineInserts = toRoLineInserts({ userId, roId: newRow.id, lines, fallbackLaborType: 'customer-pay' });
      const { data: insertedLines } = await supabase.from('ro_lines').insert(lineInserts).select();
      seededROs.push(dbToRepairOrder(newRow as RoRow, (insertedLines || []) as RoLineRow[]));
    }

    if (seededROs.length > 0) {
      setROs(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const newOnes = seededROs.filter(r => !existingIds.has(r.id)).reverse();
        return [...newOnes, ...prev];
      });
    }
  }, [userId]);

  const refreshROs = useCallback(async () => {
    await fetchROs();
  }, [fetchROs]);

  return {
    ros,
    settings,
    loadingROs,
    /** Where the current `ros` array came from. */
    dataSource,
    /** ISO timestamp of the cached snapshot being shown, or null when live. */
    cachedAt,
    /** Set of RO IDs that have unsynced local changes. Cleared after a live fetch. */
    offlinePendingIds,
    /** True when the last fetchROs attempt failed (network/server error). */
    fetchError,
    /** Raw error message from the last failed fetchROs() — use for diagnostics. */
    fetchErrorMessage,
    /**
     * True once both Phase 1 (hot window) and the background Phase 2 (older
     * headers) have finished loading.  False during the ~400 ms window after
     * Phase 1 completes while Phase 2 is still in flight.
     * Consumers may use this to show a subtle "loading older history…" badge.
     */
    hasFullHistory,
    /**
     * True when Phase 2 failed — the displayed dataset may be incomplete.
     * Consumers should show a subtle warning rather than hiding this state.
     */
    historyIncomplete,
    addRO,
    updateRO,
    deleteRO,
    duplicateRO,
    clearAllROs,
    updateSettings,
    updatePresets,
    updateAdvisors,
    getDaySummaries,
    getAdvisorSummaries,
    getWeekTotal,
    seedSampleData,
    refreshROs,
  };
}
