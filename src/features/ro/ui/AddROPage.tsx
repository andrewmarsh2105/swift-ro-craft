import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Plus, ClipboardPaste, Trash2 } from "lucide-react";

import { useROStore } from "@/hooks/useROStore";
import { useAddROFormState } from "@/features/ro/hooks/useAddROFormState";
import { AddROHeader } from "@/features/ro/ui/components/AddROHeader";
import { AdvisorPickerSheet } from "@/features/ro/ui/components/AdvisorPickerSheet";
import { RoCapSheet } from "@/features/ro/ui/components/RoCapSheet";
import { PresetButton } from "@/features/ro/ui/components/PresetButton";
import { buildRoPayload } from "@/features/ro/domain/buildRoPayload";
import { getLineTotals } from "@/features/ro/domain/lines";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import type { LaborType } from "@/types/ro";
import { laborTypeOptions } from "@/features/ro/domain/constants";

export default function AddROPage() {
  const navigate = useNavigate();
  const { addRO, settings, ros } = useROStore();
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  function checkDuplicateRO(roNum: string) {
    const trimmed = roNum.trim().toLowerCase();
    if (!trimmed) { setDuplicateWarning(false); return; }
    setDuplicateWarning(ros.some(r => r.roNumber.trim().toLowerCase() === trimmed));
  }

  const form = useAddROFormState({
    presets: settings.presets,
    advisors: settings.advisors,
  });

  const totals = useMemo(() => getLineTotals(form.lines), [form.lines]);

  async function onSave() {
    const payload = buildRoPayload(form);

    if (!payload.roNumber.trim()) {
      toast.error("RO number is required");
      return;
    }
    if (!payload.advisor.trim()) {
      toast.error("Advisor is required");
      return;
    }
    if (!payload.date) {
      toast.error("Date is required");
      return;
    }

    const saved = await addRO(payload);
    if (!saved) return;

    toast.success("RO saved");
    navigate("/");
  }

  function onLaborTypeChange(v: string) {
    form.setLaborType(v as LaborType);
  }

  return (
    <div className="min-h-screen bg-background">
      <AddROHeader onSave={onSave} onBack={() => navigate(-1)} />

      {duplicateWarning && (
        <div className="max-w-3xl mx-auto px-4 pt-2">
          <div className="flex items-center gap-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            An RO with this number already exists.
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* RO # and Date fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ro-number">RO #</Label>
            <Input
              id="ro-number"
              placeholder="RO #"
              value={form.roNumber}
              onChange={(e) => form.setRoNumber(e.target.value)}
              onBlur={() => checkDuplicateRO(form.roNumber)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ro-date">Date</Label>
            <Input
              id="ro-date"
              type="date"
              value={form.date}
              onChange={(e) => form.setDate(e.target.value)}
            />
          </div>
        </div>

        <AdvisorPickerSheet
          advisor={form.advisor}
          setAdvisor={form.setAdvisor}
          advisors={settings.advisors}
        />

        <RoCapSheet
          customerName={form.customerName}
          setCustomerName={form.setCustomerName}
          mileage={form.mileage}
          setMileage={form.setMileage}
          vehicle={form.vehicle}
          setVehicle={form.setVehicle}
          notes={form.notes}
          setNotes={form.setNotes}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Labor Type</h3>
              <p className="text-xs text-muted-foreground">
                Used as default for new lines
              </p>
            </div>
            <Select value={form.laborType} onValueChange={onLaborTypeChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {laborTypeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.presets.slice(0, 12).map((p) => (
              <PresetButton
                key={p.id}
                preset={p}
                onClick={() => form.addPreset(p)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-background py-2">
            <h3 className="text-sm font-semibold text-foreground">Lines</h3>
            <span className="hours-pill">
              {totals.paidHours.toFixed(1)}h total
            </span>
          </div>

          <div className="space-y-2">
            {form.lines.map((line, idx) => (
              <div
                key={line.id}
                className="rounded-lg border bg-card p-3 space-y-2"
              >
                {/* Row 1: Full-width description */}
                <Input
                  className="w-full"
                  value={line.description}
                  onChange={(e) => form.updateLine(idx, { description: e.target.value })}
                  placeholder="Work performed..."
                />
                {/* Row 2: Hours + delete */}
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24 text-right"
                    value={line.hoursPaid || ""}
                    onChange={(e) =>
                      form.updateLine(idx, { hoursPaid: Number(e.target.value || 0) })
                    }
                    type="number"
                    step="0.1"
                    min="0"
                  />
                  <span className="text-xs text-muted-foreground">hrs</span>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-destructive hover:text-destructive flex-shrink-0"
                    onClick={() => form.removeLine(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => form.addBlankLine()}>
              <Plus className="h-4 w-4" />
              Add line
            </Button>
            <Button variant="ghost" onClick={() => form.importFromClipboard()}>
              <ClipboardPaste className="h-4 w-4" />
              Paste lines
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
