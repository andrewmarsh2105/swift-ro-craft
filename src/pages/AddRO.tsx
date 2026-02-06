import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, ChevronDown, ChevronUp, Mic, X, ArrowLeft, List, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { LineItemEditor, createEmptyLine } from '@/components/mobile/LineItemEditor';
import { Chip } from '@/components/mobile/Chip';
import { BottomSheet } from '@/components/mobile/BottomSheet';
import { useRO } from '@/contexts/ROContext';
import type { LaborType, RepairOrder, Preset, ROLine } from '@/types/ro';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ro-add-mode-preference';

export default function AddRO() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, addRO, updateRO, ros } = useRO();
  
  // Get editing RO from location state
  const editingROId = (location.state as { editingROId?: string })?.editingROId;
  const editingRO = editingROId ? ros.find(r => r.id === editingROId) : undefined;

  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showAdvisorList, setShowAdvisorList] = useState(false);
  
  // Mode toggle - remember last used mode
  const getInitialMode = () => {
    if (editingRO) return editingRO.isSimpleMode;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'simple';
  };
  const [isSimpleMode, setIsSimpleMode] = useState(getInitialMode);
  
  // Form state
  const [roNumber, setRoNumber] = useState(editingRO?.roNumber || '');
  const [advisor, setAdvisor] = useState(editingRO?.advisor || '');
  const [simpleHours, setSimpleHours] = useState(editingRO?.paidHours || 0);
  const [laborType, setLaborType] = useState<LaborType>(editingRO?.laborType || 'customer-pay');
  const [workPerformed, setWorkPerformed] = useState(editingRO?.workPerformed || '');
  const [notes, setNotes] = useState(editingRO?.notes || '');
  const [lines, setLines] = useState<ROLine[]>(
    editingRO?.lines?.length ? editingRO.lines : [createEmptyLine(1)]
  );
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

  // Lock body scroll when this page is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Save mode preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isSimpleMode ? 'simple' : 'lines');
  }, [isSimpleMode]);

  // Calculate total hours from lines
  const linesTotalHours = lines.reduce((sum, line) => sum + line.hoursPaid, 0);
  const displayTotal = isSimpleMode ? simpleHours : linesTotalHours;

  const handleModeSwitch = (mode: 'simple' | 'lines') => {
    if (mode === 'simple' && !isSimpleMode) {
      // Lines -> Simple: set simpleHours = sum of lines
      setSimpleHours(linesTotalHours);
      setIsSimpleMode(true);
    } else if (mode === 'lines' && isSimpleMode) {
      // Simple -> Lines: create a line from current data if any
      if (simpleHours > 0 || workPerformed) {
        setLines([{
          id: Date.now().toString(),
          lineNo: 1,
          description: workPerformed || 'General Labor',
          hoursPaid: simpleHours,
          laborType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]);
      } else if (lines.length === 0) {
        setLines([createEmptyLine(1)]);
      }
      setIsSimpleMode(false);
    }
  };

  const handleSave = (addAnother: boolean = false) => {
    const computedWorkPerformed = isSimpleMode 
      ? workPerformed 
      : lines.map(l => l.description).filter(Boolean).join('\n');
    
    const roData = {
      roNumber,
      advisor,
      paidHours: isSimpleMode ? simpleHours : linesTotalHours,
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
      // Reset form for another entry
      setRoNumber('');
      setSimpleHours(0);
      setWorkPerformed('');
      setNotes('');
      setLines([createEmptyLine(1)]);
      setSelectedPresets([]);
      setShowMoreDetails(false);
    } else {
      navigate(-1);
    }
  };

  const handlePresetSelect = (preset: Preset) => {
    if (selectedPresets.includes(preset.id)) {
      setSelectedPresets(prev => prev.filter(id => id !== preset.id));
      if (preset.defaultHours) {
        setSimpleHours(prev => Math.max(0, prev - preset.defaultHours!));
      }
    } else {
      setSelectedPresets(prev => [...prev, preset.id]);
      setLaborType(preset.laborType);
      if (preset.defaultHours) {
        setSimpleHours(prev => prev + preset.defaultHours!);
      }
      if (preset.workTemplate) {
        setWorkPerformed(prev => prev ? `${prev}\n${preset.workTemplate}` : preset.workTemplate!);
      }
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setSimpleHours(0);
    } else {
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 0) {
        setSimpleHours(Math.round(num * 10) / 10);
      }
    }
  };

  const handleQuickIncrement = (amount: number) => {
    setSimpleHours(prev => Math.round((prev + amount) * 10) / 10);
  };

  const isValid = roNumber.trim() !== '' && 
    advisor.trim() !== '' && 
    (isSimpleMode ? simpleHours > 0 : linesTotalHours > 0);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top Header Bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 border-b border-border bg-card safe-top">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary font-medium tap-target touch-feedback -ml-2 px-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <h1 className="text-lg font-semibold">
          {editingRO ? 'Edit RO' : 'Add RO'}
        </h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 space-y-6 pb-32">
          {/* Mode Toggle - Segmented Control */}
          <SegmentedControl
            options={[
              { value: 'lines', label: 'Lines Mode' },
              { value: 'simple', label: 'Simple Mode' },
            ]}
            value={isSimpleMode ? 'simple' : 'lines'}
            onChange={(value) => handleModeSwitch(value as 'simple' | 'lines')}
          />

          {/* Scan RO Photo Button */}
          <button
            onClick={() => {
              // TODO: Navigate to scan
            }}
            className="w-full py-4 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center gap-3 text-primary font-semibold tap-target touch-feedback"
          >
            <Camera className="h-6 w-6" />
            Scan RO Photo
          </button>

          {/* RO Number */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              RO Number *
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
              Advisor *
            </label>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {settings.advisors.slice(0, 4).map((adv) => (
                <Chip
                  key={adv.id}
                  label={adv.name.split(' ')[0]}
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

            {advisor && !settings.advisors.slice(0, 4).find(a => a.name === advisor) && (
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
                { value: 'customer-pay' as LaborType, label: 'CP' },
                { value: 'internal' as LaborType, label: 'Internal' },
              ]}
              value={laborType}
              onChange={(value) => setLaborType(value as LaborType)}
            />
          </div>

          {/* Mode-specific content */}
          {isSimpleMode ? (
            <>
              {/* Simple Mode: Typed hours input */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Paid Hours *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={simpleHours || ''}
                    onChange={handleHoursChange}
                    placeholder="0.0"
                    className="flex-1 h-14 px-4 bg-secondary rounded-xl text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {/* Quick increment chips */}
                <div className="flex justify-center gap-2 mt-3">
                  {[0.1, 0.2, 0.5, 1.0].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleQuickIncrement(amount)}
                      className="px-4 py-2 bg-secondary rounded-lg text-sm font-medium tap-target touch-feedback"
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>

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
      </main>

      {/* Sticky Bottom Action Bar with Total */}
      <footer className="flex-shrink-0 border-t border-border bg-card safe-bottom">
        {/* Total Hours Display */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Hours</span>
          <span className="text-2xl font-bold text-primary">{displayTotal.toFixed(1)}</span>
        </div>
        
        {/* Action Buttons */}
        <div className="p-4 flex gap-3">
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
                'w-full p-4 rounded-xl text-left font-medium tap-target touch-feedback',
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
    </div>
  );
}
