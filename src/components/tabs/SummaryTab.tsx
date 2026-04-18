import { useEffect, useState, useMemo } from 'react';
import { AlertCircle, CalendarIcon, Lock, Crown, Flag } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFlagContext } from '@/contexts/FlagContext';
import { SpiffsPanel } from '@/components/summary/SpiffsPanel';
import { ProofPack } from '@/components/reports/ProofPack';
import { usePayPeriodReport } from '@/hooks/usePayPeriodReport';
import { generateSummaryText } from '@/lib/exportUtils';
import { cn, localDateStr } from '@/lib/utils';
import { maskHours } from '@/lib/maskHours';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useCloseouts } from '@/hooks/useCloseouts';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { ClosedPeriodsList } from '@/components/reports/ClosedPeriodsList';
import { CloseoutDetailView } from '@/components/reports/CloseoutDetailView';
import type { CloseoutSnapshot, CloseoutRangeType } from '@/hooks/useCloseouts';
import { HideTotalsContext } from '@/contexts/HideTotalsContext';
import { MultiPeriodComparison } from '@/components/summary/MultiPeriodComparison';
import { StatCell } from '@/components/summary/StatCell';
import { HeroKPI } from '@/components/summary/HeroKPI';
import { HoursByDay } from '@/components/summary/HoursByDay';
import { HoursByAdvisor } from '@/components/summary/HoursByAdvisor';
import { MoreDetail } from '@/components/summary/MoreDetail';
import { GoalsAndEarnings } from '@/components/summary/GoalsAndEarnings';
import { ExportBlock } from '@/components/summary/ExportBlock';
import { getDayRange } from '@/lib/summaryDateRanges';
import { computeDateRangeBounds, type DateFilterKey } from '@/lib/dateRangeFilter';
import { getDateFilterLabel, getDefaultPeriodFilter, getPeriodFilterLabels, normalizeDateFilterForPayPeriod } from '@/lib/payPeriodRange';
import { useSharedDateRange } from '@/hooks/useSharedDateRange';

type SummaryTabView = 'summary' | 'spiffs' | 'compare';

interface SummaryTabProps {
  initialTab?: SummaryTabView;
  tabMode?: 'summary' | 'spiffs';
}

// ── Main SummaryTab ───────────────────────────────────────
export function SummaryTab({ initialTab = 'summary', tabMode = 'summary' }: SummaryTabProps) {
  const isMobile = useIsMobile();
  const { userSettings, clearFlagsForPeriod, updateUserSetting } = useFlagContext();
  const { isPro } = useSubscription();
  const hideTotals = userSettings.hideTotals ?? false;
  const weekStartDay = userSettings.weekStartDay ?? 0;

  const payPeriodType = userSettings.payPeriodType || 'week';
  const payPeriodEndDates = userSettings.payPeriodEndDates;
  const hasCustomPayPeriod = payPeriodType === 'custom' && payPeriodEndDates && payPeriodEndDates.length > 0;

  const defaultPeriodFilter = getDefaultPeriodFilter(userSettings);
  const periodLabels = getPeriodFilterLabels(userSettings);
  const {
    dateFilter: sharedDateFilter,
    setFilter: setSharedDateFilter,
    customStart: sharedCustomStart,
    customEnd: sharedCustomEnd,
    applyCustom: applySharedCustomRange,
  } = useSharedDateRange('week', 'summary-tab', userSettings);

  type SummaryRangeMode = DateFilterKey | 'day';
  const [rangeMode, setRangeMode] = useState<SummaryRangeMode>(sharedDateFilter);
  const [customStart, setCustomStart] = useState<Date | undefined>(sharedCustomStart ? new Date(`${sharedCustomStart}T12:00:00`) : undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(sharedCustomEnd ? new Date(`${sharedCustomEnd}T12:00:00`) : undefined);
  const [showProofPack, setShowProofPack] = useState(false);
  const [activeTab, setActiveTab] = useState<SummaryTabView>(tabMode === 'spiffs' ? 'spiffs' : initialTab);
  const handleTabChange = (value: string) => {
    if (value === 'summary' || value === 'spiffs' || value === 'compare') {
      setActiveTab(value);
    }
  };
  const [upgradeTrigger, setUpgradeTrigger] = useState<import('@/lib/proFeatures').UpgradeTrigger>('generic');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const openUpgrade = (trigger: import('@/lib/proFeatures').UpgradeTrigger) => {
    setUpgradeTrigger(trigger);
    setShowUpgrade(true);
  };

  const hoursGoalDaily = userSettings.hoursGoalDaily;
  const hoursGoalWeekly = userSettings.hoursGoalWeekly;
  const hourlyRate = userSettings.hourlyRate;

  // Closeout state
  const { closeouts, closeOutPeriod, isRangeClosed, getCloseoutForRange } = useCloseouts();
  const [showCloseoutConfirm, setShowCloseoutConfirm] = useState(false);
  const [showAlreadyClosed, setShowAlreadyClosed] = useState(false);
  const [closeoutLoading, setCloseoutLoading] = useState(false);
  const [snapshotProofPack, setSnapshotProofPack] = useState<CloseoutSnapshot | null>(null);
  const [detailCloseout, setDetailCloseout] = useState<CloseoutSnapshot | null>(null);

  // Compare state
  const [compareStart1, setCompareStart1] = useState<Date | undefined>();
  const [compareEnd1, setCompareEnd1] = useState<Date | undefined>();
  const [compareStart2, setCompareStart2] = useState<Date | undefined>();
  const [compareEnd2, setCompareEnd2] = useState<Date | undefined>();

  const today = new Date();
  const todayStr = localDateStr(today);
  useEffect(() => {
    setRangeMode((prev) => (prev === 'day' ? prev : normalizeDateFilterForPayPeriod(prev, userSettings)));
  }, [userSettings]);
  useEffect(() => {
    if (rangeMode !== 'day') setRangeMode(sharedDateFilter);
  }, [sharedDateFilter, rangeMode]);
  useEffect(() => {
    setActiveTab(tabMode === 'spiffs' ? 'spiffs' : initialTab);
  }, [initialTab, tabMode]);
  useEffect(() => {
    setCustomStart(sharedCustomStart ? new Date(`${sharedCustomStart}T12:00:00`) : undefined);
    setCustomEnd(sharedCustomEnd ? new Date(`${sharedCustomEnd}T12:00:00`) : undefined);
  }, [sharedCustomStart, sharedCustomEnd]);
  useEffect(() => {
    if (rangeMode !== 'custom' || !customStart || !customEnd) return;
    applySharedCustomRange(localDateStr(customStart), localDateStr(customEnd));
  }, [rangeMode, customStart, customEnd, applySharedCustomRange]);

  const dateRange = useMemo(() => {
    if (rangeMode === 'day') return getDayRange();
    if (rangeMode === 'custom' && customStart && customEnd) {
      return { start: localDateStr(customStart), end: localDateStr(customEnd) };
    }

    const bounds = computeDateRangeBounds({
      filter: rangeMode,
      weekStartDay,
      payPeriodType,
      payPeriodEndDates: (payPeriodEndDates || []) as number[],
      hasCustomPayPeriod,
      customStart: customStart ? localDateStr(customStart) : undefined,
      customEnd: customEnd ? localDateStr(customEnd) : undefined,
    });

    if (bounds) return { start: bounds.start, end: bounds.end };
    return computeDateRangeBounds({
      filter: defaultPeriodFilter,
      weekStartDay,
      payPeriodType,
      payPeriodEndDates: (payPeriodEndDates || []) as number[],
      hasCustomPayPeriod,
    }) || getDayRange();
  }, [rangeMode, customStart, customEnd, weekStartDay, payPeriodType, payPeriodEndDates, hasCustomPayPeriod, defaultPeriodFilter]);

  const report = usePayPeriodReport(dateRange.start, dateRange.end);

  const activeRangeLabel = useMemo(() => {
    if (rangeMode === 'day') return 'Day';
    return getDateFilterLabel(rangeMode, userSettings);
  }, [rangeMode, userSettings]);

  const viewModeLabel = useMemo(() => {
    const s = new Date(dateRange.start + 'T12:00:00');
    const e = new Date(dateRange.end + 'T12:00:00');
    if (dateRange.start === dateRange.end) return format(s, 'MMM d, yyyy');
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d')}`;
  }, [dateRange]);

  const rangeTypeForCloseout: CloseoutRangeType = (rangeMode === 'pay_period' || rangeMode === 'last_pay_period') ? 'pay_period'
    : rangeMode === 'last_week' ? 'last_week'
    : rangeMode === 'month' ? 'month'
    : rangeMode === 'custom' ? 'custom'
    : rangeMode === 'day' ? 'day' : 'week';

  const periodAlreadyClosed = isRangeClosed(dateRange.start, dateRange.end);
  const existingCloseout = getCloseoutForRange(dateRange.start, dateRange.end);

  const rangeEndDate = new Date(dateRange.end + 'T23:59:59');
  const msUntilEnd = rangeEndDate.getTime() - today.getTime();
  const isNearEnd = msUntilEnd >= 0 && msUntilEnd <= 24 * 60 * 60 * 1000;

  const closeoutLabel = (rangeMode === 'pay_period' || rangeMode === 'last_pay_period') ? 'Close Out Pay Period' : 'Close Out';

  const handleCloseOutClick = () => {
    if (periodAlreadyClosed) {
      setShowAlreadyClosed(true);
    } else {
      setShowCloseoutConfirm(true);
    }
  };

  const handleCloseOut = async () => {
    setCloseoutLoading(true);
    const ok = await closeOutPeriod(report, rangeTypeForCloseout);
    if (ok) {
      await clearFlagsForPeriod(report.rosInRange.map(r => r.id));
      toast.success('Closed out');
    } else {
      toast.error('Failed to close out');
    }
    setCloseoutLoading(false);
    setShowCloseoutConfirm(false);
  };

  const avgPerRO = report.totalROs > 0 ? Math.round((report.totalHours / report.totalROs) * 10) / 10 : 0;

  const isDesktop = !isMobile;

  const handleCopySummary = async () => {
    const text = generateSummaryText(report);
    await navigator.clipboard.writeText(text);
    toast.success('Summary copied');
  };

  const handleShowProofPack = () => { setSnapshotProofPack(null); setShowProofPack(true); };

  // ── Alerts inline (small, tightly coupled to state) ────
  const alertsBlock = (
    <>
      {isPro && isNearEnd && !periodAlreadyClosed && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-800 flex-1 leading-snug">
            Pay period ends soon — close out to lock your hours.
          </span>
          <Button size="sm" variant="default" onClick={handleCloseOutClick} className="flex-shrink-0 h-7 text-xs">
            Close Out
          </Button>
        </div>
      )}
      {periodAlreadyClosed && existingCloseout && Math.abs(report.totalHours - existingCloseout.totals.totalHours) > 0.1 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50/80 px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800 leading-snug">
              <span className="font-semibold">Hours changed since closeout.</span>{' '}
              Snapshot: {maskHours(existingCloseout.totals.totalHours, hideTotals)}h →
              Current: {maskHours(report.totalHours, hideTotals)}h
              ({hideTotals ? '±--.-' : `${(report.totalHours - existingCloseout.totals.totalHours) > 0 ? '+' : ''}${(report.totalHours - existingCloseout.totals.totalHours).toFixed(1)}`}h)
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── Range selector inline (tightly coupled to state) ───
  const rangeSelectorBlock = (
    <div className="flex items-center gap-2">
      <Select value={rangeMode} onValueChange={(v: string) => {
        setRangeMode(v as SummaryRangeMode);
        if (v !== 'day') setSharedDateFilter(v as DateFilterKey);
      }}>
        <SelectTrigger className="w-auto h-8 border border-border/60 bg-card shadow-none focus:ring-1 focus:ring-primary/30 px-3 gap-1 flex-shrink-0 text-xs font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Day</SelectItem>
          {hasCustomPayPeriod ? (
            <>
              <SelectItem value="pay_period">{periodLabels.current}</SelectItem>
              <SelectItem value="last_pay_period">{periodLabels.previous}</SelectItem>
            </>
          ) : (
            <>
              <SelectItem value="week">{periodLabels.current}</SelectItem>
              <SelectItem value="last_week">{periodLabels.previous}</SelectItem>
            </>
          )}
          <SelectItem value="month">Month</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-xs font-medium text-muted-foreground truncate flex-1">{`${activeRangeLabel} · ${viewModeLabel}`}</span>
      {isPro && (
        periodAlreadyClosed ? (
          <button
            onClick={() => existingCloseout && setDetailCloseout(existingCloseout)}
            className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/80 px-2 py-1 rounded border border-border/60 hover:text-foreground transition-colors"
          >
            <Lock className="h-3 w-3" />
            Closed
          </button>
        ) : (
          <Button
            size="sm"
            variant={isNearEnd ? 'default' : 'outline'}
            onClick={handleCloseOutClick}
            className="flex-shrink-0 h-7 px-2.5 text-xs cursor-pointer gap-1"
          >
            <Lock className="h-3 w-3" />
            {closeoutLabel}
          </Button>
        )
      )}
    </div>
  );

  // ── Custom date pickers inline ─────────────────────────
  const customDatePickersBlock = rangeMode !== 'custom' ? null : (
    <div className="flex gap-2 items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left text-xs', !customStart && 'text-muted-foreground')}>
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
            {customStart ? format(customStart, 'MMM d, yyyy') : 'Start'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground text-xs">–</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left text-xs', !customEnd && 'text-muted-foreground')}>
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
            {customEnd ? format(customEnd, 'MMM d, yyyy') : 'End'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );

  // ── Shared props for extracted components ───────────────
  const heroKPIProps = {
    totalHours: report.totalHours,
    totalROs: report.totalROs,
    totalLines: report.totalLines,
    avgPerRO,
    byLaborType: report.byLaborType,
    flaggedCount: report.flaggedCount,
    hideTotals,
  };

  const closedPeriodsProps = {
    closeouts,
    hideTotals,
    onViewProofPack: (c: CloseoutSnapshot) => { setSnapshotProofPack(c); setShowProofPack(true); },
    onViewDetail: (c: CloseoutSnapshot) => setDetailCloseout(c),
  };

  // ── Desktop two-column layout ──────────────────────────

  const renderDesktopSummary = () => (
    <HideTotalsContext.Provider value={hideTotals}>
      <div className="desktop-sections p-4">
        {alertsBlock}
        <div className="brand-section-banner p-3 space-y-2">
          {rangeSelectorBlock}
          {customDatePickersBlock}
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-3 items-start">
          <div className="space-y-3">
            <HeroKPI {...heroKPIProps} />
            <GoalsAndEarnings
              hoursGoalDaily={hoursGoalDaily}
              hoursGoalWeekly={hoursGoalWeekly}
              hourlyRate={hourlyRate}
              totalHours={report.totalHours}
              rangeMode={rangeMode}
              hideTotals={hideTotals}
            />

            {(hourlyRate > 0 || report.totalROs > 0) && (
              <div className="flex items-center gap-4 px-1">
                <StatCell label="ROs" value={String(report.totalROs)} sub={`${report.totalLines} lines`} />
                <StatCell label="Avg / RO" value={`${maskHours(avgPerRO, hideTotals)}h`} />
                {hourlyRate > 0 && !hideTotals && (
                  <StatCell label="Est. Earnings" value={`$${(report.totalHours * hourlyRate).toFixed(0)}`} accent />
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <ExportBlock
                isDesktop
                isPro={isPro}
                onCopySummary={handleCopySummary}
                onShowProofPack={handleShowProofPack}
              />
            </div>
          </div>

          <div className="space-y-3">
            <HoursByDay byDay={report.byDay} totalHours={report.totalHours} totalROs={report.totalROs} todayStr={todayStr} hideTotals={hideTotals} />
            <HoursByAdvisor byAdvisor={report.byAdvisor} hideTotals={hideTotals} />
            <MoreDetail byLaborType={report.byLaborType} byLaborRef={report.byLaborRef} flaggedCount={report.flaggedCount} hideTotals={hideTotals} />
          </div>
        </div>

        {isPro && <ClosedPeriodsList {...closedPeriodsProps} />}
      </div>
    </HideTotalsContext.Provider>
  );

  // ── Mobile single-column layout ────────────────────────

  const renderMobileSummary = () => (
    <HideTotalsContext.Provider value={hideTotals}>
      <div className="space-y-4 pb-2">
        {alertsBlock}
        <div className="px-4 pt-2.5">
          <div className="brand-section-banner p-3 space-y-2">
            {rangeSelectorBlock}
            {customDatePickersBlock}
          </div>
        </div>
        <div className="px-4"><HeroKPI {...heroKPIProps} /></div>
        <div className="px-4">
          <GoalsAndEarnings
            hoursGoalDaily={hoursGoalDaily}
            hoursGoalWeekly={hoursGoalWeekly}
            hourlyRate={hourlyRate}
            totalHours={report.totalHours}
            rangeMode={rangeMode}
            hideTotals={hideTotals}
          />
        </div>
        <div className="px-4 space-y-4">
          <HoursByDay byDay={report.byDay} totalHours={report.totalHours} totalROs={report.totalROs} todayStr={todayStr} hideTotals={hideTotals} />
          <HoursByAdvisor byAdvisor={report.byAdvisor} hideTotals={hideTotals} />
        </div>
        <div className="px-4">
          <MoreDetail byLaborType={report.byLaborType} byLaborRef={report.byLaborRef} flaggedCount={report.flaggedCount} hideTotals={hideTotals} />
        </div>
        <div className="px-4 space-y-2">
          <ExportBlock
            isDesktop={false}
            isPro={isPro}
            onCopySummary={handleCopySummary}
            onShowProofPack={handleShowProofPack}
          />
        </div>
        {isPro && (
          <div className="pb-4"><ClosedPeriodsList {...closedPeriodsProps} /></div>
        )}
      </div>
    </HideTotalsContext.Provider>
  );

  return (
    <div className="flex h-full w-full max-w-full min-w-0 flex-col overflow-x-hidden brand-shell-bg">
      {/* ══ Sticky Header: Tabs + Range ══ */}
      {tabMode === 'summary' && (
        <div className="panel-header brand-topbar">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full rounded-none bg-transparent h-10 gap-0 p-0">
              <TabsTrigger value="summary" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">Summary</TabsTrigger>
              {isPro ? (
                <TabsTrigger value="compare" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">Compare</TabsTrigger>
              ) : (
                <button
                  onClick={() => openUpgrade('compare')}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent"
                >
                  Compare
                  <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <Crown className="h-2.5 w-2.5" />PRO
                  </span>
                </button>
              )}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* ══ Content ══ */}
      <div className={cn('flex-1 overflow-y-auto', isMobile && 'pb-32')}>
        {activeTab === 'summary' && tabMode === 'summary' && (
          isDesktop ? renderDesktopSummary() : renderMobileSummary()
        )}



        {activeTab === 'spiffs' && (
          <div className={isDesktop ? 'desktop-sections p-4' : 'px-3 pt-3 pb-[calc(var(--tab-bar-height)+var(--safe-area-inset-bottom)+2.5rem)] sm:p-4'}>
            <SpiffsPanel
              rosInRange={report.rosInRange}
              startDate={dateRange.start}
              endDate={dateRange.end}
              rules={userSettings.spiffRules || []}
              manualEntries={userSettings.spiffManualEntries || []}
              onUpdateRules={async (rules) => {
                const result = await updateUserSetting('spiffRules', rules);
                if (result.status === 'success') toast.success('Spiff rules saved');
                else if (result.status === 'local_only') toast.warning(result.message || 'Saved locally only');
                else toast.error(result.message || 'Failed to save spiff rules');
                return result;
              }}
              onUpdateManualEntries={async (entries) => {
                const result = await updateUserSetting('spiffManualEntries', entries);
                if (result.status === 'success') toast.success('Manual spiffs saved');
                else if (result.status === 'local_only') toast.warning(result.message || 'Saved locally only');
                else toast.error(result.message || 'Failed to save manual spiffs');
                return result;
              }}
            />
          </div>
        )}

        {activeTab === 'compare' && isPro && (
          <div className={isDesktop ? 'desktop-sections p-4' : 'p-4'}>
            <HideTotalsContext.Provider value={hideTotals}>
              <MultiPeriodComparison
                weekStartDay={weekStartDay}
                start1={compareStart1} end1={compareEnd1}
                start2={compareStart2} end2={compareEnd2}
                onStart1Change={setCompareStart1} onEnd1Change={setCompareEnd1}
                onStart2Change={setCompareStart2} onEnd2Change={setCompareEnd2}
              />
            </HideTotalsContext.Provider>
          </div>
        )}
      </div>

      <ProofPack
        open={showProofPack}
        onClose={() => { setShowProofPack(false); setSnapshotProofPack(null); }}
        report={snapshotProofPack ? undefined : report}
        snapshot={snapshotProofPack || undefined}
      />

      {/* Closeout Confirm Dialog */}
      <Dialog open={showCloseoutConfirm} onOpenChange={setShowCloseoutConfirm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Close out {viewModeLabel}?</DialogTitle>
            <DialogDescription>
              This freezes your totals as a snapshot — future edits to ROs in this range won't change it.
            </DialogDescription>
          </DialogHeader>

          {report.flaggedCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <Flag className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 leading-relaxed">
                  <span className="font-semibold">{report.flaggedCount} active {report.flaggedCount === 1 ? 'flag' : 'flags'}</span> will be cleared on close out.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCloseoutConfirm(false)}>Cancel</Button>
            <Button onClick={handleCloseOut} disabled={closeoutLoading}>
              {closeoutLoading ? 'Closing…' : 'Close Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Already Closed Dialog */}
      <Dialog open={showAlreadyClosed} onOpenChange={setShowAlreadyClosed}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Already closed</DialogTitle>
            <DialogDescription>
              This period ({viewModeLabel}) is already closed out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAlreadyClosed(false)}>Dismiss</Button>
            <Button onClick={() => { setShowAlreadyClosed(false); if (existingCloseout) setDetailCloseout(existingCloseout); }}>
              View Closeout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Closeout Detail View */}
      {detailCloseout && (
        <CloseoutDetailView
          open={!!detailCloseout}
          onClose={() => setDetailCloseout(null)}
          closeout={detailCloseout}
        />
      )}

      <ProUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} trigger={upgradeTrigger} />
    </div>
  );
}
