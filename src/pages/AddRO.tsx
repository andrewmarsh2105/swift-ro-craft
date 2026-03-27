import { useState, useEffect, useRef, useMemo, useCallback, type KeyboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Plus, Loader2, User, FileText, Crown, ListChecks, Search } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { localDateStr } from '@/lib/utils';
import { motion } from 'framer-motion';
import { CompactLinesGrid, createEmptyLine } from '@/components/mobile/CompactLinesGrid';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { PresetHoursSheet } from '@/components/mobile/PresetHoursSheet';
import { ScanFlow, type ScanApplyData } from '@/components/scan/ScanFlow';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/states/EmptyState';
import { useRO } from '@/contexts/ROContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFlagContext } from '@/contexts/FlagContext';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { haptics } from '@/lib/haptics';
import type { LaborType, ROLine, VehicleInfo, Preset } from '@/types/ro';
import { cn } from '@/lib/utils';
import { calcLineHours } from '@/lib/roDisplay';
import { RO_MONTHLY_CAP } from '@/lib/proFeatures';
import { toast } from 'sonner';
import { useSharedDateRange } from '@/hooks/useSharedDateRange';
import { computeDateRangeBounds, filterROsByDateRange } from '@/lib/dateRangeFilter';
import { DetailsCollapsible } from '@/components/shared/DetailsCollapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';

// Desktop imports
import { DesktopWorkspace } from '@/components/desktop/DesktopWorkspace';
import { PresetSearchRail } from '@/components/shared/PresetSearchRail';


export default function AddRO() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { settings, addRO, updateRO, updateAdvisors, updatePresets, ros, loadingROs } = useRO();
  const { userSettings } = useFlagContext();
  const { isPro } = useSubscription();

  const editingROId = (location.state as { editingROId?: string; focusLineId?: string; openScan?: boolean })?.editingROId;
  const focusLineId = (location.state as { editingROId?: string; focusLineId?: string; openScan?: boolean })?.focusLineId;
  const openScanOnMount = (location.state as { editingROId?: string; focusLineId?: string; openScan?: boolean })?.openScan;
  const editingRO = editingROId ? ros.find(r => r.id === editingROId) : undefined;

  const [showAdvisorList, setShowAdvisorList] = useState(false);
  const [advisorSearch, setAdvisorSearch] = useState('');
  const [showScanFlow, setShowScanFlow] = useState(() => !!openScanOnMount);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [highlightedLineIds, setHighlightedLineIds] = useState<string[]>([]);
  const [recentlyAddedPresets, setRecentlyAddedPresets] = useState<string[]>([]);
  const [showProUpgrade, setShowProUpgrade] = useState(false);

  // Long-press preset hours sheet
  const [longPressPreset, setLongPressPreset] = useState<Preset | null>(null);

  // Preset search sheet
  const [showPresetSearch, setShowPresetSearch] = useState(false);
  const [presetSearchAnimatingId, setPresetSearchAnimatingId] = useState<string | null>(null);

  // Advisor sheet: toggle to show all advisors regardless of date range
  const [showAllAdvisors, setShowAllAdvisors] = useState(false);

  // Form state — advisor must be declared before the rangeFilteredAdvisors useMemo below
  const [advisor, setAdvisor] = useState(editingRO?.advisor || '');

  // RO cap — use ro.date (local YYYY-MM-DD) to avoid UTC createdAt timezone drift.
  const monthlyROCount = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter(r => r.date && r.date >= monthStart).length;
  }, [ros]);
  const isAtCap = !isPro && !editingRO && monthlyROCount >= RO_MONTHLY_CAP;

  // Date range for filtering advisors to match the current list view filter
  const { dateFilter, customStart, customEnd } = useSharedDateRange('week', 'mobile-ro-tab');
  const advisorRangeBounds = useMemo(() => computeDateRangeBounds({
    filter: dateFilter,
    weekStartDay: userSettings.weekStartDay ?? 0,
    defaultSummaryRange: userSettings.defaultSummaryRange,
    payPeriodEndDates: (userSettings.payPeriodEndDates || []) as number[],
    hasCustomPayPeriod: !!(userSettings.payPeriodEndDates?.length),
    customStart,
    customEnd,
  }), [dateFilter, userSettings.weekStartDay, userSettings.defaultSummaryRange, userSettings.payPeriodEndDates, customStart, customEnd]);

  const advisorsInRange = useMemo(() => {
    const rosInRange = filterROsByDateRange(ros, advisorRangeBounds);
    return new Set(rosInRange.map(r => r.advisor).filter(Boolean));
  }, [ros, advisorRangeBounds]);

  // Unified advisor list: saved settings + any advisor names from ROs not already in settings
  const allAdvisors = useMemo(() => {
    const settingsNames = new Set(settings.advisors.map(a => a.name));
    const extraFromROs = [...new Set(ros.map(r => r.advisor).filter(Boolean))]
      .filter(name => !settingsNames.has(name))
      .map(name => ({ id: name, name }));
    return [...settings.advisors, ...extraFromROs];
  }, [settings.advisors, ros]);

  // Advisors filtered to those active in the current date range (all shown when filter is 'all')
  const rangeFilteredAdvisors = useMemo(() => {
    if (dateFilter === 'all') return allAdvisors;
    return allAdvisors.filter(a => advisorsInRange.has(a.name) || a.name === advisor);
  }, [allAdvisors, advisorsInRange, dateFilter, advisor]);

  // When a date range is active, the toggle is off, and editing an existing RO, show only range
  // advisors; for new ROs always show all so the advisor list isn't empty on first use.
  const displayedAdvisors = (advisorRangeBounds && !showAllAdvisors && !!editingROId)
    ? rangeFilteredAdvisors
    : allAdvisors;

  const filteredAdvisors = displayedAdvisors.filter(a =>
    a.name.toLowerCase().includes(advisorSearch.toLowerCase())
  );
  const linesContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [roNumber, setRoNumber] = useState(editingRO?.roNumber || '');
  const [date, setDate] = useState(editingRO?.date || localDateStr());
  const [laborType, setLaborType] = useState<LaborType>(editingRO?.laborType || 'customer-pay');
  const [customerName, setCustomerName] = useState(editingRO?.customerName || '');
  const [notes, setNotes] = useState(editingRO?.notes || '');
  const [vehicle, setVehicle] = useState<VehicleInfo>(editingRO?.vehicle || {});
  const [mileage, setMileage] = useState(editingRO?.mileage || '');
  const [paidDate, setPaidDate] = useState(editingRO?.paidDate || '');

  const [lines, setLines] = useState<ROLine[]>(() => {
    if (editingRO?.lines?.length) return editingRO.lines;
    if (editingRO && editingRO.paidHours > 0) {
      return [{
        id: Date.now().toString(),
        lineNo: 1,
        description: editingRO.workPerformed || 'General Labor',
        hoursPaid: editingRO.paidHours,
        laborType: editingRO.laborType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
    }
    return [createEmptyLine(1)];
  });

  // Unsaved changes guard
  const initialSnapshotRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentSnapshot = useMemo(() => JSON.stringify({
    roNumber, advisor, date, laborType, customerName, notes, vehicle, mileage, paidDate, lines
  }), [roNumber, advisor, date, laborType, customerName, notes, vehicle, mileage, paidDate, lines]);

  // When editing, backfill form fields once the RO loads (handles the case where
  // the component mounts before ros[] is populated — useState initial values only
  // run once, so if editingRO was undefined on first render, fields stay empty).
  const formSeededRef = useRef(false);
  useEffect(() => {
    if (editingRO && !formSeededRef.current) {
      formSeededRef.current = true;
      setRoNumber(editingRO.roNumber || '');
      setAdvisor(editingRO.advisor || '');
      setDate(editingRO.date || localDateStr());
      setLaborType(editingRO.laborType || 'customer-pay');
      setCustomerName(editingRO.customerName || '');
      setNotes(editingRO.notes || '');
      setVehicle(editingRO.vehicle || {});
      setMileage(editingRO.mileage || '');
      setPaidDate(editingRO.paidDate || '');
      if (editingRO.lines?.length) {
        setLines(editingRO.lines);
      } else if (editingRO.paidHours > 0) {
        setLines([{
          id: Date.now().toString(),
          lineNo: 1,
          description: editingRO.workPerformed || 'General Labor',
          hoursPaid: editingRO.paidHours,
          laborType: editingRO.laborType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]);
      }
    }
  }, [editingRO]);

  useEffect(() => {
    // Set initial snapshot once data is ready
    if (initialSnapshotRef.current === null && !loadingROs) {
      initialSnapshotRef.current = currentSnapshot;
    }
  }, [currentSnapshot, loadingROs]);

  const isDirty = initialSnapshotRef.current !== null && currentSnapshot !== initialSnapshotRef.current;

  useUnsavedChangesGuard(isDirty && !isSaving, "Discard unsaved changes?");

  // Lock body scroll on mobile
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMobile]);

  // Clear highlights
  useEffect(() => {
    if (highlightedLineIds.length > 0) {
      const timer = setTimeout(() => setHighlightedLineIds([]), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedLineIds]);

  // Focus line from flag nav
  useEffect(() => {
    if (!focusLineId) return;
    setHighlightedLineIds([focusLineId]);
    const timer = setTimeout(() => {
      const el = linesContainerRef.current?.querySelector(`[data-line-id="${focusLineId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [focusLineId]);

  const totalHours = calcLineHours(lines);
  const tbdCount = lines.filter(l => l.isTbd).length;

  const quickPresets = useMemo(() => {
    const favorites = settings.presets.filter(p => p.isFavorite);
    const rest = settings.presets.filter(p => !p.isFavorite);
    return [...favorites, ...rest].slice(0, 12);
  }, [settings.presets]);

  const presetsVisible = lines.length > 1 || lines.some(l => l.description.trim() || l.hoursPaid > 0);

  const handleScanApply = (data: ScanApplyData) => {
    if (data.roNumber) setRoNumber(data.roNumber);
    if (data.advisor) setAdvisor(data.advisor);
    if (data.date) setDate(data.date);
    if (data.customerName) setCustomerName(data.customerName);
    if (data.vehicle) setVehicle(data.vehicle);
    if (data.mileage) setMileage(data.mileage);

    const newLineIds = data.lines.map(l => l.id);
    if (data.mode === 'replace') {
      setLines(data.lines.map((l, i) => ({ ...l, lineNo: i + 1 })));
    } else {
      setLines(prev => {
        const filtered = prev.filter(l => l.description || l.hoursPaid > 0);
        return [...data.lines, ...filtered].map((l, i) => ({ ...l, lineNo: i + 1 }));
      });
    }
    setHighlightedLineIds(newLineIds);
    setShowScanFlow(false);
    setTimeout(() => {
      linesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleAddLine = () => {
    haptics.light();
    const newLine = createEmptyLine(1);
    const updatedLines = [newLine, ...lines].map((line, i) => ({ ...line, lineNo: i + 1 }));
    setLines(updatedLines);
    setHighlightedLineIds([newLine.id]);
    toast.success('New line added');
  };

  const handlePresetAdd = (presetId: string) => {
    setRecentlyAddedPresets(prev => [presetId, ...prev.filter(id => id !== presetId)].slice(0, 3));
  };

  const addPresetLine = useCallback((preset: Preset, overrideHours?: number) => {
    haptics.medium();
    const newLineId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newLine: ROLine = {
      id: newLineId,
      lineNo: 1,
      description: preset.workTemplate || preset.name,
      hoursPaid: overrideHours !== undefined ? overrideHours : (preset.defaultHours || 0),
      laborType: preset.laborType,
      matchedReferenceId: preset.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedLines = [newLine, ...lines].map((l, i) => ({ ...l, lineNo: i + 1 }));
    setLines(updatedLines);
    setHighlightedLineIds([newLineId]);
    handlePresetAdd(preset.id);
    toast.success(`Added: ${preset.name} (${overrideHours !== undefined ? overrideHours : (preset.defaultHours || 0)}h)`);
  }, [lines]);

  const handleSaveLineAsPreset = useCallback((line: ROLine) => {
    const name = (line.description || '').trim();
    if (!name) {
      toast.error('Add a description before saving as a preset');
      return;
    }
    const duplicate = settings.presets.find(
      p => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      toast.error(`A preset named "${name}" already exists`);
      return;
    }
    const newPreset: Preset = {
      id: Date.now().toString(),
      name,
      laborType: line.laborType || 'customer-pay',
      defaultHours: line.hoursPaid || undefined,
    };
    updatePresets([...settings.presets, newPreset]);
    haptics.success();
    toast.success(`Saved preset: ${name}`);
  }, [settings.presets, updatePresets]);

  const handlePresetSearchSelect = useCallback((preset: Preset) => {
    setPresetSearchAnimatingId(preset.id);
    setTimeout(() => {
      setPresetSearchAnimatingId(null);
      addPresetLine(preset);
      setShowPresetSearch(false);
    }, 400);
  }, [addPresetLine]);

  const allLinesTbd = lines.length > 0 && lines.every(l => l.isTbd);

  const handleToggleAllTbd = () => {
    haptics.light();
    const markTbd = !allLinesTbd;
    setLines(prev => prev.map(l => ({ ...l, isTbd: markTbd, updatedAt: new Date().toISOString() })));
    toast.success(markTbd ? 'All lines marked TBD' : 'TBD cleared from all lines');
  };

  const handleSave = async (addAnother: boolean = false) => {
    if (!roNumber.trim()) { toast.error('RO number is required'); return; }
    if (!advisor.trim()) { toast.error('Advisor is required'); return; }

    const computedWorkPerformed = lines.map(l => l.description).filter(Boolean).join('\n');
    const roData = {
      roNumber, advisor,
      customerName: customerName.trim() || undefined,
      vehicle: (vehicle.year || vehicle.make || vehicle.model) ? vehicle : undefined,
      mileage: mileage.trim() || undefined,
      paidDate: paidDate.trim() || (editingRO ? '' : undefined),
      paidHours: totalHours, laborType,
      workPerformed: computedWorkPerformed, notes, date,
      photos: editingRO?.photos, lines, isSimpleMode: false,
    };

    if (isAtCap) { setShowProUpgrade(true); return; }

    setIsSaving(true);
    try {
      if (editingRO) {
        const success = await updateRO(editingRO.id, roData);
        if (!success) return;
        toast.success('RO updated');
      } else {
        const saved = await addRO(roData);
        if (!saved) return;
        toast.success('RO created');
      }
      haptics.success();
      // Reset snapshot so guard doesn't block
      initialSnapshotRef.current = currentSnapshot;
      if (addAnother) {
        setRoNumber(''); setCustomerName(''); setNotes(''); setPaidDate('');
        setLines([createEmptyLine(1)]);
        initialSnapshotRef.current = null; // will be set on next render
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}. Try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = roNumber.trim() !== '';

  // Desktop: use workspace
  if (!isMobile) return <DesktopWorkspace />;

  // If editing but RO not found (and not loading)
  if (editingROId && !editingRO && !loadingROs) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <PageHeader title="Edit RO" onBack={() => navigate(-1)} />
        <EmptyState
          icon={FileText}
          title="RO not found"
          description="RO not found — it may have been deleted."
          actions={
            <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary">Go back</button>
          }
        />
      </div>
    );
  }

  // Loading skeleton for edit mode
  if (editingROId && loadingROs) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <PageHeader title="Loading..." onBack={() => navigate(-1)} />
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <PageHeader
        title={editingRO ? `Edit RO #${editingRO.roNumber}` : (userSettings.shopName || 'New Repair Order')}
        subtitle={`${totalHours.toFixed(1)}h${tbdCount > 0 ? ` · ${tbdCount} TBD` : ''} · ${lines.length} lines`}
        onBack={() => navigate(-1)}
        rightActions={isPro ? (
          <button
            type="button"
            onClick={() => setShowScanFlow(true)}
            className="h-11 w-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open scan flow"
          >
            <Camera className="h-5 w-5" />
          </button>
        ) : undefined}
      />

      {/* Monthly cap banner — shown when free user hits the RO_MONTHLY_CAP limit */}
      {isAtCap && (
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200 dark:bg-amber-950/40 dark:border-amber-800">
          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-300 leading-snug">
            You've hit your {RO_MONTHLY_CAP} RO/month limit.{' '}
            <button
              type="button"
              onClick={() => setShowProUpgrade(true)}
              className="font-semibold underline underline-offset-2"
            >
              Upgrade to Pro
            </button>{' '}
            to keep logging.
          </p>
        </div>
      )}

      {/* Core fields strip */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="px-3 py-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              inputMode="numeric"
              value={roNumber}
              onChange={e => setRoNumber(e.target.value.slice(0, 20))}
              placeholder="RO #"
              maxLength={20}
              aria-label="Repair order number"
              aria-required="true"
              className="w-20 h-11 px-2 bg-muted rounded-md border border-input text-base font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              aria-label="Repair order date"
              className="w-[120px] h-11 px-2 bg-muted rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvisorList(true)}
            className={cn(
              'flex-1 min-w-[120px] h-11 px-2 rounded-md border border-input text-sm text-left flex items-center gap-1.5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              advisor ? 'bg-muted font-medium' : 'bg-muted/50 text-muted-foreground'
            )}
            aria-label={advisor ? `Selected advisor ${advisor}` : 'Select advisor'}
          >
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{advisor || 'Advisor'}</span>
          </button>
        </div>

        {/* Details collapsible */}
        <DetailsCollapsible
          vehicle={vehicle}
          onVehicleChange={setVehicle}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          mileage={mileage}
          onMileageChange={setMileage}
          paidDate={paidDate}
          onPaidDateChange={setPaidDate}
          laborType={laborType}
          onLaborTypeChange={(type: string) => setLaborType(type as import('@/types/ro').LaborType)}
          notes={notes}
          onNotesChange={setNotes}
          open={showMoreFields}
          onOpenChange={setShowMoreFields}
          layout="mobile"
        />
      </div>

      {/* Lines */}
      <main ref={linesContainerRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-3 pb-56">
          <CompactLinesGrid
            lines={lines}
            onLinesChange={setLines}
            presets={settings.presets}
            highlightedIds={highlightedLineIds}
            roVehicle={vehicle}
            showVehicleChips={userSettings.showVehicleChips}
            onSaveAsPreset={handleSaveLineAsPreset}
          />
        </div>
      </main>

      {/* Bottom action bar — 2 clean zones */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">

        {/* Zone 1: Quick actions — icon add-line + preset rail + search + tbd-all */}
        <div className="px-3 pt-2 pb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5">

            {/* Add Line: icon-only square button */}
            <button
              type="button"
              onClick={handleAddLine}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 active:scale-[0.93] transition-all"
              aria-label="Add line"
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Preset rail — flex-1, scrollable, scroll-protected */}
            <div className="flex-1 overflow-hidden min-w-0">
              {quickPresets.length > 0 ? (
                <div
                  className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {recentlyAddedPresets.length > 0 && (
                    <>
                      {recentlyAddedPresets.map(id => {
                        const p = settings.presets.find(pr => pr.id === id);
                        return p ? (
                          <span key={id} className="flex-shrink-0 px-2 py-1 bg-primary/10 rounded-md text-xs text-primary font-medium border border-primary/20 whitespace-nowrap">
                            ✓ {p.name}
                          </span>
                        ) : null;
                      })}
                      <div className="w-px h-5 bg-border flex-shrink-0" />
                    </>
                  )}
                  {quickPresets.map(preset => (
                    <PresetButton
                      key={preset.id}
                      preset={preset}
                      onTap={() => addPresetLine(preset)}
                      onLongPress={() => setLongPressPreset(preset)}
                    />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground px-1">No presets — add in Settings</span>
              )}
            </div>

            {/* Search: opens all-presets sheet */}
            <button
              type="button"
              onClick={() => setShowPresetSearch(true)}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-secondary border border-border active:scale-[0.93] transition-all"
              aria-label="Browse all presets"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* TBD All: icon-only, amber when active */}
            <button
              type="button"
              onClick={handleToggleAllTbd}
              className={cn(
                'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border active:scale-[0.93] transition-all',
                allLinesTbd
                  ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700'
                  : 'bg-secondary text-muted-foreground border-border'
              )}
              title={allLinesTbd ? 'Clear TBD from all lines' : 'Mark all lines as TBD'}
              aria-label={allLinesTbd ? 'Clear TBD from all lines' : 'Mark all lines as TBD'}
              aria-pressed={allLinesTbd}
            >
              <ListChecks className="h-4 w-4" />
            </button>

          </div>
        </div>

        {/* Zone 2: Save bar — summary info + action buttons */}
        <div className="px-3 py-2.5 flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-baseline gap-2">
            <span className="text-[17px] font-bold text-primary tabular-nums leading-none">
              {totalHours.toFixed(1)}h
            </span>
            <span className="text-xs text-muted-foreground leading-none" aria-live="polite">
              {lines.length} {lines.length === 1 ? 'line' : 'lines'}
              {tbdCount > 0 && <span className="ml-1 text-destructive font-medium">· {tbdCount} TBD</span>}
            </span>
          </div>
          {!editingRO && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={!isValid || isSaving}
              className={cn(
                'h-11 px-4 rounded-full font-medium text-sm border min-h-[44px] transition-colors active:scale-[0.98]',
                isValid && !isSaving ? 'border-border text-foreground hover:bg-muted' : 'border-muted text-muted-foreground'
              )}
            >
              + Add
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={!isValid || isSaving}
            className={cn(
              'h-11 px-6 rounded-full font-semibold text-sm min-h-[44px] transition-colors active:scale-[0.98] flex items-center gap-2',
              isValid && !isSaving ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingRO ? 'Update' : 'Save'}
          </button>
        </div>
      </footer>

      {/* Preset search sheet */}
      <BottomSheet isOpen={showPresetSearch} onClose={() => setShowPresetSearch(false)} title="Add Preset">
        <div className="px-4 pt-3 pb-4">
          <PresetSearchRail
            presets={settings.presets}
            onSelect={handlePresetSearchSelect}
            animatingId={presetSearchAnimatingId}
            layout="mobile"
            mobileMode="grid"
          />
        </div>
      </BottomSheet>

      {/* Long-press preset hours sheet */}
      <PresetHoursSheet
        open={!!longPressPreset}
        onClose={() => setLongPressPreset(null)}
        preset={longPressPreset}
        onConfirm={(hours) => {
          if (longPressPreset) {
            addPresetLine(longPressPreset, hours);
          }
          setLongPressPreset(null);
        }}
      />

      {/* Advisor Sheet */}
      <BottomSheet isOpen={showAdvisorList} onClose={() => { setShowAdvisorList(false); setShowAllAdvisors(false); }} title="Select Advisor">
        <div className="p-4 space-y-2">
          <input
            type="text"
            placeholder="Search or add new advisor..."
            value={advisorSearch}
            onChange={e => setAdvisorSearch(e.target.value)}
            aria-label="Search advisors"
            className="w-full h-11 px-3 bg-secondary rounded-md border border-input text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {advisorRangeBounds && !advisorSearch && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span>{showAllAdvisors ? 'Showing all advisors' : `Filtered to: ${advisorRangeBounds.label}`}</span>
              <button
                type="button"
                onClick={() => setShowAllAdvisors(v => !v)}
                className="text-primary font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                aria-pressed={showAllAdvisors}
              >
                {showAllAdvisors ? 'Show range only' : 'Show all'}
              </button>
            </div>
          )}
          {displayedAdvisors.length > 0 && !advisorSearch && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {[...displayedAdvisors].sort((a, b) => a.name.localeCompare(b.name)).map(adv => (
                <button
                  type="button"
                  key={adv.id}
                  onClick={() => { setAdvisor(adv.name); setShowAdvisorList(false); setAdvisorSearch(''); }}
                  className={cn(
                    'h-10 px-3 rounded-full text-xs font-medium border transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    advisor === adv.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                  aria-pressed={advisor === adv.name}
                >
                  {adv.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
          {filteredAdvisors.map(adv => (
            <button
              type="button"
              key={adv.id}
              onClick={() => { setAdvisor(adv.name); setShowAdvisorList(false); setAdvisorSearch(''); }}
              className={cn(
                'w-full p-3 rounded-md text-left text-sm font-medium min-h-[44px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                advisor === adv.name ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'
              )}
              aria-pressed={advisor === adv.name}
            >
              {adv.name}
            </button>
          ))}
          {advisorSearch.trim() && !allAdvisors.some(a => a.name.toLowerCase() === advisorSearch.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => {
                const name = advisorSearch.trim();
                updateAdvisors([...settings.advisors, { id: Date.now().toString(), name }]);
                setAdvisor(name); setShowAdvisorList(false); setAdvisorSearch('');
                toast.success(`Advisor "${name}" created`);
              }}
              className="w-full p-3 rounded-md text-left text-sm font-medium min-h-[44px] bg-primary/10 text-primary border border-dashed border-primary/30 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Add: "{advisorSearch.trim()}"
            </button>
          )}
        </div>
      </BottomSheet>

      {/* Scan */}
      <ScanFlow
        isOpen={showScanFlow}
        onClose={() => setShowScanFlow(false)}
        onApply={handleScanApply}
        roId={editingROId}
        hasExistingLines={lines.some(l => l.description.trim() !== '' || l.hoursPaid > 0)}
        existingLineDescriptions={lines.map(l => l.description)}
      />

      <ProUpgradeDialog open={showProUpgrade} onOpenChange={setShowProUpgrade} trigger="ro-cap" />
    </div>
  );
}

// Preset button with long-press + horizontal-scroll protection
function PresetButton({
  preset,
  onTap,
  onLongPress,
}: {
  preset: Preset;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  const pointerStartX = useRef<number | null>(null);
  const cancelledByScrollRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    pointerStartX.current = e.clientX;
    cancelledByScrollRef.current = false;
    didLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      haptics.medium();
      onLongPress();
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerStartX.current !== null && Math.abs(e.clientX - pointerStartX.current) > 8) {
      cancelledByScrollRef.current = true;
      clearLongPress();
    }
  };

  const handlePointerUp = () => {
    clearLongPress();
    if (!didLongPressRef.current && !cancelledByScrollRef.current) {
      setIsPressed(true);
      onTap();
      setTimeout(() => setIsPressed(false), 600);
    }
    pointerStartX.current = null;
  };

  const handlePointerCancel = () => {
    clearLongPress();
    pointerStartX.current = null;
    cancelledByScrollRef.current = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onTap();
  };

  useEffect(() => {
    return () => clearLongPress();
  }, []);

  return (
    <button
      type="button"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      className={cn(
        'flex-shrink-0 px-2.5 h-9 border rounded-full text-xs font-medium flex items-center gap-1 transition-all duration-150 select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isPressed
          ? 'bg-primary text-primary-foreground border-primary scale-95'
          : 'bg-card border-border hover:bg-primary/10 hover:border-primary/30 active:scale-95'
      )}
      aria-label={`Add preset ${preset.name}`}
    >
      {isPressed ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex">✓</motion.span>
      ) : (
        <Plus className="h-3 w-3" />
      )}
      {preset.name}
      {preset.defaultHours !== undefined && (
        <span className="opacity-60">({preset.defaultHours}h)</span>
      )}
    </button>
  );
}
