import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Plus, Search, ArrowUpDown, ClipboardCheck, Wrench, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRO } from "@/contexts/ROContext";
import { useFlagContext } from "@/contexts/FlagContext";
import { StatusPill } from "@/components/mobile/StatusPill";
import { ROActionMenu } from "@/components/shared/ROActionMenu";
import { FlagBadge } from "@/components/flags/FlagBadge";
import { ReviewIndicator } from "@/components/flags/ReviewIndicator";
import { AddFlagDialog } from "@/components/flags/AddFlagDialog";
import { toast } from "sonner";
import type { RepairOrder } from "@/types/ro";
import type { FlagType } from "@/types/flags";
import type { ReviewIssue } from "@/lib/reviewRules";
import { getReviewIssues } from "@/lib/reviewRules";
import { cn } from "@/lib/utils";
import { getCustomPayPeriodRange } from "@/lib/payPeriodUtils";
import { maskHours } from "@/lib/maskHours";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { effectiveDate, formatDateShort, vehicleLabel, calcHours } from "@/lib/roDisplay";

interface ROListPanelProps {
  selectedROId: string | null;
  onSelectRO: (ro: RepairOrder) => void;
  onAddNew: () => void;
  onFilteredROsChange?: (ros: RepairOrder[]) => void;
  compact?: boolean;
}

type DateFilter = "all" | "today" | "week" | "month" | "pay_period";
type SortKey = "date" | "ro" | "advisor" | "hours";
type SortDir = "asc" | "desc";

function getWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

function getTwoWeekStart(weekStartDay: number): string {
  const now = new Date();
  const diff = (now.getDay() - weekStartDay + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diff - 7);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
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
        props.align === "right" && "ml-auto"
      )}
    >
      {props.label}
      <ArrowUpDown className="h-3 w-3" />
      {props.active && (
        <span className="text-[9px] text-primary">{props.dir}</span>
      )}
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
  const isCompact = compact;
  const { getFlagsForRO, clearFlag, addFlag, userSettings } = useFlagContext();

  const [searchQuery, setSearchQuery] = useLocalStorageState("ui.desktop.roTable.search.v1", "");
  const deferredSearch = useDeferredValue(searchQuery);
  const [dateFilter, setDateFilter] = useLocalStorageState<DateFilter>("ui.desktop.roTable.dateFilter.v1", "all");
  const [advisorFilter, setAdvisorFilter] = useLocalStorageState("ui.desktop.roTable.advisorFilter.v1", "all");
  const [sortKey, setSortKey] = useLocalStorageState<SortKey>("ui.desktop.roTable.sortKey.v1", "date");
  const [sortDir, setSortDir] = useLocalStorageState<SortDir>("ui.desktop.roTable.sortDir.v1", "desc");
  const [visibleCount, setVisibleCount] = useState(80);
  const [flaggingRO, setFlaggingRO] = useState<RepairOrder | null>(null);

  const hasCustomPayPeriod =
    userSettings.payPeriodType === "custom" &&
    Array.isArray(userSettings.payPeriodEndDates) &&
    userSettings.payPeriodEndDates.length > 0;

  const advisors = useMemo(() => {
    const uniq = Array.from(
      new Set(ros.map((r) => r.advisor).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    return uniq;
  }, [ros]);

  const filteredROs = useMemo(() => {
    let result = ros;

    // Advisor filter
    if (advisorFilter !== "all") {
      result = result.filter((ro) => ro.advisor === advisorFilter);
    }

    // Search (deferred for smoother typing)
    const q = deferredSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((ro) => {
        const v = vehicleLabel(ro).toLowerCase();
        const work = (ro.workPerformed || "").toLowerCase();
        const customer = (ro.customerName || "").toLowerCase();
        return (
          ro.roNumber.toLowerCase().includes(q) ||
          ro.advisor.toLowerCase().includes(q) ||
          v.includes(q) ||
          work.includes(q) ||
          customer.includes(q)
        );
      });
    }

    // Date filter
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (dateFilter === "today") {
      result = result.filter((ro) => effectiveDate(ro) === today);
    } else if (dateFilter === "week") {
      const useTwoWeeks =
        userSettings.defaultSummaryRange === "two_weeks";
      const start = useTwoWeeks
        ? getTwoWeekStart(userSettings.weekStartDay ?? 0)
        : getWeekStart(userSettings.weekStartDay ?? 0);
      result = result.filter((ro) => effectiveDate(ro) >= start);
    } else if (dateFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const start = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, "0")}-${String(monthAgo.getDate()).padStart(2, "0")}`;
      result = result.filter((ro) => effectiveDate(ro) >= start);
    } else if (dateFilter === "pay_period" && hasCustomPayPeriod) {
      const { start, end } = getCustomPayPeriodRange(
        userSettings.payPeriodEndDates!,
        new Date()
      );
      result = result.filter((ro) => {
        const d = effectiveDate(ro);
        return d >= start && d <= end;
      });
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") {
        const aDate = effectiveDate(a);
        const bDate = effectiveDate(b);
        return aDate < bDate ? -dir : aDate > bDate ? dir : 0;
      }
      if (sortKey === "ro")
        return a.roNumber.localeCompare(b.roNumber) * dir;
      if (sortKey === "advisor")
        return a.advisor.localeCompare(b.advisor) * dir;
      if (sortKey === "hours")
        return (calcHours(a) - calcHours(b)) * dir;
      return 0;
    });

    return sorted;
  }, [
    ros,
    advisorFilter,
    searchQuery,
    dateFilter,
    hasCustomPayPeriod,
    userSettings.defaultSummaryRange,
    userSettings.payPeriodEndDates,
    userSettings.weekStartDay,
    sortKey,
    sortDir,
  ]);

  useEffect(() => {
    onFilteredROsChange?.(filteredROs);
  }, [filteredROs, onFilteredROsChange]);

  useEffect(() => {
    setVisibleCount(80);
  }, [searchQuery, dateFilter, advisorFilter, sortKey, sortDir]);

  const visible = useMemo(
    () => filteredROs.slice(0, visibleCount),
    [filteredROs, visibleCount]
  );

  const totals = useMemo(() => {
    const totalHours = filteredROs.reduce(
      (sum, ro) => sum + calcHours(ro),
      0
    );
    return {
      totalHours,
      totalVisible: visible.length,
      totalAll: filteredROs.length,
    };
  }, [filteredROs, visible.length]);

  const toggleSort = useCallback((nextKey: SortKey) => {
    setSortKey((currentKey) => {
      if (currentKey !== nextKey) {
        setSortDir("desc");
        return nextKey;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return currentKey;
    });
  }, []);

  return (
    <>
      <div className="flex flex-col h-full border-r border-border bg-card">
        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Repair Orders
              </h2>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {totals.totalAll} total •{" "}
                {maskHours(
                  totals.totalHours,
                  userSettings.hideTotals ?? false
                )}
                h
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
                placeholder="Search RO #, advisor, vehicle, customer…"
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <select
                  value={dateFilter}
                  onChange={(e) =>
                    setDateFilter(e.target.value as DateFilter)
                  }
                  className="h-7 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All dates</option>
                  <option value="today">Today</option>
                  <option value="week">
                    {userSettings.defaultSummaryRange === "two_weeks"
                      ? "2 Weeks"
                      : "1 Week"}
                  </option>
                  <option value="month">Last 30 days</option>
                  {hasCustomPayPeriod && (
                    <option value="pay_period">Pay period</option>
                  )}
                </select>
              </div>

              <div className="flex-1 min-w-0">
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
          </div>
        </div>

        {/* Table */}
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
              <p className="text-sm font-medium text-foreground/70">
                No repair orders found
              </p>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Try a different search, date filter, or advisor.
              </p>
            </div>
          ) : (
            <Table className={cn(isCompact ? "min-w-[720px]" : "min-w-[980px]")}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 px-3">
                    <SortHeader
                      label="Date"
                      active={sortKey === "date"}
                      dir={sortDir}
                      onClick={() => toggleSort("date")}
                    />
                  </TableHead>
                  <TableHead className="h-8 px-2">
                    <SortHeader
                      label="RO #"
                      active={sortKey === "ro"}
                      dir={sortDir}
                      onClick={() => toggleSort("ro")}
                    />
                  </TableHead>
                  {!isCompact && (
                    <TableHead className="h-8 px-2">
                      <SortHeader
                        label="Advisor"
                        active={sortKey === "advisor"}
                        dir={sortDir}
                        onClick={() => toggleSort("advisor")}
                      />
                    </TableHead>
                  )}
                  <TableHead className="h-8 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Info
                  </TableHead>
                  <TableHead className="h-8 px-2">
                    <SortHeader
                      label="Hours"
                      active={sortKey === "hours"}
                      dir={sortDir}
                      onClick={() => toggleSort("hours")}
                      align="right"
                    />
                  </TableHead>
                  <TableHead className="h-8 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="h-8 w-10 px-1" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((ro) => {
                  const hours = calcHours(ro);
                  const flags = getFlagsForRO(ro.id);
                  const issues = getReviewIssues(ro, ros);
                  const selected = selectedROId === ro.id;

                  return (
                    <TableRow
                      key={ro.id}
                      data-state={selected ? "selected" : undefined}
                      className={cn(
                        "cursor-pointer text-xs",
                        selected && "bg-primary/5"
                      )}
                      onClick={() => onSelectRO(ro)}
                    >
                      <TableCell className="px-3 py-2 text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatDateShort(effectiveDate(ro))}
                      </TableCell>
                      <TableCell className="px-2 py-2 font-medium whitespace-nowrap">
                        #{ro.roNumber}
                      </TableCell>
                      {!isCompact && (
                        <TableCell className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                          {ro.advisor}
                        </TableCell>
                      )}
                      <TableCell className={cn("px-2 py-2", isCompact ? "max-w-[240px]" : "max-w-[220px]")}>
                        <p className="text-[11px] font-medium truncate">
                          {isCompact ? ro.advisor : vehicleLabel(ro)}
                        </p>
                        {isCompact && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {vehicleLabel(ro)}
                          </p>
                        )}
                        <p
                          className={cn(
                            "text-[10px] text-muted-foreground truncate",
                            isCompact && "mt-0.5",
                          )}
                        >
                          {(ro.lines?.length
                            ? ro.lines
                                .map((l) => l.description)
                                .filter(Boolean)
                                .slice(0, 2)
                                .join(", ")
                            : ro.workPerformed) || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="px-2 py-2 text-right font-bold tabular-nums whitespace-nowrap">
                        {maskHours(
                          Number(hours.toFixed(1)),
                          userSettings.hideTotals ?? false
                        )}
                        h
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <StatusPill type={ro.laborType} size="sm" />
                          <FlagBadge
                            flags={flags}
                            onClear={clearFlag}
                          />
                          {issues.length > 0 && (
                            <ReviewIndicator
                              issues={issues}
                              onConvertToFlag={(
                                issue,
                                flagType,
                                note
                              ) =>
                                addFlag(
                                  issue.roId,
                                  flagType,
                                  note || issue.detail,
                                  issue.lineId
                                )
                              }
                            />
                          )}
                          {ro.lines?.length ? (
                            <Badge variant="secondary">
                              {ro.lines.length} lines
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className="px-1 py-2 text-right"
                      >
                        <ROActionMenu
                          roNumber={ro.roNumber}
                          onEdit={() => onSelectRO(ro)}
                          onDuplicate={(newRONumber) => {
                            duplicateRO(ro.id, newRONumber);
                            toast.success(
                              `Duplicated RO #${ro.roNumber} → #${newRONumber}`
                            );
                          }}
                          onDelete={() => {
                            deleteRO(ro.id);
                            toast.success(
                              `Deleted RO #${ro.roNumber}`
                            );
                          }}
                          onFlag={() => setFlaggingRO(ro)}
                          existingRONumbers={ros.map((r) => r.roNumber)}
                          className="-mr-2"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!loadingROs && filteredROs.length > visibleCount && (
            <div className="px-3 py-2 text-center border-t border-border">
              <button
                onClick={() => setVisibleCount((c) => c + 80)}
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                Load more ({filteredROs.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground tabular-nums">
              {filteredROs.length} ROs
              {filteredROs.length > visibleCount
                ? ` (showing ${visible.length})`
                : ""}
            </span>
            <span className="font-semibold tabular-nums">
              {maskHours(
                totals.totalHours,
                userSettings.hideTotals ?? false
              )}
              h total
            </span>
          </div>
        </div>
      </div>

      {/* Add Flag Dialog */}
      <AddFlagDialog
        open={!!flaggingRO}
        onClose={() => setFlaggingRO(null)}
        onSubmit={(flagType, note) => {
          if (flaggingRO) addFlag(flaggingRO.id, flagType, note);
        }}
        title={
          flaggingRO ? `Flag RO #${flaggingRO.roNumber}` : "Add Flag"
        }
      />
    </>
  );
});
