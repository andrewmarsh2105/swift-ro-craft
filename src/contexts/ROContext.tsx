import React, { createContext, useContext, ReactNode } from 'react';
import { useROStore } from '@/hooks/useROStore';

type ROContextType = ReturnType<typeof useROStore>;

const ROContext = createContext<ROContextType | null>(null);

export function ROProvider({ children }: { children: ReactNode }) {
  const store = useROStore();
  
  return (
    <ROContext.Provider value={store}>
      {children}
    </ROContext.Provider>
  );
}

export function useRO() {
  const context = useContext(ROContext);
  if (!context) {
    throw new Error('useRO must be used within ROProvider');
  }
  return context;
}

/** Safe version that returns null when outside ROProvider (for resilient components) */
export function useROSafe() {
  return useContext(ROContext);
}
