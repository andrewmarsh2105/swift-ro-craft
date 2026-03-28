import React, { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Copy, Flag, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { getReviewIssues } from "@/lib/reviewRules";
import type { RepairOrder } from "@/types/ro";

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

/* ── Detail row ─────────────────────────────────── */
function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-shrink-0 pt-0.5">{label}</span>
      <span className={cn("text-[11px] font-semibold text-foreground text-right", mono && "font-mono")}>{value}</span>
    </div>
  );
}

/* ── Section wrapper ────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="section-title mb-1.5">{title}</p>
      <div className="inset-panel p-3">
        {children}
      </div>
    </div>
  );
}

/* ── Main panel ─────────────────────────────────── */

interface RODetailsPanelProps {
  ro: RepairOrder | null;
  onEdit: () => void;
  onDelete: () => void;
  onSelectRO?: (ro: RepairOrder) => void;
}

export function RODetailsPanel({ ro, onEdit, onDelete, onSelectRO }: RODetailsPanelProps) {
  const { ros } = useRO();
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();
  const [flagOpen, setFlagOpen] = useState(false);
  const [expandedLineIds, setExpandedLineIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedLineIds({});
  }, [ro?.id]);

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

  const laborBorderColor =
    ro.laborType === "warranty"
      ? "hsl(var(--status-warranty))"
      : ro.laborType === "customer-pay"
        ? "hsl(var(--status-customer-pay))"
        : "hsl(var(--status-internal))";

  return (
    <div className="h-full overflow-y-auto flex flex-col bg-card">
      {/* ── Header ────────────────────────────────── */}
      <div
        className="flex-shrink-0 sticky top-0 z-10 bg-card border-b border-border/60 border-l-[3px]"
        style={{ borderLeftColor: laborBorderColor }}
      >
        <div className="px-4 py-3">
          {/* RO # + hours + copy */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-extrabold tabular-nums text-foreground tracking-tight">
                  #{ro.roNumber}
                </h2>
                <button
                  className="text-muted-foreground/60 hover:text-muted-foreground quiet-transition"
                  onClick={() => copyText("RO #", ro.roNumber)}
                  title="Copy RO #"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <span className="hours-pill">
                  {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
                </span>
              </div>

              {/* Date · advisor · vehicle */}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatDateLong(ro.date)} · {ro.advisor}
                {vehicleLabel(ro) !== "—" && <> · {vehicleLabel(ro)}</>}
              </p>
            </div>

            {/* Flag button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 flex-shrink-0"
              onClick={() => setFlagOpen(true)}
            >
              <Flag className="h-3 w-3" />
              Flag
            </Button>
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <StatusPill type={ro.laborType} size="sm" />
            {status.paid === "Paid" ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded bg-[hsl(var(--status-warranty-bg))]" style={{ color: "hsl(var(--status-warranty))" }}>
                <CheckCircle2 className="h-2.5 w-2.5" />
                Paid
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded leading-none">
                {status.paid}
              </span>
            )}
            {status.tbd > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded leading-none">
                <Clock className="h-2.5 w-2.5" />
                {status.allTbd ? 'TBD All' : `${status.tbd} TBD`}
              </span>
            )}
            {status.flags > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none" style={{ color: "hsl(var(--status-internal))", background: "hsl(var(--status-internal-bg))" }}>
                <Flag className="h-2.5 w-2.5" />
                {status.flags} Flag
              </span>
            )}
            {status.checks > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded leading-none">
                <AlertTriangle className="h-2.5 w-2.5" />
                {status.checks} Check
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────── */}
      <div className="flex-1 p-4 space-y-4">

        {/* Details + Vehicle — side by side if room */}
        <div className="grid grid-cols-1 gap-3">
          <Section title="Details">
            <DetailRow label="Advisor" value={ro.advisor} />
            <DetailRow label="Customer" value={ro.customerName || "—"} />
            <DetailRow label="Mileage" value={ro.mileage || "—"} />
            <DetailRow label="Paid date" value={ro.paidDate ? formatDateLong(ro.paidDate) : "—"} />
            <DetailRow label="Vehicle" value={vehicleLabel(ro)} />
            <DetailRow label="VIN" value={ro.vehicle?.vin || "—"} mono />
          </Section>
        </div>

        {/* Lines */}
        <div>
          <p className="section-title mb-1.5">Lines ({ro.lines?.length || 0})</p>
          {ro.lines?.length ? (
            <div className="space-y-1">
              {ro.lines.map((l, idx) => (
                <div key={l.id} className="inset-panel px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Line number + description */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground/60 flex-shrink-0 mt-0.5">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0">
                          {(() => {
                            const description = l.description || "—";
                            const isExpanded = !!expandedLineIds[l.id];
                            const canExpand = description.length > 100 || description.includes("\n");

                            return (
                              <>
                                <p
                                  className={cn(
                                    "text-[11px] font-semibold text-foreground whitespace-pre-wrap break-words leading-snug",
                                    !isExpanded && canExpand && "line-clamp-2",
                                  )}
                                >
                                  {description}
                                </p>
                                {canExpand && (
                                  <button
                                    type="button"
                                    className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline"
                                    onClick={() =>
                                      setExpandedLineIds((prev) => ({ ...prev, [l.id]: !prev[l.id] }))
                                    }
                                  >
                                    {isExpanded ? (
                                      <><ChevronUp className="h-2.5 w-2.5" />Less</>
                                    ) : (
                                      <><ChevronDown className="h-2.5 w-2.5" />More</>
                                    )}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                          <div className="flex items-center gap-1.5 mt-1">
                            <StatusPill type={l.laborType || ro.laborType} size="sm" />
                            {l.isTbd && (
                              <span className="text-[9px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">TBD</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="hours-pill text-[10px] flex-shrink-0">
                      {maskHours(Number(l.hoursPaid.toFixed(1)), userSettings.hideTotals ?? false)}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="meta-text px-3 py-2">No lines recorded.</p>
          )}
        </div>

        {/* Notes */}
        {ro.notes && (
          <Section title="Notes">
            <p className="text-[11px] leading-relaxed">{ro.notes}</p>
          </Section>
        )}

        {/* Flags & Checks */}
        {(flags.length > 0 || issues.length > 0) && (
          <Section title="Flags & Checks">
            <FlagBadge flags={flags} onClear={clearFlag} />
            {issues.length > 0 && (
              <ReviewIndicator
                issues={issues}
                onConvertToFlag={(issue, flagType, note) =>
                  addFlag(issue.roId, flagType, note || issue.detail, issue.lineId)
                }
                onGoToDuplicateRO={onSelectRO ? (roId) => {
                  const dupRO = ros.find((r) => r.id === roId);
                  if (dupRO) onSelectRO(dupRO);
                } : undefined}
              />
            )}
          </Section>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 pb-2">
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit RO
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
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
