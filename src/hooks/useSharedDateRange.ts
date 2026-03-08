import { useState, useCallback } from "react";
import type { DateFilterKey } from "@/lib/dateRangeFilter";

/**
 * Shared date range state used by both ROListPanel and SpreadsheetView.
 * Keeps filter key + optional custom start/end in sync.
 */
export function useSharedDateRange(initial: DateFilterKey = "week") {
  const [dateFilter, setDateFilter] = useState<DateFilterKey>(initial);
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();
  const [prevFilter, setPrevFilter] = useState<DateFilterKey>(initial);

  const openCustom = useCallback(() => {
    setPrevFilter(dateFilter);
    setDateFilter("custom");
  }, [dateFilter]);

  const applyCustom = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setDateFilter("custom");
  }, []);

  const cancelCustom = useCallback(() => {
    if (!customStart || !customEnd) {
      setDateFilter(prevFilter);
    }
  }, [customStart, customEnd, prevFilter]);

  const setFilter = useCallback((f: DateFilterKey) => {
    if (f === "custom") {
      openCustom();
    } else {
      setDateFilter(f);
    }
  }, [openCustom]);

  return {
    dateFilter,
    setFilter,
    customStart,
    customEnd,
    openCustom,
    applyCustom,
    cancelCustom,
    showCustomDialog: dateFilter === "custom" && (!customStart || !customEnd),
  };
}
