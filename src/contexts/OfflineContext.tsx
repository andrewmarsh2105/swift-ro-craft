import React, { createContext, useContext, ReactNode } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

type OfflineContextType = ReturnType<typeof useOfflineSync>;

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const offlineSync = useOfflineSync();
  return (
    <OfflineContext.Provider value={offlineSync}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}
