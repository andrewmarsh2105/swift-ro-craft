import { useState, useCallback, useMemo } from 'react';
import type { RepairOrder, Preset, Settings, DaySummary, AdvisorSummary, LaborType, Advisor } from '@/types/ro';

// Sample data for demo
const sampleROs: RepairOrder[] = [
  {
    id: '1',
    roNumber: '123456',
    date: '2026-01-30',
    advisor: 'Mike Johnson',
    paidHours: 2.5,
    laborType: 'warranty',
    workPerformed: 'Replaced front brake pads and rotors',
    createdAt: '2026-01-30T08:00:00Z',
    updatedAt: '2026-01-30T08:00:00Z',
  },
  {
    id: '2',
    roNumber: '123457',
    date: '2026-01-30',
    advisor: 'Sarah Williams',
    paidHours: 1.2,
    laborType: 'customer-pay',
    workPerformed: 'Oil change and tire rotation',
    createdAt: '2026-01-30T09:30:00Z',
    updatedAt: '2026-01-30T09:30:00Z',
  },
  {
    id: '3',
    roNumber: '123458',
    date: '2026-01-29',
    advisor: 'Mike Johnson',
    paidHours: 3.0,
    laborType: 'warranty',
    workPerformed: 'Transmission fluid flush and filter replacement',
    createdAt: '2026-01-29T14:00:00Z',
    updatedAt: '2026-01-29T14:00:00Z',
  },
  {
    id: '4',
    roNumber: '123459',
    date: '2026-01-29',
    advisor: 'Tom Chen',
    paidHours: 0.8,
    laborType: 'internal',
    workPerformed: 'PDI inspection on new vehicle',
    createdAt: '2026-01-29T11:00:00Z',
    updatedAt: '2026-01-29T11:00:00Z',
  },
  {
    id: '5',
    roNumber: '123460',
    date: '2026-01-28',
    advisor: 'Sarah Williams',
    paidHours: 4.2,
    laborType: 'customer-pay',
    workPerformed: 'Timing belt replacement and water pump',
    createdAt: '2026-01-28T10:00:00Z',
    updatedAt: '2026-01-28T10:00:00Z',
  },
];

const defaultPresets: Preset[] = [
  { id: '1', name: 'Oil Change', laborType: 'customer-pay', defaultHours: 0.5, workTemplate: 'Oil change and filter replacement' },
  { id: '2', name: 'Brake Service', laborType: 'warranty', defaultHours: 1.5, workTemplate: 'Brake pad replacement' },
  { id: '3', name: 'Tire Rotation', laborType: 'customer-pay', defaultHours: 0.3, workTemplate: 'Tire rotation and inspection' },
  { id: '4', name: 'PDI', laborType: 'internal', defaultHours: 0.8, workTemplate: 'Pre-delivery inspection' },
  { id: '5', name: 'Recall', laborType: 'warranty', defaultHours: 1.0, workTemplate: 'Recall service performed' },
];

const defaultAdvisors: Advisor[] = [
  { id: '1', name: 'Mike Johnson' },
  { id: '2', name: 'Sarah Williams' },
  { id: '3', name: 'Tom Chen' },
  { id: '4', name: 'Lisa Park' },
];

const defaultSettings: Settings = {
  recentAdvisors: ['Mike Johnson', 'Sarah Williams', 'Tom Chen', 'Lisa Park'],
  advisors: defaultAdvisors,
  presets: defaultPresets,
  showDarkMode: false,
};

export function useROStore() {
  const [ros, setROs] = useState<RepairOrder[]>(sampleROs);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const clearAllROs = useCallback(() => {
    setROs([]);
  }, []);

  const addRO = useCallback((ro: Omit<RepairOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRO: RepairOrder = {
      ...ro,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setROs(prev => [newRO, ...prev]);
    
    // Add advisor to recent if not already there
    if (!settings.recentAdvisors.includes(ro.advisor)) {
      setSettings(prev => ({
        ...prev,
        recentAdvisors: [ro.advisor, ...prev.recentAdvisors].slice(0, 6),
      }));
    }
    
    return newRO;
  }, [settings.recentAdvisors]);

  const updateRO = useCallback((id: string, updates: Partial<RepairOrder>) => {
    setROs(prev => prev.map(ro => 
      ro.id === id 
        ? { ...ro, ...updates, updatedAt: new Date().toISOString() }
        : ro
    ));
  }, []);

  const deleteRO = useCallback((id: string) => {
    setROs(prev => prev.filter(ro => ro.id !== id));
  }, []);

  const duplicateRO = useCallback((id: string) => {
    const ro = ros.find(r => r.id === id);
    if (ro) {
      const newRO: RepairOrder = {
        ...ro,
        id: Date.now().toString(),
        roNumber: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setROs(prev => [newRO, ...prev]);
      return newRO;
    }
  }, [ros]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePresets = useCallback((presets: Preset[]) => {
    setSettings(prev => ({ ...prev, presets }));
  }, []);

  const updateAdvisors = useCallback((advisors: Advisor[]) => {
    setSettings(prev => ({ ...prev, advisors }));
  }, []);

  // Summary calculations
  const getDaySummaries = useCallback((startDate: string, endDate: string): DaySummary[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const summaries: DaySummary[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayROs = ros.filter(ro => ro.date === dateStr);
      
      summaries.push({
        date: dateStr,
        totalHours: dayROs.reduce((sum, ro) => sum + ro.paidHours, 0),
        roCount: dayROs.length,
        warrantyHours: dayROs.filter(ro => ro.laborType === 'warranty').reduce((sum, ro) => sum + ro.paidHours, 0),
        customerPayHours: dayROs.filter(ro => ro.laborType === 'customer-pay').reduce((sum, ro) => sum + ro.paidHours, 0),
        internalHours: dayROs.filter(ro => ro.laborType === 'internal').reduce((sum, ro) => sum + ro.paidHours, 0),
      });
    }

    return summaries;
  }, [ros]);

  const getAdvisorSummaries = useCallback((startDate?: string, endDate?: string): AdvisorSummary[] => {
    let filteredROs = ros;
    
    if (startDate && endDate) {
      filteredROs = ros.filter(ro => ro.date >= startDate && ro.date <= endDate);
    }

    const advisorMap = new Map<string, AdvisorSummary>();
    
    filteredROs.forEach(ro => {
      const existing = advisorMap.get(ro.advisor);
      if (existing) {
        existing.totalHours += ro.paidHours;
        existing.roCount += 1;
      } else {
        advisorMap.set(ro.advisor, {
          advisor: ro.advisor,
          totalHours: ro.paidHours,
          roCount: 1,
        });
      }
    });

    return Array.from(advisorMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [ros]);

  const getWeekTotal = useCallback((startDate: string, endDate: string) => {
    const weekROs = ros.filter(ro => ro.date >= startDate && ro.date <= endDate);
    return {
      totalHours: weekROs.reduce((sum, ro) => sum + ro.paidHours, 0),
      roCount: weekROs.length,
      warrantyHours: weekROs.filter(ro => ro.laborType === 'warranty').reduce((sum, ro) => sum + ro.paidHours, 0),
      customerPayHours: weekROs.filter(ro => ro.laborType === 'customer-pay').reduce((sum, ro) => sum + ro.paidHours, 0),
      internalHours: weekROs.filter(ro => ro.laborType === 'internal').reduce((sum, ro) => sum + ro.paidHours, 0),
    };
  }, [ros]);

  return {
    ros,
    settings,
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
  };
}
