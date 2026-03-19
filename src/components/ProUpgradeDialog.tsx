import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Camera, BarChart3, FileSpreadsheet, ExternalLink, Loader2, InfinityIcon, Shield, Check } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';
import { type UpgradeTrigger, UPGRADE_CONTEXT } from '@/lib/proFeatures';

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where in the app the user triggered this dialog — drives contextual headline + pitch. */
  trigger?: UpgradeTrigger;
}

const proFeatures = [
  {
    icon: InfinityIcon,
    title: 'Unlimited ROs',
    desc: 'No monthly cap — log every RO, every day.',
  },
  {
    icon: Camera,
    title: 'Scan ROs with your phone',
    desc: 'Snap a photo and lines auto-fill via OCR.',
  },
  {
    icon: BarChart3,
    title: 'Pay period closeouts & comparison',
    desc: 'Freeze periods and compare them side-by-side.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Full exports',
    desc: 'Payroll CSV, audit XLSX, and PDF — any date range.',
  },
];

export function ProUpgradeDialog({ open, onOpenChange, trigger = 'generic' }: ProUpgradeDialogProps) {
  const { startCheckout, checkoutLoading, checkoutFallbackUrl, clearCheckoutFallback } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const ctx = UPGRADE_CONTEXT[trigger];

  const handleCheckout = async () => {
    await startCheckout(selectedPlan);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) clearCheckoutFallback();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">

        {/* Hero — contextual headline + pitch */}
        <div className="bg-gradient-to-br from-primary/15 via-primary/8 to-transparent p-6 pb-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Crown className="h-5 w-5 text-primary flex-shrink-0" />
              {ctx.headline}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1.5 leading-snug">
            {ctx.pitch}
          </p>

          {/* Trial badge */}
          <div className="mt-3 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
            <Shield className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs font-semibold text-primary">7-day free trial — no charge until it ends</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Feature list — highlight the feature relevant to this upgrade trigger */}
          <div className="space-y-2">
            {proFeatures.map((f) => {
              const isHighlighted = ctx.highlightFeature === f.title;
              return (
                <div
                  key={f.title}
                  className={cn(
                    'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                    isHighlighted
                      ? 'bg-primary/10 ring-1 ring-primary/20'
                      : 'hover:bg-muted/40'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                    isHighlighted ? 'bg-primary/20' : 'bg-primary/10'
                  )}>
                    <f.icon className={cn('h-4 w-4', isHighlighted ? 'text-primary' : 'text-primary/70')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold leading-snug', isHighlighted && 'text-primary')}>{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                  {isHighlighted && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Plan Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={cn(
                'rounded-xl border-2 p-3.5 text-left transition-all',
                selectedPlan === 'monthly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">Monthly</p>
              <p className="text-xl font-bold mt-0.5">$8.99<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">~$0.30/day</p>
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={cn(
                'rounded-xl border-2 p-3.5 text-left transition-all relative',
                selectedPlan === 'yearly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                Best Value
              </span>
              <p className="text-xs font-medium text-muted-foreground">Yearly</p>
              <p className="text-xl font-bold mt-0.5">$79.99<span className="text-xs font-normal text-muted-foreground">/yr</span></p>
              <p className="text-[11px] text-primary font-medium">~$0.22/day · save $27</p>
            </button>
          </div>

          {/* What's included summary */}
          <div className="bg-muted/50 rounded-xl px-4 py-3 space-y-1.5">
            {['Everything in Free, plus:', 'Unlimited ROs + spreadsheet view', 'OCR scan + period exports', '7-day trial, cancel anytime'].map((line, i) => (
              <div key={line} className="flex items-center gap-2">
                <Check className={cn('h-3.5 w-3.5 flex-shrink-0', i === 0 ? 'text-muted-foreground' : 'text-primary')} />
                <p className={cn('text-xs', i === 0 ? 'text-muted-foreground font-medium' : 'text-foreground')}>{line}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          {checkoutFallbackUrl ? (
            <a
              href={checkoutFallbackUrl}
              className="flex items-center justify-center w-full py-4 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Tap here to open checkout
            </a>
          ) : (
            <Button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full h-14 text-base font-semibold rounded-xl"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Opening checkout…
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5 mr-2" />
                  Start Free Trial
                </>
              )}
            </Button>
          )}

          <p className="text-[11px] text-center text-muted-foreground -mt-1">
            Free for 7 days, then {selectedPlan === 'monthly' ? '$8.99/month' : '$79.99/year'}. Cancel anytime — no questions asked.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
