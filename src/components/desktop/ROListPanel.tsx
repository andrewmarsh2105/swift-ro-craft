import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Plus, Search, ClipboardCheck, AlertTriangle, Flag, Clock, CalendarRange, CheckCircle2, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useRO } from "@/contexts/ROContext";
import { useFlagContext } from "@/contexts/FlagContext";

import { ROActionMenu } from "@/components/shared/ROActionMenu";
import { AddFlagDialog } from "@/components/flags/AddFlagDialog";

import { maskHours } from "@/lib/maskHours";
import { cn } from "@/lib/utils";
import { calcHours, effectiveDate, formatDateShort, vehicleLabel } from "@/lib/roDisplay";
import { compareAdvisorNames, normalizeAdvisorName, compareRONumbers, matchesSearchQuery } from "@/lib/roFilters";
import { getStatusSummary } from "@/lib/roStatus";
import { computeDateRangeBounds, filterROsByDateRange, boundsRangeLabel, type DateFilterKey } from "@/lib/dateRangeFilter";
import { useSharedDateRange } from "@/hooks/useSharedDateRange";
import { CustomDateRangeDialog } from "@/components/shared/CustomDateRangeDialog";

import type { RepairOrder, LaborType } from "@/types/ro";
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

/* ── Sort header button ─────────────────────────── */
function SortHeader({
  label, active, dir, onClick, align,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const Arrow = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 section-title hover:text-foreground quiet-transition",
        active ? "text-foreground" : "text-muted-foreground",
        align === "right" && "ml-auto",
      )}
    >
      {label}
      {active && <Arrow className="h-2.5 w-2.5 text-primary" />}
    </button>
  );
}

/* ── Labor type left-border color ──────────────── */
const laborBorderColor = (type: LaborType) =>
  type === "warranty"
    ? "hsl(var(--status-warranty))"
    : type === "customer-pay"
      ? "hsl(var(--status-customer-pay))"
      : "hsl(var(--status-internal))";

/* ── Compact status indicators ─────────────────── */
function RowStatusChips({
  ro, flagsCount, checksCount,
}: { ro: RepairOrder; flagsCount: number; checksCount: number }) {
  const status = getStatusSummary(ro, flagsCount, checksCount);
  const hasNotes = !!(ro.notes && ro.notes.trim());

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {status.paid === "Paid" ? (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none" style={{ color: "hsl(var(--status-warranty))" }}>
          <CheckCircle2 className="h-3 w-3" />
          <span>Paid</span>
        </span>
      ) : (
        <span className="text-[9px] font-semibold text-muted-foreground leading-none bg-muted/50 px-1.5 py-0.5 rounded">
          {status.paid}
        </span>
      )}
      {status.tbd > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-muted-foreground leading-none">
          <Clock className="h-2.5 w-2.5" />
          {status.tbd}
        </span>
      )}
      {status.flags > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none" style={{ color: "hsl(var(--status-internal))" }}>
          <Flag className="h-2.5 w-2.5" />
          {status.flags}
        </span>
      )}
      {status.checks > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive leading-none">
          <AlertTriangle className="h-2.5 w-2.5" />
          {status.checks}
        </span>
      )}
      {hasNotes && (
        <span className="inline-flex items-center text-[9px] text-muted-foreground/50 leading-none" title="Has notes">
          <StickyNote className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

/* ── Date filter chip row ──────────────────────── */
function DateChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-6 px-2.5 text-[10px] font-semibold rounded-full border flex-shrink-0 quiet-transition",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border/60 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/* ── Main Component ─────────────────────────────── */

export const ROListPanel = memo(function ROListPanel({
  selectedROId,
  onSelectRO,
  onAddNew,
  onFilteredROsChange,
  compact = false,
}: ROListPanelProps) {
  const { ros, deleteRO, loadingROs } = useRO();
  const { flags, userSettings, addFlag } = useFlagContext();

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const {
    dateFilter, setFilter: setDateFilter,
    customStart, customEnd, applyCustom, cancelCustom,
    showCustomDialog, requestCustomDialog,
  } = useSharedDateRange("week", "desktop-list");

  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(80);

  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);

  const hasCustomPayPeriod =
    userSettings.payPeriodType === "custom" &&
    Array.isArray(userSettings.payPeriodEndDates) &&
    userSettings.payPeriodEndDates.length > 0;

  const listBounds = useMemo(() => computeDateRangeBounds({
    filter: dateFilter,
    weekStartDay: userSettings.weekStartDay ?? 0,
    defaultSummaryRange: userSettings.defaultSummaryRange,
    payPeriodEndDates: userSettings.payPeriodEndDates as number[] | undefined,
    hasCustomPayPeriod,
    customStart,
    customEnd,
  }), [dateFilter, userSettings.weekStartDay, userSettings.defaultSummaryRange, userSettings.payPeriodEndDates, hasCustomPayPeriod, customStart, customEnd]);

  const advisors = useMemo(() => {
    const rangeROs = filterROsByDateRange(ros, listBounds);
    const firstSeenByKey = new Map<string, string>();
    rangeROs.forEach((ro) => {
      const normalized = normalizeAdvisorName(ro.advisor);
      if (!normalized || firstSeenByKey.has(normalized)) return;
      firstSeenByKey.set(normalized, ro.advisor.trim());
    });
    return Array.from(firstSeenByKey.values()).sort(compareAdvisorNames);
  }, [ros, listBounds]);

  useEffect(() => {
    if (advisorFilter !== "all" && !advisors.includes(advisorFilter)) {
      setAdvisorFilter("all");
    }
  }, [advisors, advisorFilter]);

  const filteredROs = useMemo(() => {
    let result = ros;

    if (advisorFilter !== "all") {
      const selectedAdvisor = normalizeAdvisorName(advisorFilter);
      result = result.filter((ro) => normalizeAdvisorName(ro.advisor) === selectedAdvisor);
    }

    const q = deferredQuery.trim();
    if (q) {
      result = result.filter((ro) => matchesSearchQuery(ro, q));
    }

    result = filterROsByDateRange(result, listBounds);

    const dir = sortDir === "asc" ? 1 : -1;

    return [...result].sort((a, b) => {
      if (sortKey === "date") {
        const byDate = effectiveDate(a).localeCompare(effectiveDate(b)) * dir;
        if (byDate !== 0) return byDate;
        return compareRONumbers(a.roNumber, b.roNumber) * dir;
      }
      if (sortKey === "ro") return compareRONumbers(a.roNumber, b.roNumber) * dir;
      if (sortKey === "advisor") {
        const byAdvisor = compareAdvisorNames(a.advisor, b.advisor) * dir;
        if (byAdvisor !== 0) return byAdvisor;
        return compareRONumbers(a.roNumber, b.roNumber) * dir;
      }
      if (sortKey === "hours") {
        const byHours = (calcHours(a) - calcHours(b)) * dir;
        if (byHours !== 0) return byHours;
        return compareRONumbers(a.roNumber, b.roNumber) * dir;
      }
      return 0;
    });
  }, [ros, advisorFilter, deferredQuery, listBounds, sortKey, sortDir]);

  const existingRONumbers = useMemo(() => ros.map((r) => r.roNumber), [ros]);

  const flagCountByRO = useMemo(() => {
    const map = new Map<string, number>();
    for (const flag of flags) {
      if (flag.roLineId) continue;
      map.set(flag.roId, (map.get(flag.roId) ?? 0) + 1);
    }
    return map;
  }, [flags]);

  const reviewIssueCountByRO = useMemo(() => {
    const roNumberCounts = new Map<string, number>();
    for (const ro of ros) {
      if (!ro.roNumber) continue;
      roNumberCounts.set(ro.roNumber, (roNumberCounts.get(ro.roNumber) ?? 0) + 1);
    }
    const map = new Map<string, number>();
    for (const ro of ros) {
      const count = ro.roNumber ? (roNumberCounts.get(ro.roNumber) ?? 0) : 0;
      map.set(ro.id, count > 1 ? getReviewIssues(ro, ros).length : 0);
    }
    return map;
  }, [ros]);

  useEffect(() => {
    onFilteredROsChange?.(filteredROs);
  }, [filteredROs, onFilteredROsChange]);

  useEffect(() => {
    setVisibleCount(80);
  }, [deferredQuery, dateFilter, advisorFilter, sortKey, sortDir]);

  const visible = useMemo(() => filteredROs.slice(0, visibleCount), [filteredROs, visibleCount]);
  const rangeChipLabel = useMemo(() => boundsRangeLabel(listBounds), [listBounds]);

  const totals = useMemo(() => {
    const totalHours = filteredROs.reduce((sum, ro) => sum + calcHours(ro), 0);
    return { totalHours, totalAll: filteredROs.length };
  }, [filteredROs]);

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

  const dateOptions = [
    { value: "all" as const, label: "All" },
    { value: "today" as const, label: "Today" },
    { value: "week" as const, label: userSettings.defaultSummaryRange === "two_weeks" ? "2 Wk" : "Week" },
    { value: "last_week" as const, label: "Last Wk" },
    { value: "month" as const, label: "Month" },
    ...(hasCustomPayPeriod ? [{ value: "pay_period" as const, label: "Pay Period" }] : []),
    { value: "custom" as const, label: "Custom" },
  ];

  /* Grid columns: Type-dot | Date | RO# | Info | Hrs | Status | Actions */
  const gridCols = compact
    ? "grid-cols-[3px_58px_72px_1fr_48px_100px_24px]"
    : "grid-cols-[4px_66px_84px_1fr_60px_130px_28px]";

  return (
    <>
      <div className="flex flex-col h-full bg-card">

        {/* ── Panel header ─────────────────────────── */}
        <div className="flex-shrink-0 border-b border-border/60">

          {/* Top: title + Add button */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 gap-2">
            <div className="min-w-0">
              <h2 className="page-title text-foreground truncate">{userSettings.shopName || 'Repair Orders'}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[13px] font-extrabold tabular-nums text-primary leading-none">
                  {maskHours(Number(totals.totalHours.toFixed(1)), userSettings.hideTotals ?? false)}h
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  · {totals.totalAll} RO{totals.totalAll !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onAddNew}
              className="h-8 text-[11px] gap-1 rounded-lg px-3 bg-primary text-white hover:bg-primary/90 flex-shrink-0"
              style={{ boxShadow: 'var(--shadow-soft)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add RO
            </Button>
          </div>

          {/* Search bar */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, RO#, VIN, lines, notes…"
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              />
            </div>
          </div>

          {/* Date + advisor filters — compact inline row */}
          <div className="px-3 pb-2.5 flex items-center gap-2 min-w-0">
            {/* Date chips */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              {dateOptions.map(({ value, label }) => (
                <DateChip
                  key={value}
                  label={label}
                  active={dateFilter === value}
                  onClick={() => value === "custom" ? requestCustomDialog() : setDateFilter(value as DateFilterKey)}
                />
              ))}
              <span
                className={cn(
                  "flex-shrink-0 flex items-center gap-0.5 text-[9px] font-medium text-muted-foreground whitespace-nowrap ml-1",
                  dateFilter === "custom" && "cursor-pointer hover:text-foreground",
                )}
                onClick={() => { if (dateFilter === "custom") requestCustomDialog(); }}
              >
                <CalendarRange className="h-2.5 w-2.5" />
                {rangeChipLabel}
              </span>
            </div>

            {/* Advisor filter — minimal select */}
            {advisors.length > 0 && (
              <select
                value={advisorFilter}
                onChange={(e) => setAdvisorFilter(e.target.value)}
                className="h-6 flex-shrink-0 rounded border border-border/60 bg-transparent text-[10px] text-muted-foreground px-1.5 pr-5 focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer max-w-[110px] truncate"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2.5\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
              >
                <option value="all">All advisors</option>
                {advisors.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ── List ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loadingROs ? (
            <div className="divide-y divide-border/30">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                <ClipboardCheck className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-foreground/70">No repair orders found</p>
              <p className="meta-text mt-1">Try a different search, date, or advisor.</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div
                className={cn(
                  "grid gap-x-2 items-center px-3 py-2 sticky top-0 z-10 border-b border-border/50 bg-muted/30 backdrop-blur-sm",
                  gridCols,
                )}
              >
                {/* Type dot col — no header */}
                <div />
                <SortHeader label="Date" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} />
                <SortHeader label="RO #" active={sortKey === "ro"} dir={sortDir} onClick={() => toggleSort("ro")} />
                <button
                  onClick={() => toggleSort("advisor")}
                  className={cn(
                    "inline-flex items-center gap-0.5 section-title hover:text-foreground quiet-transition",
                    sortKey === "advisor" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  Info
                  {sortKey === "advisor" && (
                    sortDir === "asc"
                      ? <ArrowUp className="h-2.5 w-2.5 text-primary" />
                      : <ArrowDown className="h-2.5 w-2.5 text-primary" />
                  )}
                </button>
                <SortHeader label="Hrs" active={sortKey === "hours"} dir={sortDir} onClick={() => toggleSort("hours")} align="right" />
                <span className="section-title">Status</span>
                <div />
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/30">
                {visible.map((ro) => {
                  const hours = calcHours(ro);
                  const flagsCount = flagCountByRO.get(ro.id) ?? 0;
                  const issuesCount = reviewIssueCountByRO.get(ro.id) ?? 0;
                  const selected = selectedROId === ro.id;
                  const accentColor = laborBorderColor(ro.laborType);

                  const workSummary = ro.lines?.length
                    ? ro.lines.map((l) => l.description).filter(Boolean).slice(0, 2).join(", ")
                    : ro.workPerformed || "—";

                  return (
                    <div
                      key={ro.id}
                      className={cn(
                        "grid gap-x-2 items-start px-3 cursor-pointer text-xs quiet-transition group",
                        compact ? "py-1.5" : "py-2",
                        gridCols,
                        selected
                          ? "bg-primary/[0.07] border-l-2 border-l-primary"
                          : "hover:bg-muted/40",
                      )}
                      style={selected ? {} : { borderLeft: `2px solid ${accentColor}` }}
                      onClick={() => onSelectRO(ro)}
                      role="row"
                    >
                      {/* Labor type accent strip */}
                      <div
                        className="self-stretch rounded-sm"
                        style={{ background: accentColor, width: '3px', minHeight: '20px' }}
                        role="cell"
                        aria-hidden
                      />

                      {/* Date */}
                      <div className="text-[11px] tabular-nums text-muted-foreground whitespace-nowrap leading-snug pt-0.5" role="cell">
                        {formatDateShort(effectiveDate(ro))}
                      </div>

                      {/* RO # */}
                      <div className="font-extrabold tabular-nums text-foreground leading-snug pt-0.5 text-[12px]" role="cell">
                        #{ro.roNumber}
                      </div>

                      {/* Info: two-line — customer first when available */}
                      <div className="min-w-0" role="cell">
                        <p className="text-[11px] font-semibold truncate text-foreground leading-snug">
                          {ro.customerName ? (
                            <>
                              {ro.customerName}
                              <span className="font-normal text-muted-foreground"> · {ro.advisor}</span>
                            </>
                          ) : (
                            ro.advisor
                          )}
                          {vehicleLabel(ro) !== "—" && (
                            <span className="font-normal text-muted-foreground"> · {vehicleLabel(ro)}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/75 truncate leading-snug">{workSummary}</p>
                      </div>

                      {/* Hours */}
                      <div className="text-right font-extrabold tabular-nums text-foreground text-[12px] leading-snug pt-0.5 whitespace-nowrap" role="cell">
                        {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
                      </div>

                      {/* Status */}
                      <div className="pt-0.5" role="cell">
                        <RowStatusChips ro={ro} flagsCount={flagsCount} checksCount={issuesCount} />
                      </div>

                      {/* Action menu */}
                      <div onClick={(e) => e.stopPropagation()} role="cell">
                        <ROActionMenu
                          roNumber={ro.roNumber}
                          onEdit={() => onSelectRO(ro)}
                          onDelete={() => deleteRO(ro.id)}
                          onFlag={() => setFlaggingRO(ro)}
                          existingRONumbers={existingRONumbers}
                          className="-mr-1 opacity-0 group-hover:opacity-100 quiet-transition"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {!loadingROs && filteredROs.length > visibleCount && (
                <div className="px-3 py-3 text-center border-t border-border/40">
                  <button
                    onClick={() => setVisibleCount((c) => c + 80)}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80 quiet-transition"
                  >
                    Load more ({filteredROs.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────────────── */}
        <div className="flex-shrink-0 px-3 py-2 border-t border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {filteredROs.length} RO{filteredROs.length !== 1 ? 's' : ''}
              {filteredROs.length > visibleCount ? ` · showing ${visible.length}` : ''}
            </span>
            <span className="text-[11px] font-bold tabular-nums text-foreground">
              {maskHours(Number(totals.totalHours.toFixed(1)), userSettings.hideTotals ?? false)}h
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
