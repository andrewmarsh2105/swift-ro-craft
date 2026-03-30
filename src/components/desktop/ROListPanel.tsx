import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Plus, Search, ClipboardCheck, AlertTriangle, Flag, CalendarRange, CheckCircle2, LockOpen, Rows3, Rows4, ListFilter, PanelLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useRO } from "@/contexts/ROContext";
import { useFlagContext } from "@/contexts/FlagContext";

import { ROActionMenu } from "@/components/shared/ROActionMenu";
import { AddFlagDialog } from "@/components/flags/AddFlagDialog";

import { maskHours } from "@/lib/maskHours";
import { cn, localDateStr } from "@/lib/utils";
import { calcHours, effectiveDate, formatDateShort, vehicleLabel } from "@/lib/roDisplay";
import { compareAdvisorNames, normalizeAdvisorName, compareRONumbers, matchesSearchQuery } from "@/lib/roFilters";
import { getStatusSummary } from "@/lib/roStatus";
import { computeDateRangeBounds, filterROsByDateRange, filterROsByDateRangeWithCarryover, isCarryoverRO, boundsRangeLabel, type DateFilterKey } from "@/lib/dateRangeFilter";
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
type RowDensity = "normal" | "compact" | "dense";
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

/* ── Labor type abbreviation ────────────────────── */
const laborAbbr = (type: LaborType) =>
  type === "warranty" ? "W" : type === "customer-pay" ? "CP" : "INT";

const laborPillClass = (type: LaborType) =>
  type === "warranty"
    ? "status-pill-warranty"
    : type === "customer-pay"
      ? "status-pill-customer-pay"
      : "status-pill-internal";

/* ── Compact status indicators ─────────────────── */
function RowStatusChips({
  ro, flagsCount, checksCount, isCarryover,
}: { ro: RepairOrder; flagsCount: number; checksCount: number; isCarryover?: boolean }) {
  const status = getStatusSummary(ro, flagsCount, checksCount);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {status.paid === "Paid" ? (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-sm" style={{ color: "hsl(var(--status-warranty))", background: "hsl(var(--status-warranty-bg))" }}>
          <CheckCircle2 className="h-2.5 w-2.5" />
          PAID
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-sm" style={{ color: "hsl(var(--status-internal))", background: "hsl(var(--status-internal-bg))" }}>
          <LockOpen className="h-2.5 w-2.5" />
          OPEN
        </span>
      )}
      {/* Carryover badge — distinct from flags, non-intrusive */}
      {isCarryover && (
        <span
          className="inline-flex items-center text-[8px] font-semibold leading-none px-1.5 py-0.5 rounded-sm uppercase tracking-wide"
          style={{
            color: "hsl(var(--muted-foreground))",
            background: "transparent",
            border: "1px dashed hsl(var(--border))",
          }}
          title="From a prior week — mark paid to include in current totals"
        >
          Carryover
        </span>
      )}
      {status.flags > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold leading-none px-1 py-0.5 rounded-sm" style={{ color: "hsl(var(--status-internal))", background: "hsl(var(--status-internal-bg))" }}>
          <Flag className="h-2.5 w-2.5" />
          {status.flags}
        </span>
      )}
      {status.checks > 0 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive bg-destructive/10 leading-none px-1 py-0.5 rounded-sm">
          <AlertTriangle className="h-2.5 w-2.5" />
          {status.checks}
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
  const { ros, deleteRO, updateRO, loadingROs } = useRO();
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
  const [density, setDensity] = useState<RowDensity>("normal");
  const [laborTypeFilter, setLaborTypeFilter] = useState<string[]>([]);

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

    if (laborTypeFilter.length > 0) {
      result = result.filter((ro) => laborTypeFilter.includes(ro.laborType));
    }

    const q = deferredQuery.trim();
    if (q) {
      result = result.filter((ro) => matchesSearchQuery(ro, q));
    }

    result = filterROsByDateRangeWithCarryover(result, listBounds);

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
  }, [ros, advisorFilter, laborTypeFilter, deferredQuery, listBounds, sortKey, sortDir]);

  const existingRONumbers = useMemo(() => ros.map((r) => r.roNumber), [ros]);

  // Per-RO carryover flag — unpaid and dated before the current viewed period
  const carryoverROIds = useMemo(() => {
    const viewStart = listBounds?.start ?? null;
    const ids = new Set<string>();
    for (const ro of filteredROs) {
      if (isCarryoverRO(ro, viewStart)) ids.add(ro.id);
    }
    return ids;
  }, [filteredROs, listBounds]);

  const flagCountByRO = useMemo(() => {
    const map = new Map<string, number>();
    for (const flag of flags) {
      if (flag.roLineId) continue;
      map.set(flag.roId, (map.get(flag.roId) ?? 0) + 1);
    }
    return map;
  }, [flags]);

  // Build RO# duplicate counts across ALL ros (cheap O(n)) so we know which
  // RO numbers appear more than once. Used to skip the expensive getReviewIssues()
  // call for non-duplicate ROs.
  const roNumberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ro of ros) {
      if (!ro.roNumber) continue;
      counts.set(ro.roNumber, (counts.get(ro.roNumber) ?? 0) + 1);
    }
    return counts;
  }, [ros]);

  useEffect(() => {
    onFilteredROsChange?.(filteredROs);
  }, [filteredROs, onFilteredROsChange]);

  useEffect(() => {
    setVisibleCount(80);
  }, [deferredQuery, dateFilter, advisorFilter, laborTypeFilter, sortKey, sortDir]);

  const visible = useMemo(() => filteredROs.slice(0, visibleCount), [filteredROs, visibleCount]);

  // Only run getReviewIssues() for VISIBLE rows with duplicate RO numbers.
  // Mirrors the same optimization in ROsTab to avoid O(n²) work on large datasets.
  const reviewIssueCountByRO = useMemo(() => {
    const map = new Map<string, number>();
    for (const ro of visible) {
      const count = ro.roNumber ? (roNumberCounts.get(ro.roNumber) ?? 0) : 0;
      map.set(ro.id, count > 1 ? getReviewIssues(ro, ros).length : 0);
    }
    return map;
  }, [visible, roNumberCounts, ros]);
  const rangeChipLabel = useMemo(() => boundsRangeLabel(listBounds), [listBounds]);

  const totals = useMemo(() => {
    const totalHours = filteredROs.filter(ro => !!ro.paidDate).reduce((sum, ro) => sum + calcHours(ro), 0);
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

  /* Grid columns: RO#+Date(stacked) | Info | Hours | Status | Actions */
  const gridCols = (compact || density !== "normal")
    ? "grid-cols-[80px_1fr_52px_auto_24px]"
    : "grid-cols-[90px_1fr_60px_auto_28px]";

  const rowPy = density === "dense" ? "py-1" : density === "compact" ? "py-1.5" : "py-2";

  return (
    <>
      <div className="flex flex-col h-full bg-background">

        {/* ── Panel header ─────────────────────────── */}
        <div className="flex-shrink-0 bg-gradient-to-b from-muted/20 to-background" style={{ borderBottom: '1px solid hsl(var(--border) / 0.45)' }}>

          {/* Top: queue identity + active record + Add button */}
          <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <PanelLeft className="h-3.5 w-3.5 text-primary/80 flex-shrink-0" />
                <p className="text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground/75">
                  Work Queue
                </p>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <h2 className="text-[13px] font-extrabold tracking-tight text-foreground truncate">{userSettings.shopName || 'RO Navigator'}</h2>
                <span className="text-[11px] font-extrabold tabular-nums text-primary leading-none flex-shrink-0">
                  {maskHours(Number(totals.totalHours.toFixed(1)), userSettings.hideTotals ?? false)}h
                </span>
                <span className="text-[9px] text-muted-foreground/60 font-medium flex-shrink-0">
                  · {totals.totalAll}
                </span>
              </div>
              {selectedROId && (
                <p className="text-[10px] text-primary/90 font-semibold truncate mt-0.5">
                  Active RO: #{ros.find((ro) => ro.id === selectedROId)?.roNumber ?? "—"}
                </p>
              )}
            </div>
            {/* Density toggle */}
            <button
              onClick={() => setDensity(d => d === "normal" ? "compact" : d === "compact" ? "dense" : "normal")}
              className={cn(
                "h-5 w-5 flex items-center justify-center rounded quiet-transition flex-shrink-0",
                density !== "normal"
                  ? "text-primary"
                  : "text-muted-foreground/40 hover:text-muted-foreground",
              )}
              title={density === "normal" ? "Switch to compact" : density === "compact" ? "Switch to dense" : "Switch to normal"}
            >
              {density === "dense" ? <Rows3 className="h-3 w-3" /> : <Rows4 className="h-3 w-3" />}
            </button>
            <Button
              size="sm"
              onClick={onAddNew}
              className="h-6 text-[10px] gap-1 rounded px-2 bg-primary text-white hover:bg-primary/90 flex-shrink-0"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>

          {/* Search + queue stats row */}
          <div className="px-3 pb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search RO#, name, VIN, lines…"
                  className="w-full h-6 pl-7 pr-3 rounded border border-border/50 bg-background text-[11px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/50"
                />
              </div>
              <div className="h-6 px-2 rounded border border-border/60 bg-muted/30 inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
                <ListFilter className="h-2.5 w-2.5" />
                {filteredROs.length} shown
              </div>
            </div>
          </div>

          {/* Date + advisor + labor type filters */}
          <div className="px-3 pb-1.5 flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide">
            {/* Date chips */}
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
                "flex-shrink-0 flex items-center gap-0.5 text-[9px] font-medium text-muted-foreground whitespace-nowrap",
                dateFilter === "custom" && "cursor-pointer hover:text-foreground",
              )}
              onClick={() => { if (dateFilter === "custom") requestCustomDialog(); }}
            >
              <CalendarRange className="h-2.5 w-2.5" />
              {rangeChipLabel}
            </span>

            {/* Divider */}
            <span className="w-px h-3.5 bg-border/60 flex-shrink-0" />

            {/* Quick labor type chips */}
            {([
              { type: "warranty", label: "W", color: "hsl(var(--status-warranty))" },
              { type: "customer-pay", label: "CP", color: "hsl(var(--status-customer-pay))" },
              { type: "internal", label: "INT", color: "hsl(var(--status-internal))" },
            ] as const).map(({ type, label, color }) => {
              const active = laborTypeFilter.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => setLaborTypeFilter(prev =>
                    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                  )}
                  className={cn(
                    "h-6 px-2 text-[9px] font-bold rounded-full flex-shrink-0 quiet-transition border",
                    active ? "text-white" : "bg-transparent border-border/60 hover:border-border",
                  )}
                  style={active
                    ? { backgroundColor: color, borderColor: color }
                    : { color }}
                  title={type === "warranty" ? "Warranty" : type === "customer-pay" ? "Customer Pay" : "Internal"}
                >
                  {label}
                </button>
              );
            })}

            {/* Advisor filter — minimal select, pushed right */}
            {advisors.length > 0 && (
              <select
                value={advisorFilter}
                onChange={(e) => setAdvisorFilter(e.target.value)}
                className="h-6 flex-shrink-0 ml-auto rounded border border-border/60 bg-transparent text-[10px] text-muted-foreground px-1.5 pr-5 focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer max-w-[110px] truncate"
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
                  "grid gap-x-2 items-center px-3 py-1.5 sticky top-0 z-10 bg-background/95 backdrop-blur-sm",
                  gridCols,
                )}
                style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                <SortHeader label="RO" active={sortKey === "ro" || sortKey === "date"} dir={sortDir} onClick={() => toggleSort(sortKey === "ro" ? "date" : "ro")} />
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
              <div className="space-y-1.5 py-1">
                {visible.map((ro, index) => {
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
                        "grid gap-x-2 items-center px-3 cursor-pointer text-xs quiet-transition group rounded-md border shadow-[0_1px_0_hsl(var(--foreground)/0.02)]",
                        rowPy,
                        gridCols,
                        selected
                          ? "list-row-selected bg-primary/[0.16] hover:bg-primary/[0.2] border-primary/45 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.5)]"
                          : cn(
                            index % 2 === 0
                              ? "bg-card border-border/60 hover:bg-primary/[0.13] hover:border-primary/35"
                              : "bg-primary/[0.12] border-primary/25 hover:bg-primary/[0.17] hover:border-primary/40",
                          ),
                      )}
                      style={selected ? {} : { borderLeft: `3px solid ${accentColor}` }}
                      onClick={() => onSelectRO(ro)}
                      role="row"
                    >
                      {/* RO # + Date stacked */}
                      <div className="min-w-0" role="cell">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold tabular-nums text-foreground text-[12px] leading-none">
                            #{ro.roNumber}
                          </span>
                          <span className={laborPillClass(ro.laborType)} style={{ fontSize: '8px', padding: '1px 4px', lineHeight: 1 }}>
                            {laborAbbr(ro.laborType)}
                          </span>
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground leading-none mt-0.5 block">
                          {formatDateShort(effectiveDate(ro))}
                        </span>
                      </div>

                      {/* Info: advisor, vehicle, work summary */}
                      <div className="min-w-0" role="cell">
                        <p className="text-[11px] font-semibold truncate text-foreground leading-snug">
                          {ro.customerName || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 truncate leading-snug">
                          {ro.advisor || "No advisor"}
                          {vehicleLabel(ro) !== "—" && (
                            <span className="text-muted-foreground/60"> · {vehicleLabel(ro)}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/68 truncate leading-snug">
                          {workSummary}
                          {ro.lines && ro.lines.length > 0 && (
                            <span className="text-muted-foreground/50"> · {ro.lines.length}L</span>
                          )}
                        </p>
                      </div>

                      {/* Hours */}
                      <div className="text-right border-l border-border/45 pl-2" role="cell">
                        <span className="hours-pill text-[10px]">
                          {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
                        </span>
                      </div>

                      {/* Status */}
                      <div className="border-l border-border/45 pl-2" role="cell">
                        <RowStatusChips ro={ro} flagsCount={flagsCount} checksCount={issuesCount} isCarryover={carryoverROIds.has(ro.id)} />
                      </div>

                      {/* Action menu */}
                      <div onClick={(e) => e.stopPropagation()} role="cell">
                        <ROActionMenu
                          roNumber={ro.roNumber}
                          isPaid={!!ro.paidDate}
                          onEdit={() => onSelectRO(ro)}
                          onDelete={() => deleteRO(ro.id)}
                          onFlag={() => setFlaggingRO(ro)}
                          onTogglePaid={() => updateRO(ro.id, { paidDate: ro.paidDate ? '' : localDateStr() })}
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
        <div className="flex-shrink-0 px-3 py-1 border-t bg-background/80" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
          <span className="text-[9px] text-muted-foreground/50 tabular-nums">
            {filteredROs.length > visibleCount
              ? `${visible.length} of ${filteredROs.length}`
              : `${filteredROs.length} RO${filteredROs.length !== 1 ? 's' : ''}`}
            {(laborTypeFilter.length > 0 || advisorFilter !== "all") && ' · filtered'}
          </span>
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
