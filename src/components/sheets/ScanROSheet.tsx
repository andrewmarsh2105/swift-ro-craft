import { useState, useRef } from 'react';
import { Camera, RotateCw, Crop, Check, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScanROSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ScannedData) => void;
}

interface ScannedData {
  roNumber?: string;
  advisor?: string;
  paidHours?: number;
  workPerformed?: string;
}

interface DetectedField {
  field: keyof ScannedData;
  value: string;
  confidence: number;
  accepted: boolean;
}

export function ScanROSheet({ isOpen, onClose, onApply }: ScanROSheetProps) {
  const [step, setStep] = useState<'capture' | 'review'>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
      // Simulate OCR detection
      simulateOCR();
      setStep('review');
    };
    reader.readAsDataURL(file);
  };

  const simulateOCR = () => {
    // Simulated OCR results - in production this would call an actual OCR service
    setDetectedFields([
      { field: 'roNumber', value: '987654', confidence: 0.95, accepted: true },
      { field: 'advisor', value: 'Mike Johnson', confidence: 0.88, accepted: true },
      { field: 'paidHours', value: '2.5', confidence: 0.92, accepted: true },
      { field: 'workPerformed', value: 'Front brake service', confidence: 0.75, accepted: true },
    ]);
  };

  const toggleField = (index: number) => {
    setDetectedFields(prev => prev.map((field, i) => 
      i === index ? { ...field, accepted: !field.accepted } : field
    ));
  };

  const updateFieldValue = (index: number, value: string) => {
    setDetectedFields(prev => prev.map((field, i) => 
      i === index ? { ...field, value } : field
    ));
  };

  const handleApply = () => {
    const data: ScannedData = {};
    detectedFields.forEach(field => {
      if (field.accepted) {
        if (field.field === 'paidHours') {
          data.paidHours = parseFloat(field.value) || 0;
        } else {
          (data as any)[field.field] = field.value;
        }
      }
    });
    onApply(data);
    handleReset();
  };

  const handleReset = () => {
    setStep('capture');
    setCapturedImage(null);
    setDetectedFields([]);
    onClose();
  };

  const fieldLabels: Record<keyof ScannedData, string> = {
    roNumber: 'RO Number',
    advisor: 'Advisor',
    paidHours: 'Paid Hours',
    workPerformed: 'Work Performed',
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <AnimatePresence mode="wait">
        {step === 'capture' ? (
          <motion.div
            key="capture"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="flex flex-col h-full safe-top safe-bottom"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={handleReset} className="p-2 tap-target touch-feedback">
                <X className="h-6 w-6" />
              </button>
              <h2 className="font-semibold text-lg">Scan RO</h2>
              <div className="w-10" />
            </div>

            {/* Camera/Upload Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-sm aspect-[3/4] border-4 border-dashed border-primary/50 rounded-3xl flex flex-col items-center justify-center gap-6 bg-primary/5">
                <Camera className="h-16 w-16 text-primary/50" />
                <p className="text-muted-foreground text-center px-8">
                  Take a photo or upload an image of the RO to auto-fill fields
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCapture(file);
                }}
                className="hidden"
              />

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-4 px-8 bg-primary text-primary-foreground rounded-2xl font-semibold tap-target touch-feedback"
                >
                  <Camera className="h-5 w-5 inline mr-2" />
                  Take Photo
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="review"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="flex flex-col h-full safe-top safe-bottom"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button 
                onClick={() => setStep('capture')} 
                className="p-2 tap-target touch-feedback flex items-center gap-1 text-primary"
              >
                <ChevronLeft className="h-5 w-5" />
                Retake
              </button>
              <h2 className="font-semibold text-lg">Review</h2>
              <div className="w-16" />
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Image Preview */}
              {capturedImage && (
                <div className="relative aspect-video bg-black/10 m-4 rounded-2xl overflow-hidden">
                  <img 
                    src={capturedImage} 
                    alt="Captured RO" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button className="p-2 bg-black/50 text-white rounded-lg backdrop-blur-sm tap-target">
                      <RotateCw className="h-5 w-5" />
                    </button>
                    <button className="p-2 bg-black/50 text-white rounded-lg backdrop-blur-sm tap-target">
                      <Crop className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Detected Fields */}
              <div className="px-4 pb-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Detected Fields
                </h3>
                
                {detectedFields.map((field, index) => (
                  <div 
                    key={field.field}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-colors',
                      field.accepted 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted bg-muted/50'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {fieldLabels[field.field]}
                      </span>
                      <button
                        onClick={() => toggleField(index)}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center tap-target',
                          field.accepted 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateFieldValue(index, e.target.value)}
                      className="w-full text-lg font-semibold bg-transparent focus:outline-none"
                    />
                    <div className="mt-1 text-xs text-muted-foreground">
                      Confidence: {Math.round(field.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Action */}
            <div className="p-4 border-t border-border safe-bottom pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
              <button
                onClick={handleApply}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold tap-target touch-feedback"
              >
                Apply to RO
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
