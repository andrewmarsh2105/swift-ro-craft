import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, ArrowLeft, Upload, Loader2, Plus, Calendar, CalendarCheck, User, Clock, ChevronDown, ChevronUp, FileText, Settings2, Image, X } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { localDateStr } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CompactLinesGrid, createEmptyLine } from '@/components/mobile/CompactLinesGrid';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { ScanFlow, type ScanApplyData } from '@/components/scan/ScanFlow';
import { useRO } from '@/contexts/ROContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { LaborType, ROLine, VehicleInfo } from '@/types/ro';
import { cn } from '@/lib/utils';
import { formatVehicleChip } from '@/types/ro';
import { useFlagContext } from '@/contexts/FlagContext';
import { toast } from 'sonner';
import { DetailsCollapsible } from '@/components/shared/DetailsCollapsible';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Desktop imports
import { DesktopWorkspace } from '@/components/desktop/DesktopWorkspace';

const LABOR_TYPES: { value: LaborType; label: string; short: string }[] = [
  { value: 'warranty', label: 'Warranty', short: 'W' },
  { value: 'customer-pay', label: 'Customer Pay', short: 'CP' },
  { value: 'internal', label: 'Internal', short: 'Int' },
];

export default function AddRO() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { settings, addRO, updateRO, updateAdvisors, ros } = useRO();
  const { userSettings } = useFlagContext();
  const { isPro, startCheckout } = useSubscription();
  // Get editing RO from location state
  const editingROId = (location.state as { editingROId?: string; focusLineId?: string })?.editingROId;
  const focusLineId = (location.state as { editingROId?: string; focusLineId?: string })?.focusLineId;
  const editingRO = editingROId ? ros.find(r => r.id === editingROId) : undefined;

  const [showAdvisorList, setShowAdvisorList] = useState(false);
  const [advisorSearch, setAdvisorSearch] = useState('');
  const [showScanFlow, setShowScanFlow] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [highlightedLineIds, setHighlightedLineIds] = useState<string[]>([]);
  const [recentlyAddedPresets, setRecentlyAddedPresets] = useState<string[]>([]);
  const [showCapSheet, setShowCapSheet] = useState(false);

  // RO cap: count ROs created this calendar month
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
    if (editingRO?.lines?.length) {
      return editingRO.lines;
    }
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

  // Lock body scroll when this page is mounted (mobile only)
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile]);

  // Clear highlights after 2.5 seconds
  useEffect(() => {
    if (highlightedLineIds.length > 0) {
      const timer = setTimeout(() => {
        setHighlightedLineIds([]);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedLineIds]);

  // Focus + highlight a specific line when navigated from Flag Inbox
  useEffect(() => {
    if (!focusLineId) return;
    setHighlightedLineIds([focusLineId]);
    const timer = setTimeout(() => {
      const el = linesContainerRef.current?.querySelector(`[data-line-id="${focusLineId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [focusLineId]);

  // Calculate total hours from lines (exclude TBD)
  const totalHours = lines.filter(l => !l.isTbd).reduce((sum, line) => sum + line.hoursPaid, 0);
  const tbdCount = lines.filter(l => l.isTbd).length;

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
      // Prepend: add at top
      setLines(prev => {
        const filtered = prev.filter(l => l.description || l.hoursPaid > 0);
        return [...data.lines, ...filtered].map((l, i) => ({ ...l, lineNo: i + 1 }));
      });
    }

    setHighlightedLineIds(newLineIds);
    setShowScanFlow(false);

    // Scroll to top to show new lines
    setTimeout(() => {
      linesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleAddLine = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    const newLine = createEmptyLine(1);
    const updatedLines = [newLine, ...lines].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    setLines(updatedLines);
    setHighlightedLineIds([newLine.id]);
    toast.success('New line added');
  };

  const handlePresetAdd = (presetId: string, presetName: string, hours: number, newLineId: string) => {
    setHighlightedLineIds([newLineId]);
    setRecentlyAddedPresets(prev => {
      const updated = [presetId, ...prev.filter(id => id !== presetId)].slice(0, 3);
      return updated;
    });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (addAnother: boolean = false) => {
    const computedWorkPerformed = lines.map(l => l.description).filter(Boolean).join('\n');
    
    const roData = {
      roNumber,
      advisor,
      customerName: customerName.trim() || undefined,
      vehicle: (vehicle.year || vehicle.make || vehicle.model) ? vehicle : undefined,
      mileage: mileage.trim() || undefined,
      paidDate: paidDate.trim() || (editingRO ? '' : undefined),
      paidHours: totalHours,
      laborType,
      workPerformed: computedWorkPerformed,
      notes,
      date,
      photos: editingRO?.photos,
      lines,
      isSimpleMode: false,
    };

    // Check RO cap for free users
    if (isAtCap) {
      setShowCapSheet(true);
      return;
    }

    setIsSaving(true);
    try {
      if (editingRO) {
        await updateRO(editingRO.id, roData);
        toast.success('RO updated');
      } else {
        await addRO(roData);
        toast.success('RO created');
      }

      if (addAnother) {
        setRoNumber('');
        setCustomerName('');
        setNotes('');
        setPaidDate('');
        setLines([createEmptyLine(1)]);
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}. Your data is still here — try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = roNumber.trim() !== '';

  // Desktop: Use the full workspace instead
  if (!isMobile) {
    return <DesktopWorkspace />;
  }

  // Mobile layout
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top Header Bar - Compact */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 h-12 border-b border-border bg-card safe-top">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-primary font-medium min-w-[44px] min-h-[44px] justify-center -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">
          {editingRO ? 'Edit RO' : 'Add RO'}
        </h1>
        {isPro && (
          <button
            onClick={() => setShowScanFlow(true)}
            className="flex items-center gap-1 text-primary font-medium min-w-[44px] min-h-[44px] justify-center -mr-2"
          >
            <Camera className="h-5 w-5" />
          </button>
        )}
        {!isPro && <div className="min-w-[44px]" />}
      </header>

      {/* Minimal Sticky RO Header Strip - Only essential fields */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        {/* Primary row: RO #, Advisor, Date, Total */}
        <div className="px-3 py-2 flex items-center gap-2">
          {/* RO # */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              inputMode="numeric"
              value={roNumber}
              onChange={(e) => setRoNumber(e.target.value)}
              placeholder="RO #"
              className="w-20 h-8 px-2 bg-muted rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Advisor */}
          <button
            onClick={() => setShowAdvisorList(true)}
            className={cn(
              'flex-1 h-8 px-2 rounded text-xs text-left flex items-center gap-1.5 min-w-0 truncate',
              advisor ? 'bg-muted font-medium' : 'bg-muted/50 text-muted-foreground'
            )}
          >
            <User className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{advisor || 'Advisor'}</span>
          </button>
          
          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 px-1.5 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary w-[100px] flex-shrink-0"
          />
          
          {/* Total Hours - Prominent */}
          <div className="flex items-center gap-1 px-2 py-1 bg-primary rounded flex-shrink-0">
            <span className="text-sm font-bold text-primary-foreground">{totalHours.toFixed(1)}h</span>
          </div>
        </div>

        {/* Details collapsed summary row */}
        <DetailsCollapsible
          vehicle={vehicle}
          onVehicleChange={setVehicle}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          mileage={mileage}
          onMileageChange={setMileage}
          open={showMoreFields}
          onOpenChange={setShowMoreFields}
          layout="mobile"
        />

        {/* Paid Date - Distinct row outside collapsible */}
        <div className="px-3 py-1.5 border-t border-border/50">
          {paidDate ? (
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-medium text-foreground">Paid:</span>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="h-7 px-1.5 bg-muted rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => setPaidDate('')}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Clear paid date"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                // Set to today and let user change
                setPaidDate(localDateStr());
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Paid on a different day? Tap to set</span>
            </button>
          )}
        </div>

        {/* Collapsible More Fields (Labor Type, Notes) */}
        <Collapsible open={showMoreFields} onOpenChange={setShowMoreFields}>
          <CollapsibleContent>
            <div className="px-3 py-2 space-y-2 bg-muted/20">
              {/* Labor Type */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Labor</span>
                <select
                  value={laborType}
                  onChange={(e) => setLaborType(e.target.value as LaborType)}
                  className="flex-1 h-8 px-2 bg-muted rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {LABOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {/* Notes */}
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-16 pt-2">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  className="flex-1 p-2 bg-muted rounded text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Presets Toolbar - Single row with recent chips inline */}
      {settings.presets.length > 0 && (
        <div className="flex-shrink-0 border-b border-border bg-muted/20 px-2 py-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {/* Recent chips (smaller, inline) */}
            {recentlyAddedPresets.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">Recent:</span>
                {recentlyAddedPresets.map(id => {
                  const preset = settings.presets.find(p => p.id === id);
                  return preset ? (
                    <span key={id} className="flex-shrink-0 px-1.5 py-0.5 bg-primary/20 rounded text-[10px] text-primary font-medium">
                      {preset.name}
                    </span>
                  ) : null;
                })}
                <div className="w-px h-4 bg-border flex-shrink-0 mx-1" />
              </>
            )}
            {/* Preset buttons */}
            {settings.presets.map((preset) => (
              <PresetButton
                key={preset.id}
                preset={preset}
                onAdd={(newLineId) => {
                  const newLine: ROLine = {
                    id: newLineId,
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
                  handlePresetAdd(preset.id, preset.name, preset.defaultHours || 0, newLineId);
                  toast.success(`Added: ${preset.name} (${preset.defaultHours || 0}h)`);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Content - Lines Grid */}
      <main ref={linesContainerRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-3 pb-48">
          {/* Compact Lines Grid */}
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

      {/* Sticky Add Line Button */}
      <div className="fixed bottom-[140px] left-3 right-3 z-40 safe-bottom">
        <button
          onClick={handleAddLine}
          className="w-auto mx-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-muted-foreground hover:text-primary bg-muted/60 hover:bg-muted active:scale-[0.96] transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line
        </button>
      </div>

      {/* Sticky Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
        {/* Total Hours */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Total ({lines.length} lines)
            {tbdCount > 0 && (
              <span className="ml-1 text-warning">• {tbdCount} TBD</span>
            )}
          </span>
          <span className="text-xl font-bold text-primary">{totalHours.toFixed(1)}h</span>
        </div>
        
        {/* Action Buttons */}
        <div className="p-3 flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={!isValid || isSaving}
            className={cn(
              'flex-1 py-3 rounded-xl font-semibold text-sm min-h-[44px] transition-colors active:scale-[0.98]',
              isValid && !isSaving
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          {!editingRO && (
            <button
              onClick={() => handleSave(true)}
              disabled={!isValid || isSaving}
              className={cn(
                'py-3 px-4 rounded-xl font-medium text-sm border-2 min-h-[44px] transition-colors active:scale-[0.98]',
                isValid && !isSaving
                  ? 'border-primary text-primary'
                  : 'border-muted text-muted-foreground'
              )}
            >
              + Add
            </button>
          )}
        </div>
      </footer>

      {/* Advisor List Sheet */}
      <BottomSheet
        isOpen={showAdvisorList}
        onClose={() => setShowAdvisorList(false)}
        title="Select Advisor"
      >
        <div className="p-4 space-y-2">
          {/* Search/Create input */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search or add new advisor..."
              value={advisorSearch}
              onChange={(e) => setAdvisorSearch(e.target.value)}
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          {filteredAdvisors.map((adv) => (
            <button
              key={adv.id}
              onClick={() => {
                setAdvisor(adv.name);
                setShowAdvisorList(false);
                setAdvisorSearch('');
              }}
              className={cn(
                'w-full p-3 rounded-xl text-left font-medium min-h-[44px]',
                advisor === adv.name ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              )}
            >
              {adv.name}
            </button>
          ))}
          
          {/* Create new advisor option */}
          {advisorSearch.trim() && !settings.advisors.some(a => a.name.toLowerCase() === advisorSearch.trim().toLowerCase()) && (
            <button
              onClick={() => {
                const name = advisorSearch.trim();
                updateAdvisors([...settings.advisors, { id: Date.now().toString(), name }]);
                setAdvisor(name);
                setShowAdvisorList(false);
                setAdvisorSearch('');
                toast.success(`Advisor "${name}" created`);
              }}
              className="w-full p-3 rounded-xl text-left font-medium min-h-[44px] bg-primary/10 text-primary border-2 border-dashed border-primary/30 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add new advisor: "{advisorSearch.trim()}"
            </button>
          )}
        </div>
      </BottomSheet>

      {/* Scan Flow */}
      <ScanFlow
        isOpen={showScanFlow}
        onClose={() => setShowScanFlow(false)}
        onApply={handleScanApply}
        roId={editingROId}
        hasExistingLines={lines.some(l => l.description.trim() !== '' || l.hoursPaid > 0)}
        existingLineDescriptions={lines.map(l => l.description)}
      />

      {/* RO Cap Reached Sheet */}
      <BottomSheet
        isOpen={showCapSheet}
        onClose={() => setShowCapSheet(false)}
        title="Monthly Limit Reached"
      >
        <div className="p-6 space-y-4 text-center">
          <p className="text-muted-foreground text-sm leading-relaxed">
            You've created {monthlyROCount} ROs this month. Free accounts are limited to {RO_CAP} ROs per month.
          </p>
          <p className="text-muted-foreground text-sm">
            Upgrade to Pro for unlimited ROs plus OCR scanning, spreadsheet view, and more.
          </p>
          <button
            onClick={() => {
              setShowCapSheet(false);
              startCheckout();
            }}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            Upgrade to Pro — $8.99/mo
          </button>
          <button
            onClick={() => setShowCapSheet(false)}
            className="w-full py-3 text-muted-foreground text-sm"
          >
            Maybe later
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// Preset button with pressed state animation
function PresetButton({ 
  preset, 
  onAdd 
}: { 
  preset: { id: string; name: string; defaultHours?: number; workTemplate?: string; laborType?: LaborType }; 
  onAdd: (newLineId: string) => void;
}) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    setIsPressed(true);
    const newLineId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    onAdd(newLineId);
    setTimeout(() => setIsPressed(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex-shrink-0 px-2.5 py-1.5 border rounded-md text-xs font-medium flex items-center gap-1 transition-all duration-150 min-h-[32px]',
        isPressed 
          ? 'bg-primary text-primary-foreground border-primary scale-95' 
          : 'bg-card border-border hover:bg-primary/10 hover:border-primary/30 active:scale-95'
      )}
    >
      {isPressed ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex"
        >
          ✓
        </motion.span>
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
