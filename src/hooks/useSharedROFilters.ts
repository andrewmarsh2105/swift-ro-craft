import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LaborType, RepairOrder } from '@/types/ro';
import { matchesSearchQuery, normalizeAdvisorName } from '@/lib/roFilters';
import { hasPaidDate } from '@/lib/paidDate';

const LS_KEY = 'ui.sharedROFilters.v1';

export interface SharedROFiltersState {
  searchQuery: string;
  advisors: string[];
  laborTypes: LaborType[];
  payStatus: 'all' | 'paid' | 'open';
}

const DEFAULT_FILTERS: SharedROFiltersState = {
  searchQuery: '',
  advisors: [],
  laborTypes: [],
  payStatus: 'all',
};

function readLS(): SharedROFiltersState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<SharedROFiltersState>;
    return {
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      advisors: Array.isArray(parsed.advisors) ? parsed.advisors : [],
      laborTypes: Array.isArray(parsed.laborTypes) ? parsed.laborTypes as LaborType[] : [],
      payStatus: (parsed.payStatus === 'paid' || parsed.payStatus === 'open') ? parsed.payStatus : 'all',
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function writeLS(value: SharedROFiltersState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function applySharedROFilters(ros: RepairOrder[], filters: SharedROFiltersState): RepairOrder[] {
  let result = ros;

  const q = filters.searchQuery.trim();
  if (q) {
    result = result.filter((ro) => matchesSearchQuery(ro, q));
  }

  if (filters.advisors.length > 0) {
    const selected = new Set(filters.advisors.map((advisor) => normalizeAdvisorName(advisor)));
    result = result.filter((ro) => selected.has(normalizeAdvisorName(ro.advisor)));
  }

  if (filters.laborTypes.length > 0) {
    result = result.filter((ro) => filters.laborTypes.includes(ro.laborType));
  }

  if (filters.payStatus === 'paid') {
    result = result.filter((ro) => hasPaidDate(ro));
  } else if (filters.payStatus === 'open') {
    result = result.filter((ro) => !hasPaidDate(ro));
  }

  return result;
}

export function useSharedROFilters() {
  const [filters, setFilters] = useState<SharedROFiltersState>(() => readLS());

  useEffect(() => {
    writeLS(filters);
  }, [filters]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LS_KEY || !event.newValue) return;
      setFilters(readLS());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, []);

  const toggleAdvisor = useCallback((advisor: string) => {
    setFilters((prev) => ({
      ...prev,
      advisors: prev.advisors.includes(advisor)
        ? prev.advisors.filter((a) => a !== advisor)
        : [...prev.advisors, advisor],
    }));
  }, []);

  const setSingleAdvisor = useCallback((advisor: string) => {
    setFilters((prev) => ({ ...prev, advisors: advisor === 'all' ? [] : [advisor] }));
  }, []);

  const toggleLaborType = useCallback((laborType: LaborType) => {
    setFilters((prev) => ({
      ...prev,
      laborTypes: prev.laborTypes.includes(laborType)
        ? prev.laborTypes.filter((t) => t !== laborType)
        : [...prev.laborTypes, laborType],
    }));
  }, []);

  const setPayStatus = useCallback((payStatus: 'all' | 'paid' | 'open') => {
    setFilters((prev) => ({ ...prev, payStatus }));
  }, []);

  const clearNonDateFilters = useCallback(() => {
    setFilters((prev) => ({ ...prev, searchQuery: '', advisors: [], laborTypes: [], payStatus: 'all' }));
  }, []);

  return useMemo(() => ({
    filters,
    setFilters,
    setSearchQuery,
    toggleAdvisor,
    setSingleAdvisor,
    toggleLaborType,
    setPayStatus,
    clearNonDateFilters,
  }), [filters, setSearchQuery, toggleAdvisor, setSingleAdvisor, toggleLaborType, setPayStatus, clearNonDateFilters]);
}
