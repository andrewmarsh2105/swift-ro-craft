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

/* ── Metadata field — compact inline pair ──────── */
function MetaField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 flex-shrink-0">{label}</span>
      <span className={cn("text-[11px] font-medium text-foreground truncate", mono && "data-mono")}>{value}</span>
    </div>
  );
}

/* ── Labor type helpers ────────────────────────── */
const laborBorderVar = (type: string) =>
  type === "warranty"
    ? "hsl(var(--status-warranty))"
    : type === "customer-pay"
      ? "hsl(var(--status-customer-pay))"
      : "hsl(var(--status-internal))";

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
      <div className="h-full flex items-center justify-center bg-card">
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
  const accentColor = laborBorderVar(ro.laborType);
  const hasMetadata = !!(ro.customerName || ro.mileage || ro.vehicle?.vin || ro.paidDate || vehicleLabel(ro) !== "—");

  return (
    <div className="h-full flex flex-col bg-card">

      {/* ═══ Header — hero identification band ═══ */}
      <div
        className="flex-shrink-0 sticky top-0 z-10 bg-card border-b border-border/60"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        {/* Primary row: RO# + hours hero + actions */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="text-[18px] font-extrabold tabular-nums text-foreground tracking-tight leading-none">
                #{ro.roNumber}
              </h2>
              <button
                className="text-muted-foreground/50 hover:text-muted-foreground quiet-transition flex-shrink-0"
                onClick={() => copyText("RO #", ro.roNumber)}
                title="Copy RO #"
              >
                <Copy className="h-3 w-3" />
              </button>
              <StatusPill type={ro.laborType} size="sm" />
            </div>

            {/* Hours — hero metric */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="hours-pill text-[13px] px-2.5 py-1">
                {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
              </span>
            </div>
          </div>

          {/* Secondary: date, advisor, vehicle + status badges */}
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <p className="text-[11px] text-muted-foreground truncate">
              {formatDateLong(ro.date)} · {ro.advisor}
              {vehicleLabel(ro) !== "—" && <> · {vehicleLabel(ro)}</>}
            </p>

            <div className="flex items-center gap-1 flex-shrink-0">
              {status.paid === "Paid" ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-sm" style={{ color: "hsl(var(--status-warranty))", background: "hsl(var(--status-warranty-bg))" }}>
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  PAID
                </span>
              ) : (
                <span className="text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-sm" style={{ color: "hsl(var(--status-internal))", background: "hsl(var(--status-internal-bg))" }}>
                  OPEN
                </span>
              )}
              {status.tbd > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm leading-none">
                  <Clock className="h-2.5 w-2.5" />
                  {status.allTbd ? 'TBD' : `${status.tbd} TBD`}
                </span>
              )}
              {status.flags > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm leading-none" style={{ color: "hsl(var(--status-internal))", background: "hsl(var(--status-internal-bg))" }}>
                  <Flag className="h-2.5 w-2.5" />
                  {status.flags}
                </span>
              )}
              {status.checks > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-sm leading-none">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {status.checks}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Scrollable body ═══ */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Metadata strip — compact horizontal fields ── */}
        {hasMetadata && (
          <div className="px-4 py-2.5 border-b border-border/40 bg-muted/15">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <MetaField label="Advisor" value={ro.advisor} />
              <MetaField label="Customer" value={ro.customerName} />
              <MetaField label="Vehicle" value={vehicleLabel(ro) !== "—" ? vehicleLabel(ro) : undefined} />
              <MetaField label="VIN" value={ro.vehicle?.vin} mono />
              <MetaField label="Mileage" value={ro.mileage} />
              <MetaField label="Paid" value={ro.paidDate ? formatDateLong(ro.paidDate) : undefined} />
            </div>
          </div>
        )}

        {/* ── Lines — table-style, no individual cards ──── */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="section-title">Work Lines</p>
            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
              {ro.lines?.length || 0} line{(ro.lines?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>

          {ro.lines?.length ? (
            <div className="border border-border/50 rounded-md overflow-hidden divide-y divide-border/30">
              {ro.lines.map((l, idx) => {
                const lineAccent = laborBorderVar(l.laborType || ro.laborType);
                const description = l.description || "—";
                const isExpanded = !!expandedLineIds[l.id];
                const canExpand = description.length > 100 || description.includes("\n");

                return (
                  <div
                    key={l.id}
                    className="flex items-start gap-2 px-3 py-2 hover:bg-muted/20 quiet-transition"
                    style={{ borderLeft: `2px solid ${lineAccent}` }}
                  >
                    {/* Line # */}
                    <span className="text-[10px] font-bold text-muted-foreground/50 flex-shrink-0 mt-0.5 w-4 text-right tabular-nums">
                      {idx + 1}
                    </span>

                    {/* Description + meta */}
                    <div className="min-w-0 flex-1">
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
                      {l.isTbd && (
                        <span className="inline-block mt-1 text-[9px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-sm">TBD</span>
                      )}
                    </div>

                    {/* Hours */}
                    <span className="hours-pill text-[10px] flex-shrink-0 mt-0.5">
                      {maskHours(Number(l.hoursPaid.toFixed(1)), userSettings.hideTotals ?? false)}h
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-border/40 rounded-md px-3 py-4 text-center">
              <p className="meta-text">No lines recorded.</p>
            </div>
          )}
        </div>

        {/* ── Notes ─────────────────────────────────── */}
        {ro.notes && (
          <div className="px-4 pb-3">
            <p className="section-title mb-1">Notes</p>
            <p className="text-[11px] text-foreground/80 leading-relaxed bg-muted/15 border border-border/30 rounded-md px-3 py-2">
              {ro.notes}
            </p>
          </div>
        )}

        {/* ── Flags & Checks ───────────────────────── */}
        {(flags.length > 0 || issues.length > 0) && (
          <div className="px-4 pb-3">
            <p className="section-title mb-1.5">Flags & Checks</p>
            <div className="border border-border/40 rounded-md p-3 space-y-2">
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
            </div>
          </div>
        )}

        {/* Bottom spacer for action bar */}
        <div className="h-14" />
      </div>

      {/* ═══ Sticky action bar ═══ */}
      <div className="flex-shrink-0 border-t border-border/60 bg-card px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setFlagOpen(true)}
            >
              <Flag className="h-3 w-3" />
              Flag
            </Button>
          </div>
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
