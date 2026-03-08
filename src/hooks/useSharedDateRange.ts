import { useState, useCallback, useEffect } from "react";
import type { DateFilterKey } from "@/lib/dateRangeFilter";

/**
 * Shared date range state used by ROListPanel, SpreadsheetView, and ROsTab.
 * Persists to localStorage so the selection survives tab switches.
 * `ownerId` gates which instance may open the custom dialog (prevents duplicates).
 */

const LS_KEY = "ui.sharedDateRange.v1";

interface PersistedState {
  dateFilter: DateFilterKey;
  customStart?: string;
  customEnd?: string;
}

function readLS(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function writeLS(s: PersistedState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

// Module-level variable to track which owner opened the custom dialog
let activeCustomOwner: string | null = null;

export function useSharedDateRange(initial: DateFilterKey = "week", ownerId?: string) {
  const saved = readLS();
  const [dateFilter, setDateFilter] = useState<DateFilterKey>(saved?.dateFilter ?? initial);
  const [customStart, setCustomStart] = useState<string | undefined>(saved?.customStart);
  const [customEnd, setCustomEnd] = useState<string | undefined>(saved?.customEnd);
  const [prevFilter, setPrevFilter] = useState<DateFilterKey>(saved?.dateFilter ?? initial);

  // Persist changes
  useEffect(() => {
    writeLS({ dateFilter, customStart, customEnd });
  }, [dateFilter, customStart, customEnd]);

  // Sync across instances via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== LS_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as PersistedState;
        setDateFilter(next.dateFilter);
        setCustomStart(next.customStart);
        setCustomEnd(next.customEnd);
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const openCustom = useCallback(() => {
    if (ownerId) activeCustomOwner = ownerId;
    setPrevFilter(dateFilter);
    setDateFilter("custom");
  }, [dateFilter, ownerId]);

  const applyCustom = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setDateFilter("custom");
    activeCustomOwner = null;
  }, []);

  const cancelCustom = useCallback(() => {
    if (!customStart || !customEnd) {
      setDateFilter(prevFilter);
    }
    activeCustomOwner = null;
  }, [customStart, customEnd, prevFilter]);

  const setFilter = useCallback((f: DateFilterKey) => {
    if (f === "custom") {
      openCustom();
    } else {
      setDateFilter(f);
    }
  }, [openCustom]);

  // Only show dialog if this instance is the owner (or no owner gating)
  const isDialogOwner = !ownerId || activeCustomOwner === ownerId || activeCustomOwner === null;
  const showCustomDialog = dateFilter === "custom" && (!customStart || !customEnd) && isDialogOwner;

  return {
    dateFilter,
    setFilter,
    customStart,
    customEnd,
    openCustom,
    applyCustom,
    cancelCustom,
    showCustomDialog,
  };
}
