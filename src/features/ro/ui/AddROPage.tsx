import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useROStore } from "@/hooks/useROStore";
import { useAddROFormState } from "@/features/ro/hooks/useAddROFormState";
import { AddROHeader } from "@/features/ro/ui/components/AddROHeader";
import { AdvisorPickerSheet } from "@/features/ro/ui/components/AdvisorPickerSheet";
import { RoCapSheet } from "@/features/ro/ui/components/RoCapSheet";
import { PresetButton } from "@/features/ro/ui/components/PresetButton";
import { buildRoPayload } from "@/features/ro/domain/buildRoPayload";
import { getLineTotals } from "@/features/ro/domain/lines";
import type { LaborType } from "@/types/ro";
import { laborTypeOptions } from "@/features/ro/domain/constants";

export default function AddROPage() {
  const navigate = useNavigate();
  const { addRO, settings } = useROStore();

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
      <AddROHeader
        roNumber={form.roNumber}
        setRoNumber={form.setRoNumber}
        date={form.date}
        setDate={form.setDate}
        onSave={onSave}
        onBack={() => navigate(-1)}
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={form.laborType}
              onChange={(e) => onLaborTypeChange(e.target.value)}
            >
              {laborTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Lines</h3>
            <p className="text-xs text-muted-foreground">
              Total paid hours: {totals.paidHours}
            </p>
          </div>

          <div className="space-y-2">
            {form.lines.map((line, idx) => (
              <div key={line.id} className="flex items-center gap-2 rounded-md border p-2">
                <div className="flex flex-1 items-center gap-2">
                  <input
                    className="flex-1 rounded border bg-background px-2 py-1 text-sm"
                    value={line.description}
                    onChange={(e) => form.updateLine(idx, { description: e.target.value })}
                    placeholder="Work performed..."
                  />
                  <input
                    className="w-20 rounded border bg-background px-2 py-1 text-sm text-right"
                    value={line.hoursPaid || ""}
                    onChange={(e) =>
                      form.updateLine(idx, { hoursPaid: Number(e.target.value || 0) })
                    }
                    type="number"
                    step="0.1"
                    min="0"
                  />
                  <button
                    className="text-xs text-destructive hover:underline"
                    onClick={() => form.removeLine(idx)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent"
              onClick={() => form.addBlankLine()}
            >
              Add line
            </button>
            <button
              className="rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent"
              onClick={() => form.importFromClipboard()}
            >
              Paste lines
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
