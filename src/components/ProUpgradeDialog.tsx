import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Camera, BarChart3, FileSpreadsheet, ExternalLink, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { type UpgradeTrigger, UPGRADE_CONTEXT } from '@/lib/proFeatures';

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: UpgradeTrigger;
}

const featureBullets = [
  'Track unlimited ROs and labor lines',
  'Use OCR scan/import from your phone',
  'Run closeouts, summaries, and exports',
  'Keep lifetime access after one payment',
];

const featureCards = [
  { icon: Camera, label: 'OCR scan workflow' },
  { icon: BarChart3, label: 'Period closeouts' },
  { icon: FileSpreadsheet, label: 'Export reports' },
];

export function ProUpgradeDialog({ open, onOpenChange, trigger = 'generic' }: ProUpgradeDialogProps) {
  const {
    startCheckout,
    checkoutLoading,
    checkoutFallbackUrl,
    clearCheckoutFallback,
    subscriptionStatus,
  } = useSubscription();

  const ctx = UPGRADE_CONTEXT[trigger];
  const ctaLabel = subscriptionStatus === 'expired' ? 'Buy Full Access — $15.99' : 'Unlock Lifetime Access — $15.99';

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) clearCheckoutFallback();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border p-0 gap-0" style={{ borderColor: '#BFDBFE', background: '#F8FBFF' }}>
        <div className="p-6 text-white" style={{ background: 'linear-gradient(150deg, #07173F 0%, #083EA7 58%, #0B5FFF 100%)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(147,197,253,0.2)' }}>
                <Crown className="h-4 w-4 text-[#BFDBFE]" />
              </span>
              Unlock RO Navigator
            </DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-blue-100">{ctx.pitch}</p>

          <div className="mt-5 rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(191,219,254,0.35)', background: 'rgba(7,17,44,0.28)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">Offer</p>
            <p className="mt-1 text-xl font-bold">$15.99 one-time payment</p>
            <p className="mt-1 text-xs text-blue-100">No monthly or yearly plans. Lifetime access after purchase.</p>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-3 gap-2.5">
            {featureCards.map((item) => (
              <div key={item.label} className="rounded-xl border px-2 py-3 text-center" style={{ borderColor: '#DBEAFE', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)' }}>
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: '#EFF6FF' }}>
                  <item.icon className="h-4 w-4" style={{ color: '#0B5FFF' }} />
                </div>
                <p className="mt-1.5 text-[11px] leading-tight" style={{ color: '#0F172A' }}>{item.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            {featureBullets.map((line) => (
              <div key={line} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#0B5FFF' }} />
                <p className="text-sm" style={{ color: '#0F172A' }}>{line}</p>
              </div>
            ))}
          </div>

          {checkoutFallbackUrl ? (
            <a
              href={checkoutFallbackUrl}
              className="flex w-full items-center justify-center rounded-lg py-3 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(90deg, #0B5FFF 0%, #1D4ED8 100%)' }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Continue to checkout
            </a>
          ) : (
            <Button
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="h-12 w-full text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(90deg, #0B5FFF 0%, #1D4ED8 100%)' }}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening checkout…
                </>
              ) : (
                <>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
