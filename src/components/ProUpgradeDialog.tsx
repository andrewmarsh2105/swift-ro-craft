import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Camera, BarChart3, FileSpreadsheet, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
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
  const ctaLabel = subscriptionStatus === 'expired' ? 'Unlock Full Access' : 'Buy Lifetime Access';

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) clearCheckoutFallback();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden border" style={{ borderColor: '#D7ECE8', background: '#F5FBFA' }}>
        <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #062F2C 0%, #0F766E 65%, #0A5E58 100%)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Crown className="h-5 w-5 text-[#2DD4BF]" />
              Unlock RO Navigator
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2 text-teal-100">{ctx.pitch}</p>
          <div className="mt-4 rounded-xl border border-teal-300/20 bg-black/10 px-4 py-3">
            <p className="text-sm font-semibold">14-day free trial, then one-time $15.99</p>
            <p className="text-xs text-teal-100 mt-1">No subscription</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {featureCards.map((item) => (
              <div key={item.label} className="rounded-lg border px-2 py-3 text-center" style={{ borderColor: '#D7ECE8' }}>
                <item.icon className="h-4 w-4 mx-auto" style={{ color: '#0F766E' }} />
                <p className="mt-1.5 text-[11px] leading-tight" style={{ color: '#0F172A' }}>{item.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {featureBullets.map((line) => (
              <div key={line} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#0F766E' }} />
                <p className="text-sm" style={{ color: '#0F172A' }}>{line}</p>
              </div>
            ))}
          </div>

          {checkoutFallbackUrl ? (
            <a
              href={checkoutFallbackUrl}
              className="flex items-center justify-center w-full py-3 text-sm font-semibold rounded-lg text-white"
              style={{ background: '#0F766E' }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue to checkout
            </a>
          ) : (
            <Button
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="w-full h-12 text-sm font-semibold text-white"
              style={{ background: '#0F766E' }}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening checkout…
                </>
              ) : (
                ctaLabel
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
