import { useState, useEffect, useMemo } from 'react';
import { Camera, X, UserPlus, ChevronRight } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { LineItemEditor, createEmptyLine } from '@/components/mobile/LineItemEditor';
import { DetailsCollapsible } from '@/components/shared/DetailsCollapsible';
import { ProUpgradeDialog } from '@/components/ProUpgradeDialog';
import { useRO } from '@/contexts/ROContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { LaborType, RepairOrder, ROLine, VehicleInfo } from '@/types/ro';
import { cn, localDateStr } from '@/lib/utils';
import { RO_MONTHLY_CAP } from '@/lib/proFeatures';
import { toast } from 'sonner';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingRO?: RepairOrder;
  onScanPhoto: () => void;
}

export function QuickAddSheet({ isOpen, onClose, editingRO, onScanPhoto }: QuickAddSheetProps) {
  const { settings, addRO, updateRO, updateAdvisors, ros } = useRO();
  const { isPro } = useSubscription();
  const [showAdvisorList, setShowAdvisorList] = useState(false);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const [advisorDraft, setAdvisorDraft] = useState('');
  const [showAdvisorCreate, setShowAdvisorCreate] = useState(false);

  // Form state
  const [roNumber, setRoNumber] = useState(editingRO?.roNumber || '');
  const [advisor, setAdvisor] = useState(editingRO?.advisor || '');
  const [laborType, setLaborType] = useState<LaborType>(editingRO?.laborType || 'customer-pay');
  const [roDate, setRoDate] = useState(editingRO?.date || localDateStr());
  const [notes, setNotes] = useState(editingRO?.notes || '');
  const [lines, setLines] = useState<ROLine[]>(() => {
    if (editingRO?.lines?.length) return editingRO.lines;
    if (editingRO?.isSimpleMode && (editingRO.paidHours > 0 || editingRO.workPerformed)) {
      return [{
        id: Date.now().toString(),
        lineNo: 1,
        description: editingRO.workPerformed,
        hoursPaid: editingRO.paidHours,
        laborType: editingRO.laborType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
    }
    return [createEmptyLine(1)];
  });
  const [paidDate, setPaidDate] = useState(editingRO?.paidDate || '');
  const [customerName, setCustomerName] = useState(editingRO?.customerName || '');
  const [vehicle, setVehicle] = useState<VehicleInfo>(editingRO?.vehicle || {});
  const [mileage, setMileage] = useState(editingRO?.mileage || '');
  const [showDetailsOpen, setShowDetailsOpen] = useState(false);

  const monthlyROCount = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter(r => r.date && r.date >= monthStart).length;
  }, [ros]);
  const isAtCap = !isPro && !editingRO && monthlyROCount >= RO_MONTHLY_CAP;

  useEffect(() => {
    if (isOpen) {
      if (editingRO) {
        setRoNumber(editingRO.roNumber);
        setAdvisor(editingRO.advisor);
        setLaborType(editingRO.laborType);
        setRoDate(editingRO.date || localDateStr());
        setNotes(editingRO.notes || '');
        if (editingRO.lines?.length) {
          setLines(editingRO.lines);
        } else if (editingRO.isSimpleMode && (editingRO.paidHours > 0 || editingRO.workPerformed)) {
          setLines([{
            id: Date.now().toString(),
            lineNo: 1,
            description: editingRO.workPerformed,
            hoursPaid: editingRO.paidHours,
            laborType: editingRO.laborType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }]);
        } else {
          setLines([createEmptyLine(1)]);
        }
        setPaidDate(editingRO.paidDate || '');
        setCustomerName(editingRO.customerName || '');
        setVehicle(editingRO.vehicle || {});
        setMileage(editingRO.mileage || '');
        setShowDetailsOpen(!!(editingRO.paidDate || editingRO.customerName || editingRO.mileage || editingRO.vehicle?.year || editingRO.vehicle?.make));
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingRO]);

  const linesTotalHours = lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0);

  const resetForm = () => {
    setRoNumber('');
    setAdvisor('');
    setLaborType('customer-pay');
    setRoDate(localDateStr());
    setNotes('');
    setLines([createEmptyLine(1)]);
    setPaidDate('');
    setCustomerName('');
    setVehicle({});
    setMileage('');
    setShowDetailsOpen(false);
  };

  const handleSave = async (addAnother: boolean = false) => {
    if (isAtCap) {
      setShowProUpgrade(true);
      return;
    }

    const computedWorkPerformed = lines.map(l => l.description).filter(Boolean).join('\n');
    const roData = {
      roNumber,
      advisor,
      customerName: customerName.trim() || undefined,
      vehicle: (vehicle.year || vehicle.make || vehicle.model) ? vehicle : undefined,
      mileage: mileage.trim() || undefined,
      paidDate: paidDate.trim() || null,
      paidHours: linesTotalHours,
      laborType,
      workPerformed: computedWorkPerformed,
      notes,
      date: roDate || localDateStr(),
      photos: editingRO?.photos,
      lines,
      isSimpleMode: false,
    };

    try {
      if (editingRO) {
        const success = await updateRO(editingRO.id, roData);
        if (!success) return;
        toast.success('RO updated');
      } else {
        const saved = await addRO(roData);
        if (!saved) return;
        toast.success('RO saved');
      }
      haptics.success();

      if (addAnother) {
        resetForm();
      } else {
        onClose();
        resetForm();
      }
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}. Try again.`);
    }
  };

  const isValid = roNumber.trim() !== '';

  const saveAdvisorQuickly = async () => {
    const trimmed = advisorDraft.trim();
    if (!trimmed) return;

    const existing = settings.advisors.find(a => a.name.toLowerCase() === trimmed.toLowerCase());
    if (!existing) {
      await updateAdvisors([...settings.advisors, { id: Date.now().toString(), name: trimmed }]);
      toast.success(`Advisor "${trimmed}" added`);
    }

    setAdvisor(trimmed);
    setAdvisorDraft('');
    setShowAdvisorCreate(false);
  };

  const LABOR_TYPES = [
    {
      value: 'warranty' as LaborType,
      fullLabel: 'Warranty',
      dotColor: 'hsl(var(--status-warranty))',
    },
    {
      value: 'customer-pay' as LaborType,
      fullLabel: 'Customer Pay',
      dotColor: 'hsl(var(--status-customer-pay))',
    },
    {
      value: 'internal' as LaborType,
      fullLabel: 'Internal',
      dotColor: 'hsl(var(--status-internal))',
    },
  ];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingRO ? 'Edit RO' : 'Quick Add'}
      fullScreen
    >
      <div className="flex flex-col h-full min-h-0">

        {/* ══════════════ Scan CTA — hero action, pinned above scroll ══════════════ */}
        {isPro && (
          <div className="px-4 pt-4 pb-1.5 flex-shrink-0">
            <button
              onClick={onScanPhoto}
              className="w-full rounded-2xl flex items-center gap-4 px-4 py-4 active:scale-[0.99] transition-transform"
              style={{
                background: 'linear-gradient(135deg, hsl(220 61% 14%) 0%, hsl(214 80% 26%) 100%)',
                boxShadow: '0 6px 24px -6px hsl(214 100% 46% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.09)',
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'hsl(0 0% 100% / 0.12)', border: '1px solid hsl(0 0% 100% / 0.15)' }}
              >
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[15px] font-bold text-white leading-tight block">Scan RO Photo</span>
                <span className="text-[12px] text-white/55 mt-0.5 leading-tight block">Auto-fill from document</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-[10px] font-bold tracking-[0.06em] text-white/65 px-2 py-0.5 rounded-full"
                  style={{ background: 'hsl(0 0% 100% / 0.1)', border: '1px solid hsl(0 0% 100% / 0.15)' }}
                >
                  PRO
                </span>
                <ChevronRight className="h-4 w-4 text-white/35" />
              </div>
            </button>
          </div>
        )}

        {/* ══════════════ Scrollable body ══════════════ */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+9rem)] space-y-3">

          {/* ── Section 1: RO Basics — unified card ── */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>

            {/* RO# + Date */}
            <div className="px-4 pt-4 pb-3.5 flex gap-3">
              <div className="flex-[3] min-w-0">
                <label className="block text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55 mb-1.5">
                  RO Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={roNumber}
                  onChange={(e) => setRoNumber(e.target.value.slice(0, 20))}
                  placeholder="00000"
                  maxLength={20}
                  className="w-full h-11 px-3.5 bg-muted/40 rounded-xl border border-transparent text-xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/35 focus:bg-background/60 placeholder:font-normal placeholder:text-muted-foreground/30 transition-all"
                />
              </div>
              <div className="flex-[2] min-w-0">
                <label className="block text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={roDate}
                  onChange={(e) => setRoDate(e.target.value)}
                  className="w-full h-11 px-3 bg-muted/40 rounded-xl border border-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/35 focus:bg-background/60 transition-all"
                />
              </div>
            </div>

            <div className="h-px bg-border/20 mx-4" />

            {/* Advisor */}
            <div className="px-4 py-3.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55 mb-2.5">
                Advisor
              </div>
              <div className="flex flex-wrap gap-2">
                {[...settings.advisors].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8).map((adv) => (
                  <button
                    key={adv.id}
                    onClick={() => setAdvisor(advisor === adv.name ? '' : adv.name)}
                    className={cn(
                      'h-8 px-3.5 rounded-full text-[13px] font-medium transition-all border tap-target active:scale-[0.97]',
                      advisor === adv.name
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent border-border/60 text-foreground/75 hover:border-foreground/30 hover:bg-muted/30'
                    )}
                  >
                    {adv.name}
                  </button>
                ))}
                {settings.advisors.length > 8 && (
                  <button
                    onClick={() => setShowAdvisorList(true)}
                    className="h-8 px-3 rounded-full text-[13px] font-medium border border-border/50 bg-muted/20 text-muted-foreground tap-target"
                  >
                    More…
                  </button>
                )}
                <button
                  onClick={() => setShowAdvisorCreate((v) => !v)}
                  className={cn(
                    'h-8 w-8 rounded-full border transition-all flex items-center justify-center tap-target active:scale-[0.97]',
                    showAdvisorCreate
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-dashed border-foreground/30 text-foreground/40 hover:border-foreground/50 hover:text-foreground/60'
                  )}
                  aria-label="Add new advisor"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
              </div>

              {showAdvisorCreate && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={advisorDraft}
                    onChange={(e) => setAdvisorDraft(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        await saveAdvisorQuickly();
                      }
                    }}
                    placeholder="Full name"
                    autoFocus
                    className="flex-1 h-9 px-3 rounded-lg bg-muted/50 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <button
                    onClick={saveAdvisorQuickly}
                    className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium active:scale-[0.97] transition-transform flex items-center gap-1.5"
                    aria-label="Add advisor"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="text-xs">Add</span>
                  </button>
                </div>
              )}

              {advisor && ![...settings.advisors].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8).find(a => a.name === advisor) && (
                <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-muted/40 rounded-xl border border-border/40">
                  <span className="font-medium text-sm">{advisor}</span>
                  <button onClick={() => setAdvisor('')} className="ml-auto p-1 rounded-full hover:bg-muted">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            <div className="h-px bg-border/20 mx-4" />

            {/* Labor Type — iOS-style segmented control track */}
            <div className="px-4 py-3.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/55 mb-2.5">
                Labor Type
              </div>
              <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/25">
                {LABOR_TYPES.map(({ value, fullLabel, dotColor }) => {
                  const isActive = laborType === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setLaborType(value)}
                      className={cn(
                        'flex-1 h-9 rounded-[10px] text-xs font-semibold transition-all tap-target flex items-center justify-center gap-1.5',
                        isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground/60'
                      )}
                      style={isActive ? {
                        boxShadow: '0 1px 3px hsl(0 0% 0% / 0.09), 0 0 0 0.5px hsl(var(--border) / 0.4)',
                      } : {}}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dotColor, opacity: isActive ? 1 : 0.4 }}
                      />
                      <span
                        className="transition-colors"
                        style={{ color: isActive ? dotColor : undefined }}
                      >
                        {fullLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Section separator ── */}
          <div className="flex items-center gap-3 px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground/40 flex-shrink-0">Work Lines</span>
            <div className="flex-1 h-px bg-border/25" />
          </div>

          {/* ── Section 2: Presets + Lines ── */}
          <LineItemEditor
            lines={lines}
            onLinesChange={setLines}
            presets={settings.presets}
            showLaborType={false}
          />

          {/* ── Section 4: Details ── */}
          <DetailsCollapsible
            vehicle={vehicle}
            onVehicleChange={setVehicle}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            mileage={mileage}
            onMileageChange={setMileage}
            paidDate={paidDate}
            onPaidDateChange={setPaidDate}
            notes={notes}
            onNotesChange={setNotes}
            open={showDetailsOpen}
            onOpenChange={setShowDetailsOpen}
            layout="mobile"
          />
        </div>

        {/* ══════════════ Bottom Save Bar ══════════════ */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85"
          style={{ borderTop: '1px solid hsl(var(--border) / 0.5)', boxShadow: '0 -4px 16px -4px hsl(220 20% 10% / 0.08)' }}
        >
          <div className="px-4 py-3 safe-bottom flex items-center gap-2.5">
            {/* Live summary pill */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40">
                <span className="text-sm font-bold tabular-nums leading-none">
                  {linesTotalHours.toFixed(1)}h
                </span>
                <div className="w-px h-3 bg-border" />
                <span className="text-xs text-muted-foreground leading-none">
                  {lines.length} {lines.length === 1 ? 'line' : 'lines'}
                </span>
              </div>
            </div>

            {/* Save + Add */}
            {!editingRO && (
              <button
                onClick={() => handleSave(true)}
                disabled={!isValid}
                className={cn(
                  'h-11 px-4 rounded-full font-medium text-sm border min-h-[44px] transition-all active:scale-[0.98]',
                  isValid
                    ? 'border-primary/35 text-primary hover:bg-primary/5'
                    : 'border-muted text-muted-foreground'
                )}
              >
                + Add
              </button>
            )}

            {/* Save */}
            <button
              onClick={() => handleSave(false)}
              disabled={!isValid}
              className={cn(
                'h-11 px-7 rounded-full font-bold text-sm min-h-[44px] transition-all active:scale-[0.98]',
                isValid
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
              style={isValid ? { boxShadow: '0 2px 12px -3px hsl(var(--primary) / 0.45)' } : {}}
            >
              {editingRO ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Advisor List Sheet */}
      <BottomSheet
        isOpen={showAdvisorList}
        onClose={() => setShowAdvisorList(false)}
        title="Select Advisor"
      >
        <div className="p-4 space-y-2">
          {[...settings.advisors].sort((a, b) => a.name.localeCompare(b.name)).map((adv) => (
            <button
              key={adv.id}
              onClick={() => {
                setAdvisor(adv.name);
                setShowAdvisorList(false);
              }}
              className={cn(
                'w-full p-3.5 rounded-xl text-left font-medium tap-target touch-feedback text-sm',
                advisor === adv.name ? 'bg-primary text-primary-foreground' : 'bg-muted/60 border border-border/50'
              )}
            >
              {adv.name}
            </button>
          ))}

          <div className="pt-3">
            <input
              type="text"
              placeholder="Add new advisor..."
              className="w-full h-12 px-4 bg-muted/50 rounded-xl border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              onKeyDown={(e) => {
                const name = e.currentTarget.value.trim();
                if (e.key === 'Enter' && name) {
                  if (!settings.advisors.some(a => a.name.toLowerCase() === name.toLowerCase())) {
                    updateAdvisors([...settings.advisors, { id: Date.now().toString(), name }]);
                    toast.success(`Advisor "${name}" created`);
                  }
                  setAdvisor(name);
                  setShowAdvisorList(false);
                }
              }}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground px-1">Press Enter to save</p>
          </div>
        </div>
      </BottomSheet>

      <ProUpgradeDialog open={showProUpgrade} onOpenChange={setShowProUpgrade} trigger="ro-cap" />
    </BottomSheet>
  );
}
