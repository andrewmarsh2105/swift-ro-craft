import { useState, useEffect, useMemo } from 'react';
import { Camera, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { Chip } from '@/components/mobile/Chip';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { LineItemEditor, createEmptyLine } from '@/components/mobile/LineItemEditor';
import { DetailsCollapsible } from '@/components/shared/DetailsCollapsible';
import { useRO } from '@/contexts/ROContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { LaborType, RepairOrder, ROLine, VehicleInfo } from '@/types/ro';
import { cn, localDateStr } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingRO?: RepairOrder;
  onScanPhoto: () => void;
}

export function QuickAddSheet({ isOpen, onClose, editingRO, onScanPhoto }: QuickAddSheetProps) {
  const { settings, addRO, updateRO, ros } = useRO();
  const { isPro, startCheckout } = useSubscription();
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showAdvisorList, setShowAdvisorList] = useState(false);
  const [showCapSheet, setShowCapSheet] = useState(false);

  // Form state
  const [roNumber, setRoNumber] = useState(editingRO?.roNumber || '');
  const [advisor, setAdvisor] = useState(editingRO?.advisor || '');
  const [laborType, setLaborType] = useState<LaborType>(editingRO?.laborType || 'customer-pay');
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

  // RO cap (free users: 150 ROs/month)
  const RO_CAP = 150;
  const monthlyROCount = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return ros.filter(r => r.createdAt && r.createdAt >= monthStart).length;
  }, [ros]);
  const isAtCap = !isPro && !editingRO && monthlyROCount >= RO_CAP;

  // Reset form when opening/closing or when editingRO changes
  useEffect(() => {
    if (isOpen) {
      if (editingRO) {
        setRoNumber(editingRO.roNumber);
        setAdvisor(editingRO.advisor);
        setLaborType(editingRO.laborType);
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
  const linesTotalHours = lines.reduce((sum, line) => sum + line.hoursPaid, 0);

  const resetForm = () => {
    setRoNumber('');
    setAdvisor('');
    setLaborType('customer-pay');
    setNotes('');
    setLines([createEmptyLine(1)]);
    setShowMoreDetails(false);
    setPaidDate('');
    setCustomerName('');
    setVehicle({});
    setMileage('');
    setShowDetailsOpen(false);
  };

  const handleSave = async (addAnother: boolean = false) => {
    if (isAtCap) {
      setShowCapSheet(true);
      return;
    }

    const computedWorkPerformed = lines.map(l => l.description).filter(Boolean).join('\n');
    const roData = {
      roNumber,
      advisor,
      customerName: customerName.trim() || undefined,
      vehicle: (vehicle.year || vehicle.make || vehicle.model) ? vehicle : undefined,
      mileage: mileage.trim() || undefined,
      paidDate: paidDate.trim() || undefined,
      paidHours: linesTotalHours,
      laborType,
      workPerformed: computedWorkPerformed,
      notes,
      date: editingRO?.date || localDateStr(),
      photos: editingRO?.photos,
      lines,
      isSimpleMode: false,
    };

    try {
      if (editingRO) {
        await updateRO(editingRO.id, roData);
        toast.success('RO updated');
      } else {
        await addRO(roData);
        toast.success('RO saved');
      }

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

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingRO ? 'Edit RO' : 'Quick Add'}
      fullScreen
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Scan RO Photo Button — Pro only */}
          {isPro && (
            <button
              onClick={onScanPhoto}
              className="w-full py-4 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center gap-3 text-primary font-semibold tap-target touch-feedback"
            >
              <Camera className="h-6 w-6" />
              Scan RO Photo
            </button>
          )}

          {/* RO Number */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              RO Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={roNumber}
              onChange={(e) => setRoNumber(e.target.value)}
              placeholder="Enter RO number"
              className="w-full h-14 px-4 bg-secondary rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Advisor Selector */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Advisor
            </label>

            {/* Advisor chips from managed advisors */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[...settings.advisors].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5).map((adv) => (
                <Chip
                  key={adv.id}
                  label={adv.name.split(' ')[0]} // First name only
                  selected={advisor === adv.name}
                  onSelect={() => setAdvisor(advisor === adv.name ? '' : adv.name)}
                />
              ))}
              {settings.advisors.length > 5 && (
                <Chip
                  label="More..."
                  onSelect={() => setShowAdvisorList(true)}
                />
              )}
            </div>

            {/* Show selected advisor if not in first 5 */}
            {advisor && ![...settings.advisors].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5).find(a => a.name === advisor) && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl">
                <span className="font-medium">{advisor}</span>
                <button onClick={() => setAdvisor('')} className="ml-auto">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Labor Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Default Labor Type
            </label>
            <SegmentedControl
              options={[
                { value: 'warranty' as LaborType, label: 'Warranty' },
                { value: 'customer-pay' as LaborType, label: 'Customer Pay' },
                { value: 'internal' as LaborType, label: 'Internal' },
              ]}
              value={laborType}
              onChange={(value) => setLaborType(value as LaborType)}
            />
          </div>

          {/* Lines Mode: Line Item Editor */}
          <LineItemEditor
            lines={lines}
            onLinesChange={setLines}
            presets={settings.presets}
            showLaborType={false}
          />

          {/* Details Collapsible (Vehicle, Customer, Mileage, Paid Date) */}
          <div className="border border-border rounded-xl overflow-hidden">
            <DetailsCollapsible
              vehicle={vehicle}
              onVehicleChange={setVehicle}
              customerName={customerName}
              onCustomerNameChange={setCustomerName}
              mileage={mileage}
              onMileageChange={setMileage}
              paidDate={paidDate}
              onPaidDateChange={setPaidDate}
              open={showDetailsOpen}
              onOpenChange={setShowDetailsOpen}
              layout="mobile"
            />
          </div>

          {/* Notes Accordion */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="w-full p-4 flex items-center justify-between touch-feedback"
            >
              <span className="font-medium">Notes</span>
              {showMoreDetails ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {showMoreDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 space-y-4">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={3}
                      className="w-full p-4 bg-secondary rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 p-4 bg-card border-t border-border safe-bottom">
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={!isValid}
              className={cn(
                'flex-1 py-4 rounded-xl font-semibold tap-target touch-feedback transition-colors',
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
                  'py-4 px-6 rounded-xl font-semibold tap-target touch-feedback border-2 transition-colors',
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

          {/* Custom advisor input */}
          <div className="pt-4">
            <input
              type="text"
              placeholder="Add new advisor..."
              className="w-full h-14 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  setAdvisor(e.currentTarget.value.trim());
                  setShowAdvisorList(false);
                }
              }}
            />
          </div>
        </div>
      </BottomSheet>

      {/* Cap Sheet */}
      <BottomSheet isOpen={showCapSheet} onClose={() => setShowCapSheet(false)} title="Monthly Limit Reached">
        <div className="p-6 space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            You've created {monthlyROCount} ROs this month. Free accounts are limited to {RO_CAP}/month.
          </p>
          <button
            onClick={() => { setShowCapSheet(false); startCheckout(); }}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm min-h-[44px]"
          >
            Upgrade to Pro — $8.99/mo
          </button>
          <button onClick={() => setShowCapSheet(false)} className="w-full py-2 text-muted-foreground text-sm min-h-[44px]">
            Maybe later
          </button>
        </div>
      </BottomSheet>
    </BottomSheet>
  );
}
