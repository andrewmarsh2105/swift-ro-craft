import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flag,
  Copy,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { BottomSheet } from "@/components/mobile/BottomSheet";
import { StatusPill } from "@/components/mobile/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onDuplicate: (newRONumber: string) => void;
  onDelete: () => void;
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

function ChecksPanel(props: { issues: ReviewIssue[]; onConvert: (issue: ReviewIssue) => void }) {
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
                <button
                  onClick={() => props.onConvert(i)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  <Flag className="h-3 w-3 inline mr-1" />
                  Convert to flag
                </button>
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
  onDuplicate,
  onDelete,
  existingRONumbers = [],
}: RODetailSheetProps) {
  const { ros } = useRO();
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [dupRONumber, setDupRONumber] = useState("");
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [convertingIssue, setConvertingIssue] = useState<ReviewIssue | null>(null);
  const [expandedLineIds, setExpandedLineIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!showDuplicateDialog) return;
    setDupRONumber("");
    setDupWarning(null);
  }, [showDuplicateDialog]);

  useEffect(() => {
    setExpandedLineIds({});
  }, [ro?.id, isOpen]);

  const flags = useMemo(() => (ro ? getFlagsForRO(ro.id) : []), [getFlagsForRO, ro]);
  const issues = useMemo(() => (ro ? getReviewIssues(ro, ros) : []), [ro, ros]);
  const hours = useMemo(() => (ro ? calcHours(ro) : 0), [ro]);

  const showPaidDate = !!ro?.paidDate && ro?.paidDate !== ro?.date;

  const handleDuplicateConfirm = (force: boolean) => {
    const trimmed = dupRONumber.trim();
    if (!trimmed) return;

    if (!force && existingRONumbers.includes(trimmed)) {
      setDupWarning(`RO #${trimmed} already exists.`);
      return;
    }

    setShowDuplicateDialog(false);
    onDuplicate(trimmed);
    onClose();
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onClose();
  };

  const openFlagDialog = () => {
    setConvertingIssue(null);
    setFlagDialogOpen(true);
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
            <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-base font-bold tracking-tight">
                        {ro.roNumber ? `RO #${ro.roNumber}` : 'RO (no number)'}
                      </span>
                      <button
                        className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        onClick={() => copyToClipboard("RO #", ro.roNumber)}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateShort(ro.date)}
                    </span>
                    {showPaidDate ? (
                      <Badge variant="outline" className="text-[10px]">Paid: {formatDateShort(ro.paidDate!)}</Badge>
                    ) : ro.paidDate ? (
                      <Badge variant="secondary" className="text-[10px]">Paid</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Unpaid</Badge>
                    )}
                    <span>{ro.advisor}</span>
                    <StatusPill type={ro.laborType} size="sm" />
                  </div>
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  <div className="hours-pill text-base font-bold text-primary">
                    {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={openFlagDialog}>
                      <Flag className="h-3 w-3 mr-1" />
                      Flag
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowDuplicateDialog(true)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Duplicate
                    </Button>
                  </div>
                </div>
              </div>

              {(flags.length > 0 || issues.length > 0) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {flags.length > 0 && (
                    <FlagBadge flags={flags} onClear={(flagId) => clearFlag(flagId)} />
                  )}
                  {issues.length > 0 && (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {issues.length} check{issues.length === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              )}
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
                  <ChecksPanel issues={issues} onConvert={openConvertDialog} />
                </SectionCard>
              ) : null}

              {ro.notes ? (
                <SectionCard title="Notes">
                  <p className="text-sm whitespace-pre-wrap">{ro.notes}</p>
                </SectionCard>
              ) : null}
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card safe-area-bottom">
              <div className="flex gap-2">
                <Button className="flex-1 h-12 text-sm bg-primary text-primary-foreground hover:bg-primary/90" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                <Button variant="destructive" className="flex-1 h-12 text-sm" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </div>
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

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Duplicate RO #{ro?.roNumber}</DialogTitle>
            <DialogDescription>Enter a new RO number for the duplicate.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              value={dupRONumber}
              onChange={(e) => {
                setDupRONumber(e.target.value);
                setDupWarning(null);
              }}
              placeholder="New RO #"
              className="h-9"
              inputMode="numeric"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && dupRONumber.trim()) handleDuplicateConfirm(false);
              }}
            />

            {dupWarning ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">{dupWarning}</p>
                    <button
                      className="text-xs text-primary underline mt-1"
                      onClick={() => handleDuplicateConfirm(true)}
                    >
                      Continue anyway
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1 h-9" onClick={() => setShowDuplicateDialog(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-9" disabled={!dupRONumber.trim()} onClick={() => handleDuplicateConfirm(false)}>
              Duplicate
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
