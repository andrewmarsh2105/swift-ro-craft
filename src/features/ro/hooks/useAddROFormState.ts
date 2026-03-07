import { useCallback, useMemo, useState } from "react";
import type { Advisor, Preset, VehicleInfo } from "@/types/ro";
import type { LaborType, ROLine } from "@/types/ro";

function uid() {
  return crypto.randomUUID();
}

function buildLineFromPreset(preset: Preset): ROLine {
  return {
    id: uid(),
    lineNo: 0,
    description: preset.workTemplate || preset.name,
    hoursPaid: preset.defaultHours ?? 0,
    isTbd: false,
    laborType: preset.laborType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function parseClipboardLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function useAddROFormState(params: { presets: Preset[]; advisors: Advisor[] }) {
  const [roNumber, setRoNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [advisor, setAdvisor] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicle, setVehicle] = useState<VehicleInfo | undefined>(undefined);
  const [laborType, setLaborType] = useState<LaborType>("customer-pay");
  const [lines, setLines] = useState<ROLine[]>([]);

  const advisorsByName = useMemo(() => {
    const map = new Map<string, Advisor>();
    for (const a of params.advisors) map.set(a.name.toLowerCase(), a);
    return map;
  }, [params.advisors]);

  const addBlankLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        lineNo: prev.length + 1,
        description: "",
        hoursPaid: 0,
        isTbd: false,
        laborType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }, [laborType]);

  const removeLine = useCallback((idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateLine = useCallback((idx: number, patch: Partial<ROLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }, []);

  const addPreset = useCallback((preset: Preset) => {
    setLines((prev) => [...prev, { ...buildLineFromPreset(preset), lineNo: prev.length + 1 }]);
  }, []);

  const importFromClipboard = useCallback(async () => {
    const text = await navigator.clipboard.readText();
    const entries = parseClipboardLines(text);
    if (!entries.length) return;

    setLines((prev) => [
      ...prev,
      ...entries.map((d, i) => ({
        id: uid(),
        lineNo: prev.length + i + 1,
        description: d,
        hoursPaid: 0,
        isTbd: true,
        laborType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    ]);
  }, [laborType]);

  const hydrateAdvisor = useCallback(
    (name: string) => {
      const a = advisorsByName.get(name.toLowerCase());
      setAdvisor(a?.name ?? name);
    },
    [advisorsByName],
  );

  return {
    roNumber,
    setRoNumber,
    date,
    setDate,
    advisor,
    setAdvisor: hydrateAdvisor,
    customerName,
    setCustomerName,
    mileage,
    setMileage,
    notes,
    setNotes,
    vehicle,
    setVehicle,
    laborType,
    setLaborType,
    lines,
    addBlankLine,
    removeLine,
    updateLine,
    addPreset,
    importFromClipboard,
  };
}
