import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Plus, Search, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { useRO } from "@/contexts/ROContext";
import { useFlagContext } from "@/contexts/FlagContext";

import { StatusPill } from "@/components/mobile/StatusPill";
import { ROActionMenu } from "@/components/shared/ROActionMenu";
import { FlagBadge } from "@/components/flags/FlagBadge";
import { ReviewIndicator } from "@/components/flags/ReviewIndicator";
import { AddFlagDialog } from "@/components/flags/AddFlagDialog";

import { getCustomPayPeriodRange } from "@/lib/payPeriodUtils";
import { maskHours } from "@/lib/maskHours";
import { cn } from "@/lib/utils";
import { calcHours, effectiveDate, formatDateShort, vehicleLabel } from "@/lib/roDisplay";

import type { RepairOrder } from "@/types/ro";
import type { FlagType } from "@/types/flags";
import type { ReviewIssue } from "@/lib/reviewRules";
import { getReviewIssues } from "@/lib/reviewRules";

interface ROListPanelProps {
  selectedROId: string | null;
  onSelectRO: (ro: RepairOrder) => void;
  onAddNew: () => void;
  onFilteredROsChange?: (ros: RepairOrder[]) => void;
  /**
   * Compact mode is used when the editor is open.
   * It keeps all key fields visible without horizontal scrolling by stacking info.
   */
  compact?: boolean;
}

type DateFilter = "all" | "today" | "week" | "month" | "pay_period";
type SortKey = "date" | "ro" | "advisor" | "hours";
type SortDir = "asc" | "desc";

function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  return localDateStr(start);
}

function getTwoWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff - 7);
  return localDateStr(start);
}

function SortHeader(props: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      onClick={props.onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors",
        props.active ? "text-foreground" : "text-muted-foreground",
        props.align === "right" && "ml-auto",
      )}
    >
      {props.label}
      <ArrowUpDown className="h-3 w-3" />
      {props.active && <span className="text-[9px] text-primary">{props.dir}</span>}
    </button>
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

  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(80);

  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);

  const hasCustomPayPeriod =
    userSettings.payPeriodType === "custom" &&
    Array.isArray(userSettings.payPeriodEndDates) &&
    userSettings.payPeriodEndDates.length > 0;

  const advisors = useMemo(() => {
    return Array.from(new Set(ros.map((r) => r.advisor).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [ros]);

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
          ? ro.lines
              .map((l) => l.description)
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
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

    const today = localDateStr(new Date());

    if (dateFilter === "today") {
      result = result.filter((ro) => effectiveDate(ro) === today);
    } else if (dateFilter === "week") {
      const useTwoWeeks = userSettings.defaultSummaryRange === "two_weeks";
      const start = useTwoWeeks
        ? getTwoWeekStart(userSettings.weekStartDay ?? 0)
        : getWeekStart(userSettings.weekStartDay ?? 0);
      result = result.filter((ro) => effectiveDate(ro) >= start);
    } else if (dateFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const start = localDateStr(monthAgo);
      result = result.filter((ro) => effectiveDate(ro) >= start);
    } else if (dateFilter === "pay_period" && hasCustomPayPeriod) {
      const { start, end } = getCustomPayPeriodRange(userSettings.payPeriodEndDates!, new Date());
      result = result.filter((ro) => {
        const d = effectiveDate(ro);
        return d >= start && d <= end;
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;

    const sorted = [...result].sort((a, b) => {
      if (sortKey === "date") return effectiveDate(a).localeCompare(effectiveDate(b)) * dir;
      if (sortKey === "ro") return a.roNumber.localeCompare(b.roNumber) * dir;
      if (sortKey === "advisor") return a.advisor.localeCompare(b.advisor) * dir;
      if (sortKey === "hours") return (calcHours(a) - calcHours(b)) * dir;
      return 0;
    });

    return sorted;
  }, [
    ros,
    advisorFilter,
    deferredQuery,
    dateFilter,
    hasCustomPayPeriod,
    sortKey,
    sortDir,
    userSettings.defaultSummaryRange,
    userSettings.payPeriodEndDates,
    userSettings.weekStartDay,
  ]);

  useEffect(() => {
    onFilteredROsChange?.(filteredROs);
  }, [filteredROs, onFilteredROsChange]);

  useEffect(() => {
    setVisibleCount(80);
  }, [deferredQuery, dateFilter, advisorFilter, sortKey, sortDir]);

  const visible = useMemo(() => filteredROs.slice(0, visibleCount), [filteredROs, visibleCount]);

  const totals = useMemo(() => {
    const totalHours = filteredROs.reduce((sum, ro) => sum + calcHours(ro), 0);
    return {
      totalHours,
      totalAll: filteredROs.length,
      totalVisible: visible.length,
    };
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

  const gridHeaderClass = compact
    ? "grid grid-cols-[68px_88px_1fr_72px_150px_44px] gap-x-2 items-center px-3 py-2"
    : "grid grid-cols-[72px_96px_180px_1fr_72px_220px_44px] gap-x-2 items-center px-3 py-2";

  const gridRowClass = compact
    ? "grid grid-cols-[68px_88px_1fr_72px_150px_44px] gap-x-2 items-start px-3 py-2"
    : "grid grid-cols-[72px_96px_180px_1fr_72px_220px_44px] gap-x-2 items-start px-3 py-2";

  return (
    <>
      <div className="flex flex-col h-full border-r border-border bg-card">
        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Repair Orders</h2>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {totals.totalAll} total •{" "}
                {maskHours(Number(totals.totalHours.toFixed(1)), userSettings.hideTotals ?? false)}h
              </p>
            </div>

            <Button size="sm" onClick={onAddNew} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add RO
            </Button>
          </div>

          {/* Toolbar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search RO #, advisor, vehicle, customer, work..."
                className="h-9 pl-9"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Date filter
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="h-7 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="week">
                    {userSettings.defaultSummaryRange === "two_weeks" ? "2 Weeks" : "1 Week"}
                  </option>
                  <option value="month">Last 30 days</option>
                  {hasCustomPayPeriod && <option value="pay_period">Pay period</option>}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                  Advisor
                </label>
                <select
                  value={advisorFilter}
                  onChange={(e) => setAdvisorFilter(e.target.value)}
                  className="h-7 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All advisors</option>
                  {advisors.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>No horizontal scroll</span>
              <span>·</span>
              <span>Adaptive rows</span>
              <span>·</span>
              <span>{compact ? "Compact" : "Expanded"}</span>
            </div>
          </div>
        </div>

        {/* Grid "table" */}
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
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Try a different search, date filter, or advisor.
              </p>
            </div>
          ) : (
            <div>
              {/* Grid header */}
              <div
                className={cn(
                  gridHeaderClass,
                  "sticky top-0 z-10 bg-card border-b border-border",
                )}
              >
                <div>
                  <SortHeader
                    label="Date"
                    active={sortKey === "date"}
                    dir={sortDir}
                    onClick={() => toggleSort("date")}
                  />
                </div>
                <div>
                  <SortHeader
                    label="RO #"
                    active={sortKey === "ro"}
                    dir={sortDir}
                    onClick={() => toggleSort("ro")}
                  />
                </div>

                {!compact && (
                  <div>
                    <SortHeader
                      label="Advisor"
                      active={sortKey === "advisor"}
                      dir={sortDir}
                      onClick={() => toggleSort("advisor")}
                    />
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Info
                  </span>
                  {compact && (
                    <button
                      onClick={() => toggleSort("advisor")}
                      className="ml-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      title="Sort by advisor"
                    >
                      Advisor <ArrowUpDown className="inline h-2.5 w-2.5" />
                    </button>
                  )}
                </div>

                <div>
                  <SortHeader
                    label="Hours"
                    active={sortKey === "hours"}
                    dir={sortDir}
                    onClick={() => toggleSort("hours")}
                    align="right"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </span>
                </div>

                <div />
              </div>

              {/* Grid rows */}
              <div>
                {visible.map((ro) => {
                  const hours = calcHours(ro);
                  const flags = getFlagsForRO(ro.id);
                  const issues = getReviewIssues(ro, ros);
                  const selected = selectedROId === ro.id;

                  return (
                    <div
                      key={ro.id}
                      className={cn(
                        gridRowClass,
                        "cursor-pointer text-xs border-b border-border/50 hover:bg-muted/50 transition-colors",
                        selected && "bg-primary/5",
                      )}
                      onClick={() => onSelectRO(ro)}
                      role="row"
                    >
                      <div className="text-muted-foreground whitespace-nowrap tabular-nums" role="cell">
                        {formatDateShort(effectiveDate(ro))}
                      </div>

                      <div className="font-medium whitespace-nowrap" role="cell">#{ro.roNumber}</div>

                      {!compact && (
                        <div className="text-muted-foreground whitespace-nowrap truncate" role="cell">
                          {ro.advisor}
                        </div>
                      )}

                      <div className="min-w-0" role="cell">
                        <p className="text-[11px] font-medium truncate">
                          {compact ? `${ro.advisor} · ${vehicleLabel(ro)}` : vehicleLabel(ro)}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {(ro.lines?.length
                            ? ro.lines.map((l) => l.description).filter(Boolean).slice(0, 2).join(", ")
                            : ro.workPerformed) || "—"}
                        </p>
                      </div>

                      <div className="text-right font-bold tabular-nums whitespace-nowrap" role="cell">
                        {maskHours(Number(hours.toFixed(1)), userSettings.hideTotals ?? false)}h
                      </div>

                      <div role="cell">
                        <div className="flex items-center gap-1 flex-wrap">
                          <StatusPill type={ro.laborType} size="sm" />
                          <FlagBadge flags={flags} onClear={clearFlag} />
                          {issues.length > 0 ? (
                            <ReviewIndicator
                              issues={issues}
                              onConvertToFlag={(issue, flagType, note) =>
                                addFlag(issue.roId, flagType, note || issue.detail, issue.lineId)
                              }
                            />
                          ) : null}
                          {ro.lines?.length ? <Badge variant="secondary">{ro.lines.length} lines</Badge> : null}
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()} role="cell">
                        <ROActionMenu
                          roNumber={ro.roNumber}
                          onEdit={() => onSelectRO(ro)}
                          onDuplicate={(newRONumber) => {
                            duplicateRO(ro.id, newRONumber);
                            toast.success(`Duplicated RO #${ro.roNumber} → #${newRONumber}`);
                          }}
                          onDelete={() => {
                            deleteRO(ro.id);
                            toast.success(`Deleted RO #${ro.roNumber}`);
                          }}
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
                    className="text-sm font-semibold text-primary hover:text-primary/80"
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
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground tabular-nums">
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
    </>
  );
});
