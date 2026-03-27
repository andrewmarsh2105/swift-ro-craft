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
    // Convert simple-mode RO to a line on load
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

  // RO cap — free users limited to RO_MONTHLY_CAP ROs/month.
  // Uses ro.date (local YYYY-MM-DD) so midnight-Pacific creates don't slip into
  // the wrong month due to UTC createdAt string comparisons.
  const monthlyROCount = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter(r => r.date && r.date >= monthStart).length;
  }, [ros]);
  const isAtCap = !isPro && !editingRO && monthlyROCount >= RO_MONTHLY_CAP;

  // Reset form when opening/closing or when editingRO changes
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

  // Calculate total hours from lines
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

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingRO ? 'Edit RO' : 'Quick Add'}
      fullScreen
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Scan RO Photo — pinned above scroll, Pro only */}
        {isPro && (
          <div className="px-4 pt-4 flex-shrink-0">
            <button
              onClick={onScanPhoto}
              className="w-full px-5 py-4 bg-primary rounded-2xl flex items-center gap-4 text-primary-foreground tap-target touch-feedback"
              style={{ boxShadow: '0 6px 20px -6px hsl(214 100% 46% / 0.55), 0 2px 6px -2px hsl(214 100% 46% / 0.25)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Camera className="h-6 w-6" />
              </div>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-base font-bold leading-tight">Scan RO Photo</span>
                <span className="text-xs opacity-70 leading-tight mt-0.5">Auto-fill from RO document</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-50 flex-shrink-0" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+9rem)]">
          {/* ── RO Details card: number · date · advisor grouped ── */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border/60" style={{ boxShadow: 'var(--shadow-card)' }}>
            {/* Card header */}
            <div className="px-4 pt-3 pb-2 border-b border-border/40 bg-primary/5 flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-primary opacity-70" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/80">RO Details</span>
            </div>

            {/* RO Number + Date */}
            <div className="px-4 pt-3.5 pb-3.5 grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">RO Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={roNumber}
                  onChange={(e) => setRoNumber(e.target.value.slice(0, 20))}
                  placeholder="Enter RO number"
                  maxLength={20}
                  className="w-full h-11 px-3.5 bg-background rounded-xl border border-border/70 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:font-normal placeholder:text-muted-foreground/50 transition-shadow"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date</label>
                <input
                  type="date"
                  value={roDate}
                  onChange={(e) => setRoDate(e.target.value)}
                  className="w-full h-11 px-2 bg-background rounded-xl border border-border/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-shadow"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/40 mx-4" />

            {/* Advisor */}
            <div className="px-4 pt-3.5 pb-4">
              <label className="block text-xs font-semibold text-muted-foreground mb-2.5">Advisor</label>
              <div className="flex flex-wrap gap-2">
                {[...settings.advisors].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8).map((adv) => (
                  <button
                    key={adv.id}
                    onClick={() => setAdvisor(advisor === adv.name ? '' : adv.name)}
                    className={cn(
                      'h-9 px-4 rounded-full text-sm font-medium transition-all border tap-target',
                      advisor === adv.name
                        ? 'bg-primary text-primary-foreground font-semibold border-primary'
                        : 'bg-background border-border/70 text-foreground'
                    )}
                    style={advisor === adv.name ? { boxShadow: '0 2px 8px -2px hsl(214 100% 46% / 0.35)' } : {}}
                  >
                    {adv.name}
                  </button>
                ))}
                {settings.advisors.length > 8 && (
                  <button
                    onClick={() => setShowAdvisorList(true)}
                    className="h-9 px-4 rounded-full text-sm font-medium border border-border/70 bg-background text-foreground tap-target"
                  >
                    More...
                  </button>
                )}
                <button
                  onClick={() => setShowAdvisorCreate((v) => !v)}
                  className={cn(
                    'h-9 px-4 rounded-full text-sm font-medium border transition-all inline-flex items-center gap-1.5 tap-target',
                    showAdvisorCreate
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-primary/50 text-primary bg-primary/5'
                  )}
                  style={showAdvisorCreate ? { boxShadow: '0 2px 8px -2px hsl(214 100% 46% / 0.35)' } : {}}
                >
                  + New advisor
                </button>
              </div>

              {showAdvisorCreate && (
                <div className="flex items-center gap-2 mt-2.5 p-2 rounded-xl border border-border bg-secondary/60">
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
                    placeholder="Type advisor name"
                    className="flex-1 h-10 px-3 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={saveAdvisorQuickly}
                    className="h-10 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                    aria-label="Add advisor"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Show selected advisor if not in quick chips */}
              {advisor && ![...settings.advisors].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8).find(a => a.name === advisor) && (
                <div className="flex items-center gap-2 mt-2.5 p-3 bg-primary/10 rounded-xl border border-primary/20">
                  <span className="font-semibold text-sm">{advisor}</span>
                  <button onClick={() => setAdvisor('')} className="ml-auto p-1 rounded-full hover:bg-primary/10">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Labor Type — color-coded 3-button grid ── */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Labor Type</span>
            <div className="grid grid-cols-3 gap-2">
              {([
                {
                  value: 'warranty' as LaborType,
                  label: 'Warranty',
                  activeBg: 'hsl(var(--status-warranty-bg))',
                  activeText: 'hsl(var(--status-warranty))',
                  activeBorder: 'hsl(var(--status-warranty) / 0.5)',
                  inactiveBg: 'hsl(148 68% 30% / 0.06)',
                  inactiveText: 'hsl(148 68% 25%)',
                  inactiveBorder: 'hsl(148 68% 30% / 0.2)',
                  dot: 'bg-[hsl(var(--status-warranty))]',
                },
                {
                  value: 'customer-pay' as LaborType,
                  label: 'Customer Pay',
                  activeBg: 'hsl(var(--status-customer-pay-bg))',
                  activeText: 'hsl(var(--status-customer-pay))',
                  activeBorder: 'hsl(var(--status-customer-pay) / 0.5)',
                  inactiveBg: 'hsl(200 84% 38% / 0.06)',
                  inactiveText: 'hsl(200 84% 30%)',
                  inactiveBorder: 'hsl(200 84% 38% / 0.2)',
                  dot: 'bg-[hsl(var(--status-customer-pay))]',
                },
                {
                  value: 'internal' as LaborType,
                  label: 'Internal',
                  activeBg: 'hsl(var(--status-internal-bg))',
                  activeText: 'hsl(var(--status-internal))',
                  activeBorder: 'hsl(var(--status-internal) / 0.5)',
                  inactiveBg: 'hsl(26 85% 42% / 0.06)',
                  inactiveText: 'hsl(26 85% 32%)',
                  inactiveBorder: 'hsl(26 85% 42% / 0.2)',
                  dot: 'bg-[hsl(var(--status-internal))]',
                },
              ]).map(({ value, label, activeBg, activeText, activeBorder, inactiveBg, inactiveText, inactiveBorder, dot }) => {
                const isActive = laborType === value;
                return (
                  <button
                    key={value}
                    onClick={() => setLaborType(value)}
                    className="h-11 rounded-xl text-sm transition-all border tap-target flex flex-col items-center justify-center gap-0.5"
                    style={isActive
                      ? { backgroundColor: activeBg, color: activeText, borderColor: activeBorder, fontWeight: 700 }
                      : { backgroundColor: inactiveBg, color: inactiveText, borderColor: inactiveBorder }
                    }
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full mb-0.5', dot, isActive ? 'opacity-100' : 'opacity-60')} />
                    <span className="font-semibold leading-none">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Presets + Lines ── */}
          <LineItemEditor
            lines={lines}
            onLinesChange={setLines}
            presets={settings.presets}
            showLaborType={false}
          />

          {/* Details Collapsible (Vehicle, Customer, Mileage, Paid Date, Notes) */}
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

        {/* Bottom Action Bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <div className="p-4 safe-bottom">
            <div className="flex gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={!isValid}
                className={cn(
                  'flex-1 h-11 rounded-full font-semibold text-sm min-h-[44px] transition-colors active:scale-[0.98]',
                  isValid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                Save
              </button>
              {!editingRO && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={!isValid}
                  className={cn(
                    'h-11 px-6 rounded-full font-medium text-sm border min-h-[44px] transition-colors active:scale-[0.98]',
                    isValid
                      ? 'border-primary text-primary'
                      : 'border-muted text-muted-foreground'
                  )}
                >
                  Save + Add
                </button>
              )}
            </div>
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
                'w-full p-4 rounded-xl text-left font-medium tap-target touch-feedback',
                advisor === adv.name ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              )}
            >
              {adv.name}
            </button>
          ))}

          {/* Add new advisor */}
          <div className="pt-4">
            <input
              type="text"
              placeholder="Add new advisor..."
              className="w-full h-14 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
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
            <p className="mt-1.5 text-xs text-muted-foreground px-1">Press Enter to save</p>
          </div>
        </div>
      </BottomSheet>

      <ProUpgradeDialog open={showProUpgrade} onOpenChange={setShowProUpgrade} trigger="ro-cap" />
    </BottomSheet>
  );
}
