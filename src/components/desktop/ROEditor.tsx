import { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Save, Plus, Calendar, Clock, FileText, Loader2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { localDateStr } from '@/lib/utils';
import { LinesGrid, createEmptyLine } from './LinesGrid';
import { AdvisorCombobox } from './AdvisorCombobox';
import { StatusPill } from '@/components/mobile/StatusPill';
import { ScanFlow, type ScanApplyData } from '@/components/scan/ScanFlow';
import { DetailsCollapsible } from '@/components/shared/DetailsCollapsible';
import { PresetSearchRail } from '@/components/shared/PresetSearchRail';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { EmptyState } from '@/components/states/EmptyState';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import type { LaborType, ROLine, RepairOrder, VehicleInfo } from '@/types/ro';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ROEditorProps {
  ro?: RepairOrder | null;
  isNew?: boolean;
  focusLineId?: string | null;
  onSave?: () => void;
  onCancel?: () => void;
  onSaveAndAddAnother?: () => void;
}

const LABOR_TYPES: { value: LaborType; label: string }[] = [
  { value: 'warranty', label: 'Warranty' },
  { value: 'customer-pay', label: 'Customer Pay' },
  { value: 'internal', label: 'Internal' },
];

export function ROEditor({ ro, isNew = false, focusLineId, onSave, onCancel, onSaveAndAddAnother }: ROEditorProps) {
  const { settings, addRO, updateRO, updateAdvisors, ros } = useRO();
  const { userSettings } = useFlagContext();
  const { isPro, startCheckout } = useSubscription();

  // RO cap
  const monthlyROCount = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter(r => r.createdAt && r.createdAt >= monthStart).length;
  }, [ros]);
  const RO_CAP = 150;
  const isAtCap = !isPro && isNew && monthlyROCount >= RO_CAP;

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
  const linesContainerRef = useRef<HTMLDivElement | null>(null);

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

  const totalHours = lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0);
  const tbdCount = lines.filter(l => l.isTbd).length;
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

  const handleSave = async (addAnother: boolean = false) => {
    if (!roNumber.trim()) { toast.error('RO number is required'); return; }
    if (!advisor.trim()) { toast.error('Advisor is required'); return; }

    if (isAtCap) {
      toast.error(`Monthly limit reached (${RO_CAP} ROs). Upgrade to Pro for unlimited.`);
      startCheckout();
      return;
    }

    const computedWorkPerformed = lines.map(l => l.description).filter(Boolean).join('\n');
    const roData = {
      roNumber, advisor,
      customerName: customerName.trim() || undefined,
      vehicle: (vehicle.year || vehicle.make || vehicle.model) ? vehicle : undefined,
      mileage: mileage.trim() || undefined,
      paidDate: paidDate.trim() || (ro ? '' : undefined),
      paidHours: totalHours, laborType,
      workPerformed: computedWorkPerformed, notes, date,
      photos: ro?.photos, lines, isSimpleMode: false,
    };

    setIsSaving(true);
    try {
      if (ro) {
        await updateRO(ro.id, roData);
        toast.success('RO updated');
      } else {
        await addRO(roData);
        toast.success('RO created');
      }
      if (addAnother) {
        setRoNumber(''); setCustomerName(''); setNotes(''); setPaidDate('');
        setLines([createEmptyLine(1)]); setShowDetails(false);
        onSaveAndAddAnother?.();
      } else {
        onSave?.();
      }
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Strip */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-2.5 space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={roNumber}
              onChange={e => setRoNumber(e.target.value)}
              placeholder="RO #"
              className="w-24 h-8 px-2 bg-muted rounded-md border border-input text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground">RO Date</span>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="h-8 px-2 bg-muted rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <AdvisorCombobox
            value={advisor} onChange={setAdvisor}
            advisors={settings.advisors}
            onCreateAdvisor={name => {
              const newAdvisor = { id: Date.now().toString(), name };
              updateAdvisors([...settings.advisors, newAdvisor]);
            }}
          />

          <select
            value={laborType}
            onChange={e => {
              const newType = e.target.value as LaborType;
              setLaborType(newType);
              setLines(prev => prev.map(l => ({ ...l, laborType: newType, updatedAt: new Date().toISOString() })));
            }}
            className="h-8 px-2 bg-muted rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {LABOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <div className="ml-auto flex items-center gap-3 flex-shrink-0">
            {isPro && (
              <button
                onClick={() => setShowScanFlow(true)}
                className="h-8 w-8 flex items-center justify-center bg-secondary rounded-md border border-border hover:bg-accent transition-colors"
                title="Upload RO Photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xl font-bold text-primary tabular-nums">{totalHours.toFixed(1)}h</span>
              {tbdCount > 0 && (
                <span className="text-xs text-destructive font-medium">({tbdCount} TBD)</span>
              )}
            </div>
          </div>
        </div>

        <DetailsCollapsible
          vehicle={vehicle} onVehicleChange={setVehicle}
          customerName={customerName} onCustomerNameChange={setCustomerName}
          mileage={mileage} onMileageChange={setMileage}
          paidDate={paidDate} onPaidDateChange={setPaidDate}
          open={showDetails} onOpenChange={setShowDetails}
          layout="desktop"
        />
      </div>

      {/* Presets */}
      {settings.presets.length > 0 && (
        <div className="flex-shrink-0 border-b border-border bg-muted/30 px-4 py-2">
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

      {/* Lines */}
      <div className="flex-1 overflow-y-auto p-4" ref={linesContainerRef}>
        <LinesGrid
          lines={lines} onLinesChange={setLines}
          presets={settings.presets}
          highlightedIds={highlightedLineIds}
          roVehicle={vehicle}
          showVehicleChips={false}
          defaultLaborType={laborType}
        />
        <div className="mt-4">
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            className="w-full p-3 bg-muted rounded-md border border-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {isNew && (
              <button
                onClick={() => handleSave(true)}
                disabled={!isValid || isSaving}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md border transition-colors',
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
                'px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors',
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
    </div>
  );
}
