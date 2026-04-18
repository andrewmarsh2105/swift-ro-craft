import { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Save, Calendar, FileText, Loader2, AlertCircle, Flag, StickyNote, Split } from 'lucide-react';
import type { FlagType } from '@/types/flags';
import { FLAG_TYPE_LABELS, FLAG_TYPE_COLORS, FLAG_TYPE_BG } from '@/types/flags';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { localDateStr } from '@/lib/utils';
import { LinesGrid } from './LinesGrid';
import { createEmptyLine } from '@/lib/roLine';
import { AdvisorCombobox } from './AdvisorCombobox';
import { StatusPill } from '@/components/mobile/StatusPill';
import { ScanFlow, type ScanApplyData } from '@/components/scan/ScanFlow';
import { DetailsCollapsible } from '@/components/shared/DetailsCollapsible';
import { PresetSearchRail } from '@/components/shared/PresetSearchRail';
import { PostSavePaidStatusPrompt } from '@/components/shared/PostSavePaidStatusPrompt';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { EmptyState } from '@/components/states/EmptyState';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { haptics } from '@/lib/haptics';
import type { LaborType, ROLine, RepairOrder, VehicleInfo } from '@/types/ro';
import { cn } from '@/lib/utils';
import { calcLineHours } from '@/lib/roDisplay';
import { toast } from 'sonner';
import { useSharedDateRange } from '@/hooks/useSharedDateRange';
import { computeDateRangeBounds, filterROsByDateRange } from '@/lib/dateRangeFilter';
import { usePostSavePaidStatusPrompt } from '@/hooks/usePostSavePaidStatusPrompt';
import { SplitRODialog } from '@/components/shared/SplitRODialog';
import { buildSplitRONumber, splitLinesBySelection } from '@/lib/roSplit';

interface ROEditorProps {
  ro?: RepairOrder | null;
  isNew?: boolean;
  focusLineId?: string | null;
  onSave?: (roId?: string) => void;
  onCancel?: () => void;
  onSaveAndAddAnother?: () => void;
}

import { LABOR_TYPES } from '@/lib/laborTypes';

export function ROEditor({ ro, isNew = false, focusLineId, onSave, onCancel, onSaveAndAddAnother }: ROEditorProps) {
  const { settings, addRO, updateRO, updateAdvisors, updatePresets, ros } = useRO();
  const { userSettings, getFlagsForRO, addFlag, clearFlag } = useFlagContext();
  const { isPro } = useSubscription();
  const postSaveStatusPrompt = usePostSavePaidStatusPrompt({ updateRO });

  // Date range for filtering advisors to match the current list view filter
  const { dateFilter, customStart, customEnd } = useSharedDateRange('week', 'desktop-list', userSettings);
  const advisorRangeBounds = useMemo(() => computeDateRangeBounds({
    filter: dateFilter,
    weekStartDay: userSettings.weekStartDay ?? 0,
    payPeriodType: userSettings.payPeriodType,
    payPeriodEndDates: (userSettings.payPeriodEndDates || []) as number[],
    hasCustomPayPeriod: !!(userSettings.payPeriodEndDates?.length),
    customStart,
    customEnd,
  }), [dateFilter, userSettings.weekStartDay, userSettings.payPeriodType, userSettings.payPeriodEndDates, customStart, customEnd]);

  // Form state
  const [roNumber, setRoNumber] = useState(ro?.roNumber || '');
  const [advisor, setAdvisor] = useState(ro?.advisor || '');
  const [customerName, setCustomerName] = useState(ro?.customerName || '');
  const [date, setDate] = useState(ro?.date || localDateStr());
  const [laborType, setLaborType] = useState<LaborType>(ro?.laborType || 'customer-pay');
  const [notes, setNotes] = useState(ro?.notes || '');
  const [vehicle, setVehicle] = useState<VehicleInfo>(ro?.vehicle || {});
  const [mileage, setMileage] = useState(ro?.mileage || '');
  const [paidDate, setPaidDate] = useState(ro?.paidDate || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lines, setLines] = useState<ROLine[]>(() => {
    if (ro?.lines?.length) return ro.lines.map(l => ({ ...l, laborType: l.laborType || 'customer-pay' }));
    if (ro && ro.paidHours > 0) {
      return [{
        id: Date.now().toString(), lineNo: 1,
        description: ro.workPerformed || 'General Labor',
        hoursPaid: ro.paidHours, laborType: ro.laborType || 'customer-pay',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }];
    }
    return [createEmptyLine(1)];
  });
  const [showDetails, setShowDetails] = useState(!!(ro?.notes || ro?.customerName || ro?.mileage || ro?.vehicle?.year || ro?.vehicle?.make || ro?.vehicle?.model || ro?.paidDate));
  const [showScanFlow, setShowScanFlow] = useState(false);
  const [highlightedLineIds, setHighlightedLineIds] = useState<string[]>([]);
  const [animatingPresetId, setAnimatingPresetId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [confirmClearFlag, setConfirmClearFlag] = useState(false);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const flagPickerRef = useRef<HTMLDivElement | null>(null);
  const linesContainerRef = useRef<HTMLDivElement | null>(null);

  // Advisors filtered to those active in the current date range.
  // For new ROs skip range-filtering so the list is never empty on first use.
  const rangeFilteredAdvisors = useMemo(() => {
    if (dateFilter === 'all' || isNew) return settings.advisors;
    const rosInRange = filterROsByDateRange(ros, advisorRangeBounds);
    const inRange = new Set(rosInRange.map(r => r.advisor).filter(Boolean));
    return settings.advisors.filter(a => inRange.has(a.name) || a.name === advisor);
  }, [settings.advisors, ros, advisorRangeBounds, dateFilter, advisor, isNew]);

  // Active flags for this RO
  const roFlags = useMemo(() => ro?.id ? getFlagsForRO(ro.id) : [], [ro?.id, getFlagsForRO]);
  const isFlagged = roFlags.length > 0;

  // Close flag picker on outside click
  useEffect(() => {
    if (!showFlagPicker && !confirmClearFlag) return;
    const handler = (e: MouseEvent) => {
      if (flagPickerRef.current && !flagPickerRef.current.contains(e.target as Node)) {
        setShowFlagPicker(false);
        setConfirmClearFlag(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFlagPicker, confirmClearFlag]);

  const FLAG_OPTIONS: FlagType[] = ['needs_time', 'questionable', 'waiting', 'advisor_question', 'other'];

  // Duplicate RO check
  function checkDuplicateRO(roNum: string) {
    const trimmed = roNum.trim().toLowerCase();
    if (!trimmed || !isNew) { setDuplicateWarning(false); return; }
    setDuplicateWarning(ros.some(r => r.roNumber.trim().toLowerCase() === trimmed));
  }

  // Sync with ro prop
  useEffect(() => {
    if (ro) {
      setRoNumber(ro.roNumber);
      setAdvisor(ro.advisor);
      setCustomerName(ro.customerName || '');
      setDate(ro.date);
      setLaborType(ro.laborType);
      setNotes(ro.notes || '');
      setVehicle(ro.vehicle || {});
      setMileage(ro.mileage || '');
      setPaidDate(ro.paidDate || '');
      if (ro.lines?.length) setLines(ro.lines);
      else if (ro.paidHours > 0) {
        setLines([{
          id: Date.now().toString(), lineNo: 1,
          description: ro.workPerformed || 'General Labor',
          hoursPaid: ro.paidHours, laborType: ro.laborType,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }]);
      }
    } else if (isNew) {
      setRoNumber(''); setAdvisor(''); setCustomerName('');
      setDate(localDateStr()); setLaborType('customer-pay');
      setNotes(''); setVehicle({}); setMileage(''); setPaidDate('');
      setLines([createEmptyLine(1)]); setShowDetails(false);
    }
  }, [ro, isNew]);

  useEffect(() => {
    if (highlightedLineIds.length > 0) {
      const timer = setTimeout(() => setHighlightedLineIds([]), 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedLineIds]);

  useEffect(() => {
    if (!focusLineId) return;
    setHighlightedLineIds([focusLineId]);
    const timer = setTimeout(() => {
      const el = linesContainerRef.current?.querySelector(`[data-line-id="${focusLineId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(timer);
  }, [focusLineId]);

  const totalHours = calcLineHours(lines);
  const splittableLines = useMemo(
    () => lines.filter((line) => line.description.trim() !== '' || line.hoursPaid > 0),
    [lines],
  );
  const isValid = roNumber.trim() !== '';

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
  };

  const handleSaveLineAsPreset = (line: ROLine) => {
    const name = (line.description || '').trim();
    if (!name) { toast.error('Add a description before saving as a preset'); return; }
    if (settings.presets.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`A preset named "${name}" already exists`);
      return;
    }
    updatePresets([...settings.presets, {
      id: Date.now().toString(),
      name,
      laborType: line.laborType || 'customer-pay',
      defaultHours: line.hoursPaid || undefined,
    }]);
    haptics.success();
    toast.success(`Saved preset: ${name}`);
  };

  const handleSave = async (addAnother: boolean = false) => {
    if (isSaving || postSaveStatusPrompt.isSavingChoice) return;
    if (!roNumber.trim()) { toast.error('RO number is required'); return; }
    if (!advisor.trim()) { toast.error('Advisor is required'); return; }


    const computedWorkPerformed = lines.map(l => l.description).filter(Boolean).join('\n');
    const roData = {
      roNumber, advisor,
      customerName: customerName.trim() || undefined,
      vehicle: (vehicle.year || vehicle.make || vehicle.model) ? vehicle : undefined,
      mileage: mileage.trim() || undefined,
      // New ROs are created open; prompt asks whether to mark paid immediately after save.
      paidDate: ro ? (paidDate.trim() || '') : '',
      paidHours: totalHours, laborType,
      workPerformed: computedWorkPerformed, notes, date,
      photos: ro?.photos, lines, isSimpleMode: false,
    };

    setIsSaving(true);
    try {
      if (ro) {
        const success = await updateRO(ro.id, roData);
        if (!success) return;
        toast.success('RO updated');
        onSave?.(ro.id);
      } else {
        const saved = await addRO(roData);
        if (!saved) return;
        if (!('id' in saved)) return;
        toast.success('RO created');
        postSaveStatusPrompt.requestStatusChoice({
          roId: saved.id,
          roNumber: roData.roNumber,
          onComplete: () => {
            if (addAnother) {
              setRoNumber(''); setCustomerName(''); setNotes(''); setPaidDate('');
              setLines([createEmptyLine(1)]); setShowDetails(false);
              onSaveAndAddAnother?.();
            } else {
              onSave?.(saved.id);
            }
          },
        });
      }
      haptics.success();
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSplitConfirm = async ({ selectedLineIds, statusChoice }: { selectedLineIds: string[]; statusChoice: 'open' | 'paid' }) => {
    if (!ro) return;
    if (isSaving || postSaveStatusPrompt.isSavingChoice) return;

    const { version2Lines, remainingLines } = splitLinesBySelection(splittableLines, selectedLineIds);
    if (!version2Lines.length || !remainingLines.length) {
      toast.error('Select at least one line for version 2 and keep at least one on the current RO.');
      return;
    }

    const nextRONumber = buildSplitRONumber(roNumber, ros.map((item) => item.roNumber));
    const nowIso = new Date().toISOString();
    const normalizedRemainingLines = remainingLines.map((line, index) => ({
      ...line,
      lineNo: index + 1,
      updatedAt: nowIso,
    }));
    const normalizedVersion2Lines = version2Lines.map((line, index) => ({
      ...line,
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      lineNo: index + 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    setIsSaving(true);
    try {
      const updatedOriginal = {
        roNumber,
        advisor,
        customerName: customerName.trim() || undefined,
        vehicle: (vehicle.year || vehicle.make || vehicle.model) ? vehicle : undefined,
        mileage: mileage.trim() || undefined,
        paidDate: paidDate.trim() || '',
        paidHours: calcLineHours(normalizedRemainingLines),
        laborType,
        workPerformed: normalizedRemainingLines.map((line) => line.description).filter(Boolean).join('\n'),
        notes,
        date,
        photos: ro.photos,
        lines: normalizedRemainingLines,
        isSimpleMode: false,
      };

      const updated = await updateRO(ro.id, updatedOriginal);
      if (!updated) return;

      const newVersion = await addRO({
        roNumber: nextRONumber,
        advisor,
        customerName: customerName.trim() || undefined,
        vehicle: (vehicle.year || vehicle.make || vehicle.model) ? vehicle : undefined,
        mileage: mileage.trim() || undefined,
        paidDate: statusChoice === 'paid' ? localDateStr() : '',
        paidHours: calcLineHours(normalizedVersion2Lines),
        laborType,
        workPerformed: normalizedVersion2Lines.map((line) => line.description).filter(Boolean).join('\n'),
        notes: notes?.trim() ? `${notes.trim()}\n\nSplit from RO #${roNumber}.` : `Split from RO #${roNumber}.`,
        date,
        photos: ro.photos,
        lines: normalizedVersion2Lines,
        isSimpleMode: false,
      });
      if (!newVersion || !('id' in newVersion)) return;

      setLines(normalizedRemainingLines);
      setShowSplitDialog(false);
      toast.success(`Split saved: created RO #${nextRONumber}`);
      onSave?.(newVersion.id);
    } catch (err: any) {
      toast.error(`Split failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col brand-shell-bg">
      <div className="px-4 py-3 space-y-3 bg-gradient-to-b from-card via-accent/35 to-card border-b border-border/50">
        <div className="grid grid-cols-1 gap-3 items-start">
          <div className="space-y-3 min-w-0">
            <div
              className="grid gap-2 p-2.5 rounded-lg border border-border/70 bg-card/95 shadow-[var(--shadow-soft)]"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70 mb-1">RO Number</p>
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={roNumber}
                    onChange={e => { setRoNumber(e.target.value); checkDuplicateRO(e.target.value); }}
                    onBlur={() => checkDuplicateRO(roNumber)}
                    placeholder="RO #"
                    className={cn("w-full h-8 px-2 bg-muted/40 rounded-md border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring", duplicateWarning ? "border-amber-500" : "border-input")}
                  />
                </div>
                {duplicateWarning && (
                  <span className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Duplicate RO #
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70 mb-1">RO Date</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="h-8 w-full px-2 bg-muted/40 rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70 mb-1">Advisor</p>
                <AdvisorCombobox
                  value={advisor} onChange={setAdvisor}
                  advisors={rangeFilteredAdvisors}
                  onCreateAdvisor={name => {
                    const newAdvisor = { id: Date.now().toString(), name };
                    updateAdvisors([...settings.advisors, newAdvisor]);
                  }}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70 mb-1">Labor Type</p>
                <select
                  value={laborType}
                  onChange={e => {
                    const newType = e.target.value as LaborType;
                    setLaborType(newType);
                    setLines(prev => prev.map(l => ({ ...l, laborType: newType, updatedAt: new Date().toISOString() })));
                  }}
                  className="h-8 w-full px-2 bg-muted/40 rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {LABOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-border/60 bg-card/92 shadow-[var(--shadow-soft)]">
              <DetailsCollapsible
                vehicle={vehicle} onVehicleChange={setVehicle}
                customerName={customerName} onCustomerNameChange={setCustomerName}
                mileage={mileage} onMileageChange={setMileage}
                paidDate={paidDate} onPaidDateChange={setPaidDate}
                open={showDetails} onOpenChange={setShowDetails}
                layout="desktop"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {isPro && (
                <button
                  onClick={() => setShowScanFlow(true)}
                  className="h-8 w-8 flex items-center justify-center bg-secondary rounded-md border border-border hover:bg-accent transition-colors"
                  title="Upload RO Photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
              {ro?.id && (
                <button
                  onClick={() => setShowSplitDialog(true)}
                  disabled={splittableLines.length < 2 || isSaving}
                  className={cn(
                    'h-8 px-2.5 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
                    splittableLines.length >= 2 && !isSaving
                      ? 'bg-secondary border-border hover:bg-accent text-foreground'
                      : 'bg-muted border-muted text-muted-foreground cursor-not-allowed',
                  )}
                  title={splittableLines.length >= 2 ? 'Split this RO into version 2' : 'Add more lines to split this RO'}
                >
                  <Split className="h-3.5 w-3.5" />
                  Split RO
                </button>
              )}
              {ro?.id && (
                <div className="relative" ref={flagPickerRef}>
                  <button
                    onClick={() => {
                      if (isFlagged) { setConfirmClearFlag(v => !v); setShowFlagPicker(false); }
                      else { setShowFlagPicker(v => !v); setConfirmClearFlag(false); }
                    }}
                    title={isFlagged ? 'Flagged — click to remove' : 'Flag this RO'}
                    className={cn(
                      'h-8 w-8 flex items-center justify-center rounded-md border transition-colors',
                      isFlagged
                        ? 'bg-orange-100 border-orange-300 text-orange-600 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400'
                        : 'bg-secondary border-border hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Flag className={cn('h-4 w-4', isFlagged && 'fill-current')} />
                  </button>
                  {showFlagPicker && (
                    <div className="absolute top-9 right-0 z-50 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[175px]">
                      {FLAG_OPTIONS.map(type => (
                        <button
                          key={type}
                          onClick={() => { addFlag(ro.id, type); setShowFlagPicker(false); }}
                          className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left', FLAG_TYPE_COLORS[type])}
                        >
                          <Flag className="h-3.5 w-3.5 flex-shrink-0" />
                          {FLAG_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  )}
                  {confirmClearFlag && (
                    <div className="absolute top-9 right-0 z-50 bg-popover border border-border rounded-xl shadow-lg p-3 min-w-[175px]">
                      <p className="text-xs font-medium mb-2 text-foreground">Remove flag from RO?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { roFlags.forEach(f => clearFlag(f.id)); setConfirmClearFlag(false); }}
                          className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => setConfirmClearFlag(false)}
                          className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <span className="basis-full text-[10px] font-medium text-muted-foreground">
                {ro ? 'Editing existing RO' : 'New RO intake'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="min-h-0 rounded-xl border border-border/70 bg-card shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
            {settings.presets.length > 0 && (
              <div className="flex-shrink-0 border-b border-border/50 bg-gradient-to-r from-accent/45 to-transparent px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground/75 mb-1">Quick Presets</p>
                <PresetSearchRail
                  presets={settings.presets}
                  animatingId={animatingPresetId}
                  layout="desktop"
                  onSelect={preset => {
                    setAnimatingPresetId(preset.id);
                    setTimeout(() => setAnimatingPresetId(null), 600);
                    const newLine: ROLine = {
                      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                      lineNo: 1,
                      description: preset.workTemplate || preset.name,
                      hoursPaid: preset.defaultHours || 0,
                      laborType: preset.laborType,
                      matchedReferenceId: preset.id,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    const updatedLines = [newLine, ...lines].map((l, i) => ({ ...l, lineNo: i + 1 }));
                    setLines(updatedLines);
                    setHighlightedLineIds([newLine.id]);
                    toast.success(`Added: ${preset.name} (${preset.defaultHours || 0}h)`);
                  }}
                />
              </div>
            )}
            <div className="p-3" ref={linesContainerRef}>
              <LinesGrid
                lines={lines} onLinesChange={setLines}
                presets={settings.presets}
                highlightedIds={highlightedLineIds}
                roVehicle={vehicle}
                showVehicleChips={false}
                defaultLaborType={laborType}
                onSaveAsPreset={handleSaveLineAsPreset}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card shadow-[var(--shadow-card)] p-3 flex flex-col gap-3">
            <div className="flex-1 flex flex-col min-h-0">
              <p className="text-[10px] uppercase tracking-[0.13em] font-semibold text-muted-foreground/75 mb-2 inline-flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" />
                Notes
              </p>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="flex-1 min-h-[120px] w-full p-3 bg-muted/20 rounded-md border border-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-2 bg-gradient-to-t from-card via-accent/20 to-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isNew && (
              <button
                onClick={() => handleSave(true)}
                disabled={!isValid || isSaving}
                className={cn(
                  'px-4 py-2 text-sm font-semibold rounded-md border transition-colors',
                  isValid && !isSaving ? 'border-primary text-primary hover:bg-primary/10' : 'border-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                Save + Add Another
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={!isValid || isSaving}
              className={cn(
                'px-5 py-2.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors shadow-sm',
                isValid && !isSaving ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {ro ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Scan Flow */}
      <ScanFlow
        isOpen={showScanFlow}
        onClose={() => setShowScanFlow(false)}
        onApply={handleScanApply}
        roId={ro?.id}
        hasExistingLines={lines.some(l => l.description.trim() !== '' || l.hoursPaid > 0)}
        existingLineDescriptions={lines.map(l => l.description)}
      />

      <PostSavePaidStatusPrompt
        open={postSaveStatusPrompt.statusPromptOpen}
        roNumber={postSaveStatusPrompt.statusPromptRONumber}
        isSaving={postSaveStatusPrompt.isSavingChoice}
        onChoose={postSaveStatusPrompt.resolveChoice}
      />
      <SplitRODialog
        open={showSplitDialog}
        roNumber={roNumber}
        lines={splittableLines}
        isSaving={isSaving}
        onOpenChange={setShowSplitDialog}
        onConfirm={handleSplitConfirm}
      />
    </div>
  );
}
