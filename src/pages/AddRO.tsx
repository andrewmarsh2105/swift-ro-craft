import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, ArrowLeft, Upload, Loader2, Plus, Calendar, User, Clock } from 'lucide-react';
import { CompactLinesGrid, createEmptyLine } from '@/components/mobile/CompactLinesGrid';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { ScanROSheet } from '@/components/sheets/ScanROSheet';
import { useRO } from '@/contexts/ROContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { LaborType, ROLine } from '@/types/ro';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const { settings, addRO, updateRO, ros } = useRO();
  
  // Get editing RO from location state
  const editingROId = (location.state as { editingROId?: string })?.editingROId;
  const editingRO = editingROId ? ros.find(r => r.id === editingROId) : undefined;

  const [showAdvisorList, setShowAdvisorList] = useState(false);
  const [showScanSheet, setShowScanSheet] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [roNumber, setRoNumber] = useState(editingRO?.roNumber || '');
  const [advisor, setAdvisor] = useState(editingRO?.advisor || '');
  const [date, setDate] = useState(editingRO?.date || new Date().toISOString().split('T')[0]);
  const [laborType, setLaborType] = useState<LaborType>(editingRO?.laborType || 'customer-pay');
  const [notes, setNotes] = useState(editingRO?.notes || '');
  
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

  // Calculate total hours from lines
  const totalHours = lines.reduce((sum, line) => sum + line.hoursPaid, 0);

  const handleScanClick = () => {
    setScanStatus('Opening camera...');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setScanStatus('No file selected');
      return;
    }
    
    setScanStatus(`File selected: ${file.name}`);
    setIsProcessingPhoto(true);
    
    setTimeout(() => {
      setScanStatus('Uploading photo...');
    }, 100);
    
    const reader = new FileReader();
    reader.onload = () => {
      setScanStatus('Photo loaded, opening review...');
      setIsProcessingPhoto(false);
      setShowScanSheet(true);
    };
    reader.onerror = () => {
      setScanStatus('Error reading file');
      setIsProcessingPhoto(false);
      toast.error('Failed to read photo');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleScanApply = (data: { roNumber?: string; advisor?: string; paidHours?: number; workPerformed?: string }) => {
    setScanStatus('Applying scanned data...');
    
    if (data.roNumber) setRoNumber(data.roNumber);
    if (data.advisor) setAdvisor(data.advisor);
    if (data.paidHours || data.workPerformed) {
      const newLine = createEmptyLine(1);
      newLine.description = data.workPerformed || 'Scanned work';
      newLine.hoursPaid = data.paidHours || 0;
      setLines(prev => [newLine, ...prev.filter(l => l.description || l.hoursPaid > 0)].map((l, i) => ({ ...l, lineNo: i + 1 })));
    }
    
    toast.success('Scanned data applied!');
    setScanStatus('Done');
  };

  const handleAddLine = () => {
    const newLine = createEmptyLine(1);
    const updatedLines = [newLine, ...lines].map((line, i) => ({
      ...line,
      lineNo: i + 1,
    }));
    setLines(updatedLines);
  };

  const handleSave = (addAnother: boolean = false) => {
    const computedWorkPerformed = lines.map(l => l.description).filter(Boolean).join('\n');
    
    const roData = {
      roNumber,
      advisor,
      paidHours: totalHours,
      laborType,
      workPerformed: computedWorkPerformed,
      notes,
      date,
      photos: editingRO?.photos,
      lines,
      isSimpleMode: false,
    };

    if (editingRO) {
      updateRO(editingRO.id, roData);
      toast.success('RO updated');
    } else {
      addRO(roData);
      toast.success('RO created');
    }

    if (addAnother) {
      setRoNumber('');
      setNotes('');
      setLines([createEmptyLine(1)]);
    } else {
      navigate(-1);
    }
  };

  const isValid = roNumber.trim() !== '' && 
    advisor.trim() !== '' && 
    totalHours > 0;

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
        <button
          onClick={handleScanClick}
          disabled={isProcessingPhoto}
          className="flex items-center gap-1 text-primary font-medium min-w-[44px] min-h-[44px] justify-center -mr-2"
        >
          {isProcessingPhoto ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Hidden file input for camera/gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Sticky RO Header Strip */}
      <div className="flex-shrink-0 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          {/* RO # */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              inputMode="numeric"
              value={roNumber}
              onChange={(e) => setRoNumber(e.target.value)}
              placeholder="RO #"
              className="w-full h-9 px-2 bg-muted rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 px-2 bg-muted rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary w-[110px]"
          />
          
          {/* Total Hours */}
          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-bold text-primary">{totalHours.toFixed(1)}h</span>
          </div>
        </div>
        
        {/* Advisor & Labor Type Row */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setShowAdvisorList(true)}
            className={cn(
              'flex-1 h-9 px-3 rounded-lg text-sm text-left flex items-center gap-2',
              advisor ? 'bg-muted font-medium' : 'bg-muted/50 text-muted-foreground'
            )}
          >
            <User className="h-3.5 w-3.5" />
            {advisor || 'Select Advisor'}
          </button>
          
          <select
            value={laborType}
            onChange={(e) => setLaborType(e.target.value as LaborType)}
            className="h-9 px-2 bg-muted rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {LABOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.short}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Presets Toolbar */}
      {settings.presets.length > 0 && (
        <div className="flex-shrink-0 border-b border-border bg-muted/20 px-2 py-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {settings.presets.slice(0, 6).map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
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
                  toast.success(`Added: ${preset.name} (${preset.defaultHours || 0}h)`);
                  if ('vibrate' in navigator) navigator.vibrate(10);
                }}
                className="flex-shrink-0 px-2.5 py-1.5 bg-card border border-border rounded-md text-xs font-medium flex items-center gap-1 active:scale-95 transition-transform min-h-[32px]"
              >
                <Plus className="h-3 w-3" />
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Content - Lines Grid */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-3 pb-40">
          {/* Debug status (dev mode) */}
          {import.meta.env.DEV && scanStatus && (
            <div className="mb-2 p-2 bg-muted rounded-lg text-xs font-mono text-muted-foreground">
              Status: {scanStatus}
            </div>
          )}

          {/* Compact Lines Grid */}
          <CompactLinesGrid
            lines={lines}
            onLinesChange={setLines}
            presets={settings.presets}
          />
        </div>
      </main>

      {/* Sticky Add Line Button */}
      <div className="fixed bottom-[140px] left-3 right-3 z-40 safe-bottom">
        <button
          onClick={handleAddLine}
          className="w-full py-2.5 bg-card border border-dashed border-primary/50 rounded-xl flex items-center justify-center gap-2 text-primary text-sm font-medium shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Add Line
        </button>
      </div>

      {/* Sticky Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
        {/* Total Hours */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Total ({lines.length} lines)</span>
          <span className="text-xl font-bold text-primary">{totalHours.toFixed(1)}h</span>
        </div>
        
        {/* Action Buttons */}
        <div className="p-3 flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={!isValid}
            className={cn(
              'flex-1 py-3 rounded-xl font-semibold text-sm min-h-[44px] transition-colors',
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
                'py-3 px-4 rounded-xl font-medium text-sm border-2 min-h-[44px] transition-colors',
                isValid
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
          {settings.advisors.map((adv) => (
            <button
              key={adv.id}
              onClick={() => {
                setAdvisor(adv.name);
                setShowAdvisorList(false);
              }}
              className={cn(
                'w-full p-3 rounded-xl text-left font-medium min-h-[44px]',
                advisor === adv.name ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              )}
            >
              {adv.name}
            </button>
          ))}
          
          <div className="pt-4">
            <input
              type="text"
              placeholder="Add new advisor..."
              className="w-full h-12 px-4 bg-secondary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
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

      {/* Scan RO Review Sheet */}
      <ScanROSheet
        isOpen={showScanSheet}
        onClose={() => setShowScanSheet(false)}
        onApply={handleScanApply}
      />
    </div>
  );
}
