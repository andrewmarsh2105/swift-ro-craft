import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClipboardList, BarChart2, Zap, ChevronRight, Loader2 } from 'lucide-react';
import { useROSafe } from '@/contexts/ROContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const ONBOARDING_KEY = 'onboarding.v1.completed';

const steps = [
  {
    icon: ClipboardList,
    title: 'Log your first RO',
    description: 'A Repair Order is the ticket written up when a car comes in — it tracks what you worked on and what you\'re owed. Tap the + button to add one. Enter the RO number and labor hours — takes 10 seconds.',
  },
  {
    icon: BarChart2,
    title: 'Track your hours',
    description: 'Switch to the Summary tab to see your total hours for the day, week, or pay period. Catch missing hours before payday.',
  },
  {
    icon: Zap,
    title: 'Try Pro free for 7 days',
    description: 'Unlock OCR scanning, pay period exports, closeouts, and more. No credit card needed to start your trial.',
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(() => !localStorage.getItem(ONBOARDING_KEY));
  const [step, setStep] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();
  const store = useROSafe();

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setOpen(false);
  };

  const isLast = step === steps.length - 1;
  const current = steps[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      dismiss();
      navigate('/add-ro');
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleLoadSampleData = async () => {
    if (!store?.seedSampleData) return;
    setSeeding(true);
    try {
      await store.seedSampleData();
      toast.success('Sample ROs loaded — explore the app, then delete them when ready', { duration: 6000 });
    } finally {
      setSeeding(false);
      dismiss();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0 border-border/60 shadow-[var(--shadow-raised)]">
        {/* Progress bar */}
        <div className="flex gap-1.5 justify-center pt-5 pb-0 px-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-400 ease-out"
              style={{
                width: i === step ? 28 : 12,
                backgroundColor: i <= step ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              }}
            />
          ))}
        </div>

        <div className="px-6 pt-6 pb-8 space-y-5 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-5"
            >
              <div className="flex items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.2)]">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground">{current.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="space-y-2 pt-1">
            <Button className="w-full h-11 font-semibold" onClick={handleNext}>
              {isLast ? 'Log My First RO' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>

            {isLast && (
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={handleLoadSampleData}
                disabled={seeding}
              >
                {seeding ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading sample data…</>
                ) : (
                  'Load sample data instead'
                )}
              </Button>
            )}

            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer pt-1"
              onClick={dismiss}
            >
              Skip for now
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
