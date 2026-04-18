import { ClipboardList, BarChart3, Settings, BadgeDollarSign } from 'lucide-react';

export const mobileTabs = [
  { id: 'ros', label: 'ROs', icon: ClipboardList },
  { id: 'summary', label: 'Summary', icon: BarChart3 },
  { id: 'spiffs', label: 'Spiffs', icon: BadgeDollarSign },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export type MobileTabId = (typeof mobileTabs)[number]['id'];
