import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  Copy,
  FileText,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { BottomSheet } from "@/components/mobile/BottomSheet";
import { StatusPill } from "@/components/mobile/StatusPill";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/layout/SectionCard";
import { EmptyState } from "@/components/states/EmptyState";

import { useFlagContext } from "@/contexts/FlagContext";
import { useRO } from "@/contexts/ROContext";
import { ROActionMenu } from "@/components/shared/ROActionMenu";
import { FlagBadge } from "@/components/flags/FlagBadge";
import { AddFlagDialog } from "@/components/flags/AddFlagDialog";

import { maskHours } from "@/lib/maskHours";
import { getReviewIssues, type ReviewIssue } from "@/lib/reviewRules";
import { calcHours, effectiveDate, formatDateLong, formatDateShort, vehicleLabel } from "@/lib/roDisplay";
import { cn } from "@/lib/utils";

import type { RepairOrder } from "@/types/ro";

interface RODetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ro: RepairOrder | null;
  onEdit: () => void;
  onDelete: () => void;
  onSelectRO?: (ro: RepairOrder) => void;
  existingRONumbers?: string[];
}

async function copyToClipboard(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

function ChecksPanel(props: {
  issues: ReviewIssue[];
  onConvert: (issue: ReviewIssue) => void;
  onGoToDuplicateRO?: (roId: string) => void;
}) {
  if (!props.issues.length) return null;

  return (
    <div className="space-y-2">
      {props.issues.map((i, idx) => (
        <div
          key={idx}
          className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3"
        >
          <div className="flex gap-2 flex-1 min-w-0">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{i.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{i.detail}</p>
              <div className="mt-1.5">
                {i.code === 'duplicate_ro' && i.duplicateRoIds && props.onGoToDuplicateRO ? (
                  <button
                    onClick={() => props.onGoToDuplicateRO!(i.duplicateRoIds![0])}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    <ArrowRight className="h-3 w-3 inline mr-1" />
                    Go to duplicate RO
                  </button>
                ) : (
                  <button
                    onClick={() => props.onConvert(i)}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Flag className="h-3 w-3 inline mr-1" />
                    Convert to flag
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RODetailSheet({
  isOpen,
  onClose,
  ro,
  onEdit,
  onDelete,
  onSelectRO,
  existingRONumbers = [],
}: RODetailSheetProps) {
  const { ros, updateRO } = useRO();
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [convertingIssue, setConvertingIssue] = useState<ReviewIssue | null>(null);
  const [expandedLineIds, setExpandedLineIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedLineIds({});
    if (!isOpen) {
      setFlagDialogOpen(false);
      setConvertingIssue(null);
    }
  }, [ro?.id, isOpen]);

  const flags = useMemo(() => (ro ? getFlagsForRO(ro.id) : []), [getFlagsForRO, ro]);
  const issues = useMemo(() => (ro ? getReviewIssues(ro, ros) : []), [ro, ros]);
  const hours = useMemo(() => (ro ? calcHours(ro) : 0), [ro]);

  const showPaidDate = !!ro?.paidDate && ro?.paidDate !== ro?.date;

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onClose();
  };

  const openFlagDialog = () => {
    setConvertingIssue(null);
    setFlagDialogOpen(true);
  };

  const isAllTbd = !!(ro?.lines?.length && ro.lines.every(l => l.isTbd));

  const handleTbdAll = () => {
    if (!ro) return;
    updateRO(ro.id, {
      lines: (ro.lines ?? []).map(l => ({ ...l, isTbd: !isAllTbd, updatedAt: new Date().toISOString() })),
    });
  };

  const openConvertDialog = (issue: ReviewIssue) => {
    setConvertingIssue(issue);
    setFlagDialogOpen(true);
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="" fullHeight>
        {!ro ? (
          <EmptyState
            icon={FileText}
            title="No RO selected"
            actions={
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <div className="flex-shrink-0 border-b border-border/60 bg-card px-4 py-3">
              {/* Row 1: RO# + hours + close */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[16px] font-extrabold tabular-nums text-foreground tracking-tight">
                  {ro.roNumber ? `#${ro.roNumber}` : '—'}
                </span>
                <button
                  className="text-muted-foreground/50 hover:text-muted-foreground quiet-transition"
                  onClick={() => copyToClipboard("RO #", ro.roNumber)}
                >
                  <Copy className="h-3 w-3" />
                </button>
                <span className="hours-pill">{maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h</span>
                <div className="flex items-center gap-1 ml-auto">
                  <Button size="sm" className="h-7 px-2.5 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90" onClick={onEdit}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <ROActionMenu
                    roNumber={ro.roNumber}
                    onEdit={onEdit}
                    onDelete={() => setShowDeleteConfirm(true)}
                    onFlag={openFlagDialog}
                    onTbdAll={ro.lines?.length ? handleTbdAll : undefined}
                    isAllTbd={isAllTbd}
                    className="h-7 w-7 p-0"
                  />
                  <button
                    onClick={onClose}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Row 2: Labor type + date + advisor + status */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusPill type={ro.laborType} size="sm" />
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDateShort(ro.date)}
                </span>
                <span className="text-[11px] text-muted-foreground">· {ro.advisor}</span>
                {showPaidDate ? (
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">Paid {formatDateShort(ro.paidDate!)}</span>
                ) : ro.paidDate ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'hsl(var(--status-warranty))', background: 'hsl(var(--status-warranty-bg))' }}>Paid</span>
                ) : null}
                {flags.length > 0 && (
                  <FlagBadge flags={flags} onClear={(flagId) => clearFlag(flagId)} />
                )}
                {issues.length > 0 && (
                  <span className="text-[10px] font-bold text-destructive flex items-center gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {issues.length} check{issues.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <SectionCard title="Details">
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">RO date</p>
                    <p className="font-medium">{formatDateLong(ro.date)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Paid date</p>
                    <p className="font-medium">{ro.paidDate ? formatDateLong(ro.paidDate) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Advisor</p>
                    <p className="font-medium">{ro.advisor}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Customer</p>
                    <p className="font-medium">{ro.customerName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Mileage</p>
                    <p className="font-medium">{ro.mileage || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Labor type</p>
                    <p className="font-medium capitalize">{ro.laborType === 'customer-pay' ? 'Customer Pay' : ro.laborType}</p>
                  </div>
                </div>
              </SectionCard>

              {(ro.vehicle?.year || ro.vehicle?.make || ro.vehicle?.model || ro.vehicle?.trim || ro.vehicle?.vin) && (
                <SectionCard
                  title="Vehicle"
                  rightSlot={
                    ro.vehicle?.vin ? (
                      <button
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        onClick={() => copyToClipboard("VIN", ro.vehicle?.vin || "")}
                      >
                        <Copy className="h-3 w-3" />
                        Copy VIN
                      </button>
                    ) : null
                  }
                >
                  <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Vehicle</p>
                      <p className="font-medium">{vehicleLabel(ro)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Trim</p>
                      <p className="font-medium">{ro.vehicle?.trim || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">VIN</p>
                      <p className="font-medium">{ro.vehicle?.vin || "—"}</p>
                    </div>
                  </div>
                </SectionCard>
              )}

              <SectionCard
                title="Lines"
                rightSlot={
                  ro.lines?.length ? (
                    <button
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                      onClick={() =>
                        copyToClipboard("Lines", ro.lines.map((l) => l.description).filter(Boolean).join("\n"))
                      }
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  ) : null
                }
              >
                {ro.lines?.length ? (
                  <div className="space-y-0">
                    <div className="grid grid-cols-[2.5rem_1fr_3.5rem] text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">
                      <span>Line</span>
                      <span>Description</span>
                      <span className="text-right">Hours</span>
                    </div>

                    <div className="divide-y divide-border/50">
                      {ro.lines.map((l) => (
                        <div key={l.id} className="grid grid-cols-[2.5rem_1fr_3.5rem] py-1.5 items-start text-sm">
                          <span className="text-[11px] font-bold text-muted-foreground">L{l.lineNo}</span>
                          <div className="min-w-0">
                            {(() => {
                              const description = l.description || "—";
                              const isExpanded = !!expandedLineIds[l.id];
                              const canExpand = description.length > 110 || description.includes("\n");

                              return (
                                <>
                                  <p
                                    className={cn(
                                      "font-medium whitespace-pre-wrap break-words",
                                      !isExpanded && canExpand && "line-clamp-2",
                                    )}
                                  >
                                    {description}
                                  </p>
                                  {canExpand && (
                                    <button
                                      type="button"
                                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                      onClick={() =>
                                        setExpandedLineIds((prev) => ({ ...prev, [l.id]: !prev[l.id] }))
                                      }
                                      aria-expanded={isExpanded}
                                      aria-label={`${isExpanded ? "Collapse" : "Expand"} description for line ${l.lineNo}`}
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="h-3 w-3" />
                                          Show less
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3" />
                                          Show more
                                        </>
                                      )}
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                            <div className="flex items-center gap-1 mt-0.5">
                              <StatusPill type={l.laborType} size="sm" />
                              {l.isTbd ? <Badge variant="outline" className="text-[9px]">TBD</Badge> : null}
                            </div>
                          </div>
                          <span className="text-right font-bold text-primary tabular-nums">
                            {maskHours(Number(l.hoursPaid.toFixed(1)), userSettings.hideTotals ?? false)}h
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-[2.5rem_1fr_3.5rem] pt-1.5 border-t border-border text-sm font-bold">
                      <span />
                      <span>Total (paid)</span>
                      <span className="text-right text-primary tabular-nums">
                        {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
                      </span>
                    </div>
                  </div>
                ) : ro.workPerformed ? (
                  <p className="text-sm whitespace-pre-wrap">{ro.workPerformed}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </SectionCard>

              {issues.length ? (
                <SectionCard title="Checks">
                  <ChecksPanel
                    issues={issues}
                    onConvert={openConvertDialog}
                    onGoToDuplicateRO={onSelectRO ? (roId) => {
                      const dupRO = ros.find((r) => r.id === roId);
                      if (dupRO) { onClose(); onSelectRO(dupRO); }
                    } : undefined}
                  />
                </SectionCard>
              ) : null}

              {ro.notes ? (
                <SectionCard title="Notes">
                  <p className="text-sm whitespace-pre-wrap">{ro.notes}</p>
                </SectionCard>
              ) : null}
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-border/60 bg-card flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 text-sm gap-1.5"
                onClick={openFlagDialog}
              >
                <Flag className="h-4 w-4" />
                Add Flag
              </Button>
              {ro.lines?.length ? (
                <Button
                  variant="outline"
                  className="flex-1 h-11 text-sm gap-1.5"
                  onClick={handleTbdAll}
                >
                  <Clock className={cn('h-4 w-4', isAllTbd ? 'text-amber-500' : 'text-muted-foreground')} />
                  {isAllTbd ? 'Clear TBD' : 'TBD All'}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="h-11 px-3 text-sm gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete RO #{ro?.roNumber}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the repair order and all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1 h-9" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1 h-9" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddFlagDialog
        open={flagDialogOpen}
        onClose={() => {
          setFlagDialogOpen(false);
          setConvertingIssue(null);
        }}
        defaultNote={convertingIssue?.detail}
        title={convertingIssue ? `Convert check → flag` : ro ? `Flag RO #${ro.roNumber}` : "Add Flag"}
        onSubmit={(flagType, note) => {
          if (!ro) return;
          const finalNote = note?.trim() || convertingIssue?.detail || undefined;
          addFlag(ro.id, flagType, finalNote, convertingIssue?.lineId || undefined);
          setFlagDialogOpen(false);
          setConvertingIssue(null);
        }}
      />
    </>
  );
}
