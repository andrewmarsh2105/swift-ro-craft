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
  // Stash custom dates so we can restore them if the user cancels a re-edit
  const [stashedCustomStart, setStashedCustomStart] = useState<string | undefined>(saved?.customStart);
  const [stashedCustomEnd, setStashedCustomEnd] = useState<string | undefined>(saved?.customEnd);

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

  const requestCustomDialog = useCallback(() => {
    if (ownerId) activeCustomOwner = ownerId;
    if (dateFilter === "custom" && customStart && customEnd) {
      // Re-editing: stash current values so cancel can restore them
      setStashedCustomStart(customStart);
      setStashedCustomEnd(customEnd);
      setPrevFilter("custom");
      setCustomStart(undefined);
      setCustomEnd(undefined);
    } else {
      // Fresh custom selection should not restore a stale previous custom range on cancel.
      setStashedCustomStart(undefined);
      setStashedCustomEnd(undefined);
      setPrevFilter(dateFilter);
      setDateFilter("custom");
    }
  }, [dateFilter, ownerId, customStart, customEnd]);

  const applyCustom = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setStashedCustomStart(start);
    setStashedCustomEnd(end);
    setDateFilter("custom");
    activeCustomOwner = null;
  }, []);

  const cancelCustom = useCallback(() => {
    // If we were re-editing and have stashed values, restore them
    if (stashedCustomStart && stashedCustomEnd) {
      setCustomStart(stashedCustomStart);
      setCustomEnd(stashedCustomEnd);
      setDateFilter("custom");
    } else {
      // No valid custom range exists — fall back to previous filter
      setDateFilter(prevFilter !== "custom" ? prevFilter : "week");
    }
    activeCustomOwner = null;
  }, [stashedCustomStart, stashedCustomEnd, prevFilter]);

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
    requestCustomDialog,
  };
}
