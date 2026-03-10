import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Plus, Loader2, User, FileText, ClipboardPaste } from 'lucide-react';
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
import { parsePastedLines } from '@/lib/parseLines';
import type { LaborType, ROLine, VehicleInfo, Preset } from '@/types/ro';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DetailsCollapsible } from '@/components/shared/DetailsCollapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';

// Desktop imports
import { DesktopWorkspace } from '@/components/desktop/DesktopWorkspace';


export default function AddRO() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { settings, addRO, updateRO, updateAdvisors, ros, loadingROs } = useRO();
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
  const [showCapSheet, setShowCapSheet] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);

  // Long-press preset hours sheet
  const [longPressPreset, setLongPressPreset] = useState<Preset | null>(null);

  // RO cap
  const monthlyROCount = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter(r => r.createdAt && r.createdAt >= monthStart).length;
  }, [ros]);
  const RO_CAP = 150;
  const isAtCap = !isPro && !editingRO && monthlyROCount >= RO_CAP;

  const filteredAdvisors = settings.advisors.filter(a =>
    a.name.toLowerCase().includes(advisorSearch.toLowerCase())
  );
  const linesContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [roNumber, setRoNumber] = useState(editingRO?.roNumber || '');
  const [advisor, setAdvisor] = useState(editingRO?.advisor || '');
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

  const totalHours = lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0);
  const tbdCount = lines.filter(l => l.isTbd).length;

  const quickPresets = useMemo(() => {
    const favorites = settings.presets.filter(p => p.isFavorite);
    const rest = settings.presets.filter(p => !p.isFavorite);
    return [...favorites, ...rest].slice(0, 8);
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

  const handlePasteLines = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parsePastedLines(text, laborType);
      if (!parsed.length) {
        toast.error('No lines found in clipboard');
        return;
      }
      haptics.light();
      const newLines: ROLine[] = parsed.map((p, i) => ({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9) + i,
        lineNo: i + 1,
        description: p.description,
        hoursPaid: p.hoursPaid,
        isTbd: p.isTbd,
        laborType: p.laborType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const updatedLines = [...newLines, ...lines].map((l, i) => ({ ...l, lineNo: i + 1 }));
      setLines(updatedLines);
      setHighlightedLineIds(newLines.map(l => l.id));
      toast.success(`Pasted ${newLines.length} lines`);
    } catch (err) {
      toast.error('Failed to read clipboard');
    }
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

    if (isAtCap) { setShowCapSheet(true); return; }

    setIsSaving(true);
    try {
      if (editingRO) {
        await updateRO(editingRO.id, roData);
        toast.success('RO updated');
      } else {
        await addRO(roData);
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
          description="The repair order you're looking for doesn't exist or was deleted."
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
        title={editingRO ? `Edit RO #${editingRO.roNumber}` : 'New Repair Order'}
        subtitle={`${totalHours.toFixed(1)}h${tbdCount > 0 ? ` · ${tbdCount} TBD` : ''} · ${lines.length} lines`}
        onBack={() => navigate(-1)}
        rightActions={
          <div className="flex items-center gap-1">
            {isPro && (
              <button
                onClick={() => setShowScanFlow(true)}
                className="h-11 w-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Camera className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={!isValid || isSaving}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-colors',
                isValid && !isSaving
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingRO ? 'Update' : 'Save'}
            </button>
          </div>
        }
      />

      {/* Core fields strip */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              inputMode="numeric"
              value={roNumber}
              onChange={e => setRoNumber(e.target.value)}
              placeholder="RO #"
              className="w-20 h-11 px-2 bg-muted rounded-md border border-input text-base font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            onClick={() => setShowAdvisorList(true)}
            className={cn(
              'flex-1 h-11 px-2 rounded-md border border-input text-sm text-left flex items-center gap-1.5 min-w-0 overflow-hidden',
              advisor ? 'bg-muted font-medium' : 'bg-muted/50 text-muted-foreground'
            )}
          >
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{advisor || 'Advisor'}</span>
          </button>

          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-[120px] h-11 px-2 bg-muted rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
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
          onLaborTypeChange={setLaborType}
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
          />
        </div>
      </main>

      {/* Bottom action bar — 2 clean zones */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">

        {/* Zone 1: Quick actions — add line + paste + preset rail */}
        <div className="px-3 pt-2.5 pb-2 border-b border-border/60">
          {presetsVisible ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddLine}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-semibold bg-primary/10 text-primary border border-primary/20 active:scale-[0.96] transition-all min-w-[44px]"
              >
                <Plus className="h-4 w-4" />
                Line
              </button>

              <button
                onClick={handlePasteLines}
                className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium bg-secondary border border-border active:scale-[0.96] transition-all"
                title="Paste lines from clipboard"
              >
                <ClipboardPaste className="h-4 w-4" />
              </button>

              {quickPresets.length > 0 ? (
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                    {recentlyAddedPresets.length > 0 && (
                      <>
                        {recentlyAddedPresets.map(id => {
                          const preset = settings.presets.find(p => p.id === id);
                          return preset ? (
                            <span key={id} className="flex-shrink-0 px-2 py-1 bg-primary/12 rounded-md text-xs text-primary font-medium border border-primary/20">
                              ✓ {preset.name}
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
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No presets — add in Settings.</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddLine}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-md text-sm font-semibold bg-primary/10 text-primary border border-primary/20 active:scale-[0.96] transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Line
              </button>
              <button
                onClick={handlePasteLines}
                className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium bg-secondary border border-border active:scale-[0.96] transition-all"
                title="Paste lines from clipboard"
              >
                <ClipboardPaste className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Zone 2: Save bar — summary info + action buttons */}
        <div className="px-3 py-2.5 flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-baseline gap-2">
            <span className="text-[17px] font-bold text-primary tabular-nums leading-none">
              {totalHours.toFixed(1)}h
            </span>
            <span className="text-xs text-muted-foreground leading-none">
              {lines.length} {lines.length === 1 ? 'line' : 'lines'}
              {tbdCount > 0 && <span className="ml-1 text-destructive font-medium">· {tbdCount} TBD</span>}
            </span>
          </div>
          {!editingRO && (
            <button
              onClick={() => handleSave(true)}
              disabled={!isValid || isSaving}
              className={cn(
                'h-11 px-4 rounded-md font-medium text-sm border min-h-[44px] transition-colors active:scale-[0.98]',
                isValid && !isSaving ? 'border-border text-foreground hover:bg-muted' : 'border-muted text-muted-foreground'
              )}
            >
              + Add
            </button>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={!isValid || isSaving}
            className={cn(
              'h-11 px-6 rounded-md font-semibold text-sm min-h-[44px] transition-colors active:scale-[0.98] flex items-center gap-2',
              isValid && !isSaving ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingRO ? 'Update' : 'Save'}
          </button>
        </div>
      </footer>

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
      <BottomSheet isOpen={showAdvisorList} onClose={() => setShowAdvisorList(false)} title="Select Advisor">
        <div className="p-4 space-y-2">
          <input
            type="text"
            placeholder="Search or add new advisor..."
            value={advisorSearch}
            onChange={e => setAdvisorSearch(e.target.value)}
            className="w-full h-11 px-3 bg-secondary rounded-md border border-input text-base focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {settings.advisors.length > 0 && !advisorSearch && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {[...settings.advisors].sort((a, b) => a.name.localeCompare(b.name)).map(adv => (
                <button
                  key={adv.id}
                  onClick={() => { setAdvisor(adv.name); setShowAdvisorList(false); setAdvisorSearch(''); }}
                  className={cn(
                    'h-8 px-3 rounded-md text-xs font-medium border transition-colors active:scale-95',
                    advisor === adv.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {adv.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
          {filteredAdvisors.map(adv => (
            <button
              key={adv.id}
              onClick={() => { setAdvisor(adv.name); setShowAdvisorList(false); setAdvisorSearch(''); }}
              className={cn(
                'w-full p-3 rounded-md text-left text-sm font-medium min-h-[44px] border',
                advisor === adv.name ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'
              )}
            >
              {adv.name}
            </button>
          ))}
          {advisorSearch.trim() && !settings.advisors.some(a => a.name.toLowerCase() === advisorSearch.trim().toLowerCase()) && (
            <button
              onClick={() => {
                const name = advisorSearch.trim();
                updateAdvisors([...settings.advisors, { id: Date.now().toString(), name }]);
                setAdvisor(name); setShowAdvisorList(false); setAdvisorSearch('');
                toast.success(`Advisor "${name}" created`);
              }}
              className="w-full p-3 rounded-md text-left text-sm font-medium min-h-[44px] bg-primary/10 text-primary border border-dashed border-primary/30 flex items-center gap-2"
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

      {/* Cap Sheet */}
      <BottomSheet isOpen={showCapSheet} onClose={() => setShowCapSheet(false)} title="Monthly Limit Reached">
        <div className="p-6 space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            You've created {monthlyROCount} ROs this month. Free accounts are limited to {RO_CAP}/month.
          </p>
          <button
            onClick={() => { setShowCapSheet(false); setShowProUpgrade(true); }}
            className="w-full py-3 bg-primary text-primary-foreground rounded-md font-semibold text-sm min-h-[44px]"
          >
            Upgrade to Pro
          </button>
          <button onClick={() => setShowCapSheet(false)} className="w-full py-2 text-muted-foreground text-sm min-h-[44px]">
            Maybe later
          </button>
        </div>
      </BottomSheet>

      <ProUpgradeDialog open={showProUpgrade} onOpenChange={setShowProUpgrade} />
    </div>
  );
}

// Preset button with long-press support
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

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    didLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      haptics.medium();
      onLongPress();
    }, 450);
  };

  const handlePointerUp = () => {
    clearLongPress();
    if (!didLongPressRef.current) {
      setIsPressed(true);
      onTap();
      setTimeout(() => setIsPressed(false), 600);
    }
  };

  const handlePointerCancel = () => {
    clearLongPress();
  };

  useEffect(() => {
    return () => clearLongPress();
  }, []);

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      className={cn(
        'flex-shrink-0 px-3 h-11 border rounded-md text-sm font-medium flex items-center gap-1.5 transition-all duration-150 min-h-[44px] select-none touch-manipulation',
        isPressed
          ? 'bg-primary text-primary-foreground border-primary scale-95'
          : 'bg-card border-border hover:bg-primary/10 hover:border-primary/30 active:scale-95'
      )}
    >
      {isPressed ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex">✓</motion.span>
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
      {preset.name}
      {preset.defaultHours !== undefined && (
        <span className="opacity-60">({preset.defaultHours}h)</span>
      )}
    </button>
  );
}
