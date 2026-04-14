import { useState, useCallback, useEffect, useMemo } from 'react';
import type { DateFilterKey } from '@/lib/dateRangeFilter';
import {
  getDefaultPeriodFilter,
  normalizeDateFilterForPayPeriod,
  type PayPeriodSettingsLike,
} from '@/lib/payPeriodRange';

/**
 * Shared date range state used by ROListPanel, SpreadsheetView, and ROsTab.
 * Persists to localStorage so the selection survives tab switches.
 * `ownerId` gates which instance may open the custom dialog (prevents duplicates).
 */

const LS_KEY = 'ui.sharedDateRange.v1';

interface PersistedState {
  dateFilter: DateFilterKey;
  customStart?: string;
  customEnd?: string;
}

const VALID_DATE_FILTERS: DateFilterKey[] = ['all', 'today', 'last_week', 'week', 'month', 'pay_period', 'last_pay_period', 'custom'];

function isDateFilterKey(value: unknown): value is DateFilterKey {
  return typeof value === 'string' && VALID_DATE_FILTERS.includes(value as DateFilterKey);
}

function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizePersistedState(value: unknown): PersistedState | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Partial<PersistedState>;
  if (!isDateFilterKey(parsed.dateFilter)) return null;

  return {
    dateFilter: parsed.dateFilter,
    customStart: isISODate(parsed.customStart) ? parsed.customStart : undefined,
    customEnd: isISODate(parsed.customEnd) ? parsed.customEnd : undefined,
  };
}

function readLS(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return normalizePersistedState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLS(s: PersistedState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

let activeCustomOwner: string | null = null;

export function useSharedDateRange(initial: DateFilterKey = 'week', ownerId?: string, payPeriodSettings?: PayPeriodSettingsLike) {
  const defaultFilter = useMemo(
    () => (payPeriodSettings ? getDefaultPeriodFilter(payPeriodSettings) : initial),
    [initial, payPeriodSettings],
  );

  const saved = readLS();
  const initialFilter = payPeriodSettings
    ? normalizeDateFilterForPayPeriod(saved?.dateFilter ?? defaultFilter, payPeriodSettings)
    : (saved?.dateFilter ?? defaultFilter);

  const [dateFilter, setDateFilter] = useState<DateFilterKey>(initialFilter);
  const [customStart, setCustomStart] = useState<string | undefined>(saved?.customStart);
  const [customEnd, setCustomEnd] = useState<string | undefined>(saved?.customEnd);
  const [prevFilter, setPrevFilter] = useState<DateFilterKey>(initialFilter);
  const [stashedCustomStart, setStashedCustomStart] = useState<string | undefined>(saved?.customStart);
  const [stashedCustomEnd, setStashedCustomEnd] = useState<string | undefined>(saved?.customEnd);

  useEffect(() => {
    writeLS({ dateFilter, customStart, customEnd });
  }, [dateFilter, customStart, customEnd]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== LS_KEY || !e.newValue) return;
      try {
        const next = normalizePersistedState(JSON.parse(e.newValue));
        if (!next) return;
        const nextFilter = payPeriodSettings
          ? normalizeDateFilterForPayPeriod(next.dateFilter, payPeriodSettings)
          : next.dateFilter;
        setDateFilter(nextFilter);
        setCustomStart(next.customStart);
        setCustomEnd(next.customEnd);
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [payPeriodSettings]);

  useEffect(() => {
    if (!payPeriodSettings) return;
    const normalized = normalizeDateFilterForPayPeriod(dateFilter, payPeriodSettings);
    if (normalized !== dateFilter) {
      setDateFilter(normalized);
    }
  }, [dateFilter, payPeriodSettings]);

  const openCustom = useCallback(() => {
    if (ownerId) activeCustomOwner = ownerId;
    setPrevFilter(dateFilter);
    setDateFilter('custom');
  }, [dateFilter, ownerId]);

  const requestCustomDialog = useCallback(() => {
    if (ownerId) activeCustomOwner = ownerId;
    if (dateFilter === 'custom' && customStart && customEnd) {
      setStashedCustomStart(customStart);
      setStashedCustomEnd(customEnd);
      setPrevFilter('custom');
      setCustomStart(undefined);
      setCustomEnd(undefined);
    } else {
      setStashedCustomStart(undefined);
      setStashedCustomEnd(undefined);
      setPrevFilter(dateFilter);
      setDateFilter('custom');
    }
  }, [dateFilter, ownerId, customStart, customEnd]);

  const applyCustom = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setStashedCustomStart(start);
    setStashedCustomEnd(end);
    setDateFilter('custom');
    activeCustomOwner = null;
  }, []);

  const cancelCustom = useCallback(() => {
    if (stashedCustomStart && stashedCustomEnd) {
      setCustomStart(stashedCustomStart);
      setCustomEnd(stashedCustomEnd);
      setDateFilter('custom');
    } else {
      const fallback = prevFilter !== 'custom' ? prevFilter : defaultFilter;
      const normalized = payPeriodSettings
        ? normalizeDateFilterForPayPeriod(fallback, payPeriodSettings)
        : fallback;
      setDateFilter(normalized);
    }
    activeCustomOwner = null;
  }, [stashedCustomStart, stashedCustomEnd, prevFilter, defaultFilter, payPeriodSettings]);

  const setFilter = useCallback((f: DateFilterKey) => {
    if (f === 'custom') {
      openCustom();
    } else {
      setDateFilter(f);
    }
  }, [openCustom]);

  const isDialogOwner = !ownerId || activeCustomOwner === ownerId || activeCustomOwner === null;
  const showCustomDialog = dateFilter === 'custom' && (!customStart || !customEnd) && isDialogOwner;

  return {
    dateFilter,
    setFilter,
    customStart,
    customEnd,
    openCustom,
    applyCustom,
    cancelCustom,
    showCustomDialog,
    requestCustomDialog,
  };
}
