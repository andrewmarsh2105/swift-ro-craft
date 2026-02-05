import { useState, useEffect } from 'react';
import { Camera, ChevronDown, ChevronUp, Mic, X, ToggleLeft, ToggleRight, List, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { NumericInput } from '@/components/mobile/NumericInput';
import { Chip } from '@/components/mobile/Chip';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { LineItemEditor, createEmptyLine } from '@/components/mobile/LineItemEditor';
import { useRO } from '@/contexts/ROContext';
import type { LaborType, RepairOrder, Preset, ROLine } from '@/types/ro';
import { cn } from '@/lib/utils';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editingRO?: RepairOrder;
  onScanPhoto: () => void;
}

export function QuickAddSheet({ isOpen, onClose, editingRO, onScanPhoto }: QuickAddSheetProps) {
  const { settings, addRO, updateRO } = useRO();
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showAdvisorList, setShowAdvisorList] = useState(false);
  
  // Mode toggle - Lines Mode is default
  const [isSimpleMode, setIsSimpleMode] = useState(editingRO?.isSimpleMode ?? false);
  
  // Form state
  const [roNumber, setRoNumber] = useState(editingRO?.roNumber || '');
  const [advisor, setAdvisor] = useState(editingRO?.advisor || '');
  const [paidHours, setPaidHours] = useState(editingRO?.paidHours || 0);
  const [laborType, setLaborType] = useState<LaborType>(editingRO?.laborType || 'customer-pay');
  const [workPerformed, setWorkPerformed] = useState(editingRO?.workPerformed || '');
  const [notes, setNotes] = useState(editingRO?.notes || '');
  const [lines, setLines] = useState<ROLine[]>(editingRO?.lines || [createEmptyLine(1)]);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

  // Reset form when opening/closing or when editingRO changes
  useEffect(() => {
    if (isOpen) {
      if (editingRO) {
        setRoNumber(editingRO.roNumber);
        setAdvisor(editingRO.advisor);
        setPaidHours(editingRO.paidHours);
        setLaborType(editingRO.laborType);
        setWorkPerformed(editingRO.workPerformed);
        setNotes(editingRO.notes || '');
        setLines(editingRO.lines.length > 0 ? editingRO.lines : [createEmptyLine(1)]);
        setIsSimpleMode(editingRO.isSimpleMode);
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
    setPaidHours(0);
    setLaborType('customer-pay');
    setWorkPerformed('');
    setNotes('');
    setLines([createEmptyLine(1)]);
    setSelectedPresets([]);
    setShowMoreDetails(false);
    setIsSimpleMode(false); // Default to Lines Mode
  };

  const handleSave = (addAnother: boolean = false) => {
    // Build work performed from lines if not in simple mode
    const computedWorkPerformed = isSimpleMode 
      ? workPerformed 
      : lines.map(l => l.description).filter(Boolean).join('\n');
    
    const roData = {
      roNumber,
      advisor,
      paidHours: isSimpleMode ? paidHours : linesTotalHours,
      laborType,
      workPerformed: computedWorkPerformed,
      notes,
      date: editingRO?.date || new Date().toISOString().split('T')[0],
      photos: editingRO?.photos,
      lines: isSimpleMode ? [] : lines,
      isSimpleMode,
    };

    if (editingRO) {
      updateRO(editingRO.id, roData);
    } else {
      addRO(roData);
    }

    if (addAnother) {
      resetForm();
    } else {
      onClose();
      resetForm();
    }
  };

  const handlePresetSelect = (preset: Preset) => {
    if (isSimpleMode) {
      // Simple mode behavior - toggle preset selection
      if (selectedPresets.includes(preset.id)) {
        setSelectedPresets(prev => prev.filter(id => id !== preset.id));
        if (preset.defaultHours) {
          setPaidHours(prev => Math.max(0, prev - preset.defaultHours!));
        }
      } else {
        setSelectedPresets(prev => [...prev, preset.id]);
        setLaborType(preset.laborType);
        if (preset.defaultHours) {
          setPaidHours(prev => prev + preset.defaultHours!);
        }
        if (preset.workTemplate) {
          setWorkPerformed(prev => prev ? `${prev}\n${preset.workTemplate}` : preset.workTemplate!);
        }
      }
    }
    // In Lines Mode, presets are handled by LineItemEditor
  };

  const handleConvertToLines = () => {
    // Convert simple mode to lines mode
    if (paidHours > 0 || workPerformed) {
      setLines([{
        id: Date.now().toString(),
        lineNo: 1,
        description: workPerformed,
        hoursPaid: paidHours,
        laborType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]);
    } else {
      setLines([createEmptyLine(1)]);
    }
    setIsSimpleMode(false);
  };

  const isValid = roNumber.trim() !== '' && 
    advisor.trim() !== '' && 
    (isSimpleMode ? paidHours > 0 : linesTotalHours > 0);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingRO ? 'Edit RO' : 'Quick Add'}
      fullScreen
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Scan RO Photo Button */}
          <button
            onClick={() => {
              onScanPhoto();
            }}
            className="w-full py-4 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center gap-3 text-primary font-semibold tap-target touch-feedback"
          >
            <Camera className="h-6 w-6" />
            Scan RO Photo
          </button>

          {/* Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
            <div className="flex items-center gap-2">
              {isSimpleMode ? (
                <Hash className="h-5 w-5 text-muted-foreground" />
              ) : (
                <List className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="font-medium">
                {isSimpleMode ? 'Simple Mode' : 'Lines Mode'}
              </span>
            </div>
            <button
              onClick={() => {
                if (isSimpleMode) {
                  handleConvertToLines();
                } else {
                  setIsSimpleMode(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg text-sm font-medium tap-target touch-feedback"
            >
              {isSimpleMode ? 'Switch to Lines' : 'Switch to Simple'}
            </button>
          </div>

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
              {settings.advisors.slice(0, 4).map((adv) => (
                <Chip
                  key={adv.id}
                  label={adv.name.split(' ')[0]} // First name only
                  selected={advisor === adv.name}
                  onSelect={() => setAdvisor(adv.name)}
                />
              ))}
              {settings.advisors.length > 0 && (
                <Chip
                  label="More..."
                  onSelect={() => setShowAdvisorList(true)}
                />
              )}
            </div>

            {/* Show selected advisor if not in first 4 */}
            {advisor && !settings.advisors.slice(0, 4).find(a => a.name === advisor) && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl">
                <span className="font-medium">{advisor}</span>
                <button onClick={() => setAdvisor('')} className="ml-auto">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Labor Type - Always shown */}
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

          {/* Conditional content based on mode */}
          {isSimpleMode ? (
            <>
              {/* Simple Mode: Single hours input */}
              <NumericInput
                label="Paid Hours"
                value={paidHours}
                onChange={setPaidHours}
                quickIncrements={[0.1, 0.2, 0.5]}
              />

              {/* Presets for simple mode */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Quick Presets
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  {settings.presets.map((preset) => (
                    <Chip
                      key={preset.id}
                      label={preset.name}
                      selected={selectedPresets.includes(preset.id)}
                      onSelect={() => handlePresetSelect(preset)}
                      className="whitespace-nowrap flex-shrink-0"
                    />
                  ))}
                </div>
              </div>

              {/* Work Performed */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Work Performed (optional)
                </label>
                <div className="relative">
                  <textarea
                    value={workPerformed}
                    onChange={(e) => setWorkPerformed(e.target.value)}
                    placeholder="Describe work performed..."
                    rows={2}
                    className="w-full p-4 pr-12 bg-secondary rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button className="absolute right-3 top-3 p-2 text-muted-foreground touch-feedback">
                    <Mic className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Lines Mode: Line Item Editor */}
              <LineItemEditor
                lines={lines}
                onLinesChange={setLines}
                presets={settings.presets}
                showLaborType={false}
              />
            </>
          )}

          {/* More Details Accordion */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="w-full p-4 flex items-center justify-between touch-feedback"
            >
              <span className="font-medium">More Details</span>
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
                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes..."
                        rows={3}
                        className="w-full p-4 bg-secondary rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
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
          {settings.advisors.map((adv) => (
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
    </BottomSheet>
  );
}
