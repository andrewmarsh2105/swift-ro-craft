import React, { useState } from "react";
import { AlertTriangle, Clock, Copy, Flag, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/layout/SectionCard";
import { EmptyState } from "@/components/states/EmptyState";
import { StatusPill } from "@/components/mobile/StatusPill";
import { FlagBadge } from "@/components/flags/FlagBadge";
import { ReviewIndicator } from "@/components/flags/ReviewIndicator";
import { AddFlagDialog } from "@/components/flags/AddFlagDialog";

import { useFlagContext } from "@/contexts/FlagContext";
import { useRO } from "@/contexts/ROContext";

import { maskHours } from "@/lib/maskHours";
import { cn } from "@/lib/utils";
import { calcHours, formatDateLong, vehicleLabel } from "@/lib/roDisplay";
import { getStatusSummary } from "@/lib/roStatus";
import { getReviewIssues, type ReviewIssue } from "@/lib/reviewRules";
import type { FlagType } from "@/types/flags";
import type { RepairOrder } from "@/types/ro";

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

interface RODetailsPanelProps {
  ro: RepairOrder | null;
  onEdit: () => void;
  onDuplicate: (newRONumber: string) => void;
  onDelete: () => void;
}

export function RODetailsPanel({ ro, onEdit, onDuplicate, onDelete }: RODetailsPanelProps) {
  const { ros } = useRO();
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();
  const [flagOpen, setFlagOpen] = useState(false);

  if (!ro) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <EmptyState
          icon={Pencil}
          title="Select an RO"
          description="Click a row to view details"
        />
      </div>
    );
  }

  const flags = getFlagsForRO(ro.id);
  const issues = getReviewIssues(ro, ros);
  const hours = calcHours(ro);
  const status = getStatusSummary(ro, flags.length, issues.length);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/80 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="page-title">RO #{ro.roNumber}</h2>
              <button
                className="text-muted-foreground hover:text-foreground quiet-transition"
                onClick={() => copyText("RO #", ro.roNumber)}
                title="Copy RO #"
              >
                <Copy className="icon-row" />
              </button>
            </div>

            <p className="meta-text mt-0.5">
              {formatDateLong(ro.date)} · {ro.advisor} · {vehicleLabel(ro)}
            </p>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <StatusPill type={ro.laborType} size="sm" />
              <Badge
                variant={status.paid === "Paid" ? "outline" : "secondary"}
                className={cn(
                  "text-[9px] px-2 py-0.5 font-semibold rounded-full",
                  status.paid === "Paid"
                    ? "border-[hsl(var(--status-warranty))]/30 text-[hsl(var(--status-warranty))]"
                    : "text-muted-foreground",
                )}
              >
                {status.paid}
              </Badge>
              {status.tbd > 0 && (
                <Badge variant="secondary" className="text-[9px] px-2 py-0.5 gap-1 font-semibold rounded-full">
                  <Clock className="h-2.5 w-2.5" />
                  {status.tbd} TBD
                </Badge>
              )}
              {status.flags > 0 && (
                <Badge variant="secondary" className="text-[9px] px-2 py-0.5 gap-1 font-semibold rounded-full text-[hsl(var(--status-internal))]">
                  <Flag className="h-2.5 w-2.5" />
                  {status.flags} Flag
                </Badge>
              )}
              {status.checks > 0 && (
                <Badge variant="secondary" className="text-[9px] px-2 py-0.5 gap-1 font-semibold rounded-full text-[hsl(var(--destructive))]">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {status.checks} Check
                </Badge>
              )}
              <span className="hours-pill text-xs ml-auto">
                {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setFlagOpen(true)}>
              <Flag className="icon-row" />
              Flag
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onEdit}>
              <Pencil className="icon-row" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 bg-accent/[0.15]">
        {/* Details */}
        <SectionCard title="Details">
          <div className="inset-panel p-3 space-y-2">
            <div className="flex justify-between">
              <span className="meta-text">Advisor</span>
              <span className="text-xs font-medium">{ro.advisor}</span>
            </div>
            <div className="flex justify-between">
              <span className="meta-text">Customer</span>
              <span className="text-xs font-medium">{ro.customerName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="meta-text">Mileage</span>
              <span className="text-xs font-medium">{ro.mileage || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="meta-text">Paid date</span>
              <span className="text-xs font-medium">{ro.paidDate ? formatDateLong(ro.paidDate) : "—"}</span>
            </div>
          </div>
        </SectionCard>

        {/* Vehicle */}
        <SectionCard title="Vehicle">
          <div className="inset-panel p-3 space-y-2">
            <div className="flex justify-between">
              <span className="meta-text">Vehicle</span>
              <span className="text-xs font-medium">{vehicleLabel(ro)}</span>
            </div>
            <div className="flex justify-between">
              <span className="meta-text">VIN</span>
              <span className="text-xs font-medium font-mono">{ro.vehicle?.vin || "—"}</span>
            </div>
          </div>
        </SectionCard>

        {/* Lines */}
        <SectionCard title={`Lines (${ro.lines?.length || 0})`}>
          {ro.lines?.length ? (
            <div className="space-y-1">
              {ro.lines.map((l) => (
                <div key={l.id} className="inset-panel px-3 py-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{l.description || "—"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusPill type={l.laborType || ro.laborType} size="sm" />
                      {l.isTbd && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">TBD</Badge>}
                    </div>
                  </div>
                  <span className="hours-pill text-[10px] flex-shrink-0">
                    {maskHours(Number(l.hoursPaid.toFixed(1)), userSettings.hideTotals ?? false)}h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="meta-text">No lines</p>
          )}
        </SectionCard>

        {/* Flags & Checks */}
        <SectionCard title="Flags & Checks">
          <div className="inset-panel p-3 space-y-2">
            <FlagBadge flags={flags} onClear={clearFlag} />
            {issues.length > 0 ? (
              <ReviewIndicator
                issues={issues}
                onConvertToFlag={(issue, flagType, note) =>
                  addFlag(issue.roId, flagType, note || issue.detail, issue.lineId)
                }
              />
            ) : (
              <p className="meta-text">No checks.</p>
            )}
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="Notes">
          {ro.notes ? <p className="text-xs">{ro.notes}</p> : <p className="meta-text">—</p>}
        </SectionCard>

        {/* Actions */}
        <div className="flex gap-2 pt-2 pb-4">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => onDuplicate(String(Number(ro.roNumber) + 1))}>
            <Copy className="icon-row" />
            Duplicate
          </Button>
          <Button variant="destructive" size="sm" className="h-8 text-xs gap-1.5" onClick={onDelete}>
            <Trash2 className="icon-row" />
            Delete
          </Button>
        </div>
      </div>

      <AddFlagDialog
        open={flagOpen}
        onClose={() => setFlagOpen(false)}
        onSubmit={(flagType, note) => addFlag(ro.id, flagType, note)}
        title={`Flag RO #${ro.roNumber}`}
      />
    </div>
  );
}
