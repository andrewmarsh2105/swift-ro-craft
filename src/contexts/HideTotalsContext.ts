import { createContext, useContext } from 'react';

export const HideTotalsContext = createContext(false);
export const useHideTotals = () => useContext(HideTotalsContext);
