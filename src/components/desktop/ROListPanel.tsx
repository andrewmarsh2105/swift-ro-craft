import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Plus, Search, ClipboardCheck, AlertTriangle, Flag, Clock, CalendarRange } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { useRO } from "@/contexts/ROContext";
import { useFlagContext } from "@/contexts/FlagContext";

import { ROActionMenu } from "@/components/shared/ROActionMenu";
import { AddFlagDialog } from "@/components/flags/AddFlagDialog";

import { maskHours } from "@/lib/maskHours";
import { cn } from "@/lib/utils";
import { calcHours, effectiveDate, formatDateShort, vehicleLabel } from "@/lib/roDisplay";
import { getStatusSummary } from "@/lib/roStatus";
import { computeDateRangeBounds, filterROsByDateRange, boundsRangeLabel, type DateFilterKey } from "@/lib/dateRangeFilter";
import { useSharedDateRange } from "@/hooks/useSharedDateRange";
import { CustomDateRangeDialog } from "@/components/shared/CustomDateRangeDialog";

import type { RepairOrder } from "@/types/ro";
import type { FlagType } from "@/types/flags";
import type { ReviewIssue } from "@/lib/reviewRules";
import { getReviewIssues } from "@/lib/reviewRules";

interface ROListPanelProps {
  selectedROId: string | null;
  onSelectRO: (ro: RepairOrder) => void;
  onAddNew: () => void;
  onFilteredROsChange?: (ros: RepairOrder[]) => void;
  compact?: boolean;
}

type SortKey = "date" | "ro" | "advisor" | "hours";
type SortDir = "asc" | "desc";


function SortHeader(props: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const Arrow = props.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={props.onClick}
      className={cn(
        "inline-flex items-center gap-1 section-title hover:text-foreground quiet-transition",
        props.active ? "text-foreground" : "text-muted-foreground",
        props.align === "right" && "ml-auto",
      )}
    >
      {props.label}
      {props.active && <Arrow className="icon-row text-primary" />}
    </button>
  );
}

/* ── Status Chips ─────────────────────────────────── */

function StatusChips({ ro, flagsCount, checksCount }: { ro: RepairOrder; flagsCount: number; checksCount: number }) {
  const status = getStatusSummary(ro, flagsCount, checksCount);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
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
          {status.flags}
        </Badge>
      )}
      {status.checks > 0 && (
        <Badge variant="secondary" className="text-[9px] px-2 py-0.5 gap-1 font-semibold rounded-full text-[hsl(var(--destructive))]">
          <AlertTriangle className="h-2.5 w-2.5" />
          {status.checks}
        </Badge>
      )}
    </div>
  );
}

export const ROListPanel = memo(function ROListPanel({
  selectedROId,
  onSelectRO,
  onAddNew,
  onFilteredROsChange,
  compact = false,
}: ROListPanelProps) {
  const { ros, deleteRO, duplicateRO, loadingROs } = useRO();
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const { dateFilter, setFilter: setDateFilter, customStart, customEnd, applyCustom, cancelCustom, showCustomDialog, requestCustomDialog } = useSharedDateRange("week", "desktop-list");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(80);

  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);

  const hasCustomPayPeriod =
    userSettings.payPeriodType === "custom" &&
    Array.isArray(userSettings.payPeriodEndDates) &&
    userSettings.payPeriodEndDates.length > 0;

  // Date range bounds for the current filter (used both for the advisor dropdown and filteredROs)
  const listBounds = useMemo(() => computeDateRangeBounds({
    filter: dateFilter,
    weekStartDay: userSettings.weekStartDay ?? 0,
    defaultSummaryRange: userSettings.defaultSummaryRange,
    payPeriodEndDates: userSettings.payPeriodEndDates as number[] | undefined,
    hasCustomPayPeriod,
    customStart,
    customEnd,
  }), [dateFilter, userSettings.weekStartDay, userSettings.defaultSummaryRange, userSettings.payPeriodEndDates, hasCustomPayPeriod, customStart, customEnd]);

  // Advisor dropdown options: only advisors who have ROs in the current date range
  const advisors = useMemo(() => {
    const rangeROs = filterROsByDateRange(ros, listBounds);
    return Array.from(new Set(rangeROs.map((r) => r.advisor).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [ros, listBounds]);

  // If the selected advisor isn't in the current range, reset to "all"
  useEffect(() => {
    if (advisorFilter !== "all" && !advisors.includes(advisorFilter)) {
      setAdvisorFilter("all");
    }
  }, [advisors, advisorFilter]);

  const filteredROs = useMemo(() => {
    let result = ros;

    if (advisorFilter !== "all") {
      result = result.filter((ro) => ro.advisor === advisorFilter);
    }

    const q = deferredQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((ro) => {
        const v = vehicleLabel(ro).toLowerCase();
        const work = (ro.workPerformed || "").toLowerCase();
        const customer = (ro.customerName || "").toLowerCase();
        const lineText = ro.lines?.length
          ? ro.lines.map((l) => l.description).filter(Boolean).join(" ").toLowerCase()
          : "";
        return (
          ro.roNumber.toLowerCase().includes(q) ||
          ro.advisor.toLowerCase().includes(q) ||
          v.includes(q) ||
          customer.includes(q) ||
          work.includes(q) ||
          lineText.includes(q)
        );
      });
    }

    result = filterROsByDateRange(result, listBounds);

    const dir = sortDir === "asc" ? 1 : -1;

    const sorted = [...result].sort((a, b) => {
      if (sortKey === "date") return effectiveDate(a).localeCompare(effectiveDate(b)) * dir;
      if (sortKey === "ro") return a.roNumber.localeCompare(b.roNumber) * dir;
      if (sortKey === "advisor") return a.advisor.localeCompare(b.advisor) * dir;
      if (sortKey === "hours") return (calcHours(a) - calcHours(b)) * dir;
      return 0;
    });

    return sorted;
  }, [ros, advisorFilter, deferredQuery, listBounds, sortKey, sortDir]);

  useEffect(() => {
    onFilteredROsChange?.(filteredROs);
  }, [filteredROs, onFilteredROsChange]);

  useEffect(() => {
    setVisibleCount(80);
  }, [deferredQuery, dateFilter, advisorFilter, sortKey, sortDir]);

  const visible = useMemo(() => filteredROs.slice(0, visibleCount), [filteredROs, visibleCount]);

  const rangeBounds = useMemo(() => computeDateRangeBounds({
    filter: dateFilter,
    weekStartDay: userSettings.weekStartDay ?? 0,
    defaultSummaryRange: userSettings.defaultSummaryRange,
    payPeriodEndDates: userSettings.payPeriodEndDates as number[] | undefined,
    hasCustomPayPeriod,
    customStart,
    customEnd,
  }), [dateFilter, userSettings.weekStartDay, userSettings.defaultSummaryRange, userSettings.payPeriodEndDates, hasCustomPayPeriod, customStart, customEnd]);

  const rangeChipLabel = useMemo(() => boundsRangeLabel(rangeBounds), [rangeBounds]);

  const totals = useMemo(() => {
    const totalHours = filteredROs.reduce((sum, ro) => sum + calcHours(ro), 0);
    return { totalHours, totalAll: filteredROs.length, totalVisible: visible.length };
  }, [filteredROs, visible.length]);

  const toggleSort = useCallback((nextKey: SortKey) => {
    setSortKey((current) => {
      if (current !== nextKey) {
        setSortDir("desc");
        return nextKey;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return current;
    });
  }, []);

  /* Two-line row grid: Date | RO# | Info (advisor · vehicle + work) | Hours | Status | Actions */
  const gridCols = compact
    ? "grid-cols-[64px_80px_1fr_56px_130px_36px]"
    : "grid-cols-[68px_88px_1fr_64px_160px_36px]";

  return (
    <>
      <div className="flex flex-col h-full border-r border-border bg-card">
        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2.5 border-b border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="page-title">{userSettings.shopName || 'Repair Orders'}</h2>
              <div className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-2 py-1">
                <span className="text-lg font-bold tabular-nums text-primary leading-none">
                  {maskHours(Number(totals.totalHours.toFixed(1)), userSettings.hideTotals ?? false)}h
                </span>
                <span className="text-xs font-medium text-muted-foreground">{totals.totalAll} total</span>
                <Badge
                  variant="outline"
                  className={cn("gap-1 h-5 text-[10px] px-1.5", dateFilter === "custom" && "cursor-pointer hover:bg-background")}
                  onClick={() => { if (dateFilter === "custom") requestCustomDialog(); }}
                >
                  <CalendarRange className="h-3 w-3" />
                  {rangeChipLabel}
                </Badge>
              </div>
            </div>
            <Button size="sm" onClick={onAddNew} className="h-8 text-xs gap-1.5 rounded-full">
              <Plus className="icon-row" />
              Add RO
            </Button>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 icon-row text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search RO #, advisor, vehicle, customer, work..."
                className="h-9 pl-9 bg-muted/20"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <label className="section-title mb-0.5 block">Date filter</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilterKey)}
                  className="h-7 w-full rounded-md border border-input bg-muted/20 px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="week">
                    {userSettings.defaultSummaryRange === "two_weeks" ? "2 Weeks" : "1 Week"}
                  </option>
                  <option value="month">This month</option>
                  {hasCustomPayPeriod && <option value="pay_period">Pay period</option>}
                  <option value="custom">Custom…</option>
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="section-title mb-0.5 block">Advisor</label>
                <select
                  value={advisorFilter}
                  onChange={(e) => setAdvisorFilter(e.target.value)}
                  className="h-7 w-full rounded-md border border-input bg-muted/20 px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All advisors</option>
                  {advisors.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {loadingROs ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20 flex-1" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3">
                <ClipboardCheck className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground/70">No repair orders found</p>
              <p className="meta-text mt-1 text-center">Try a different search, date filter, or advisor.</p>
            </div>
          ) : (
            <div>
              {/* Grid header */}
              <div className={cn("grid gap-x-2 items-center px-3 py-2 sticky top-0 z-10 bg-card border-b border-border", gridCols)}>
                <SortHeader label="Date" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} />
                <SortHeader label="RO #" active={sortKey === "ro"} dir={sortDir} onClick={() => toggleSort("ro")} />
                <button
                  onClick={() => toggleSort("advisor")}
                  className={cn(
                    "inline-flex items-center gap-1 section-title hover:text-foreground quiet-transition",
                    sortKey === "advisor" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  Info
                  {sortKey === "advisor" && (
                    sortDir === "asc"
                      ? <ArrowUp className="icon-row text-primary" />
                      : <ArrowDown className="icon-row text-primary" />
                  )}
                </button>
                <SortHeader label="Hrs" active={sortKey === "hours"} dir={sortDir} onClick={() => toggleSort("hours")} align="right" />
                <span className="section-title">Status</span>
                <div />
              </div>

              {/* Rows */}
              <div>
                {visible.map((ro) => {
                  const hours = calcHours(ro);
                  const flags = getFlagsForRO(ro.id);
                  const issues = getReviewIssues(ro, ros);
                  const selected = selectedROId === ro.id;

                  const workSummary = ro.lines?.length
                    ? ro.lines.map((l) => l.description).filter(Boolean).slice(0, 2).join(", ")
                    : ro.workPerformed || "—";

                  return (
                    <div
                      key={ro.id}
                      className={cn(
                        "grid gap-x-2 items-start px-3 py-2.5 cursor-pointer text-xs border-b border-border/50 row-hover quiet-transition",
                        gridCols,
                        selected && "bg-primary/5 border-l-2 border-l-primary",
                      )}
                      onClick={() => onSelectRO(ro)}
                      role="row"
                    >
                      {/* Date */}
                      <div className="meta-text tabular-nums whitespace-nowrap" role="cell">
                        {formatDateShort(effectiveDate(ro))}
                      </div>

                      {/* RO# */}
                      <div className="font-semibold whitespace-nowrap tabular-nums" role="cell">#{ro.roNumber}</div>

                      {/* Info: two-line */}
                      <div className="min-w-0" role="cell">
                        <p className="text-[11px] font-medium truncate">
                          {ro.advisor} · {vehicleLabel(ro)}
                        </p>
                        <p className="meta-text truncate">{workSummary}</p>
                      </div>

                      {/* Hours */}
                      <div className="text-right font-bold tabular-nums whitespace-nowrap" role="cell">
                        {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
                      </div>

                      {/* Status chips */}
                      <div role="cell">
                        <StatusChips ro={ro} flagsCount={flags.length} checksCount={issues.length} />
                      </div>

                      {/* Actions */}
                      <div onClick={(e) => e.stopPropagation()} role="cell">
                        <ROActionMenu
                          roNumber={ro.roNumber}
                          onEdit={() => onSelectRO(ro)}
                          onDuplicate={(newRONumber) => {
                            duplicateRO(ro.id, newRONumber);
                            toast.success(`Duplicated RO #${ro.roNumber} → #${newRONumber}`);
                          }}
                          onDelete={() => deleteRO(ro.id)}
                          onFlag={() => setFlaggingRO(ro)}
                          existingRONumbers={ros.map((r) => r.roNumber)}
                          className="-mr-2"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {!loadingROs && filteredROs.length > visibleCount && (
                <div className="px-3 py-2 text-center border-t border-border">
                  <button
                    onClick={() => setVisibleCount((c) => c + 80)}
                    className="text-sm font-semibold text-primary hover:text-primary/80 quiet-transition"
                  >
                    Load more ({filteredROs.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between meta-text">
            <span className="tabular-nums">
              {filteredROs.length} ROs{filteredROs.length > visibleCount ? ` (showing ${visible.length})` : ""}
            </span>
            <span className="font-semibold tabular-nums">
              {maskHours(Number(totals.totalHours.toFixed(1)), userSettings.hideTotals ?? false)}h total
            </span>
          </div>
        </div>
      </div>

      <AddFlagDialog
        open={!!flaggingRO}
        onClose={() => setFlaggingRO(null)}
        onSubmit={(flagType, note) => {
          if (!flaggingRO) return;
          addFlag(flaggingRO.id, flagType, note);
          setFlaggingRO(null);
        }}
        title={flaggingRO ? `Flag RO #${flaggingRO.roNumber}` : "Add Flag"}
      />

      <CustomDateRangeDialog
        open={showCustomDialog}
        onClose={cancelCustom}
        onApply={applyCustom}
        initialStart={customStart}
        initialEnd={customEnd}
      />
    </>
  );
});
