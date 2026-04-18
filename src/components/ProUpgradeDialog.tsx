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
      <DialogContent className="max-w-md rounded-2xl p-0 gap-0 overflow-hidden border" style={{ borderColor: '#DBEAFE', background: '#F8FBFF' }}>
        <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #081C45 0%, #083EA7 58%, #0B5FFF 100%)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Crown className="h-5 w-5 text-[#93C5FD]" />
              Unlock RO Navigator
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2 text-blue-100">{ctx.pitch}</p>
          <div className="mt-4 rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(219,234,254,0.28)', background: 'rgba(7,17,44,0.24)' }}>
            <p className="text-sm font-semibold">14-day free trial, then one-time $15.99</p>
            <p className="text-xs text-blue-100 mt-1">No recurring fees. Lifetime access after payment.</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {featureCards.map((item) => (
              <div key={item.label} className="rounded-lg border px-2 py-3 text-center" style={{ borderColor: '#DBEAFE', background: '#FFFFFF' }}>
                <item.icon className="h-4 w-4 mx-auto" style={{ color: '#0B5FFF' }} />
                <p className="mt-1.5 text-[11px] leading-tight" style={{ color: '#0F172A' }}>{item.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
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
              className="flex items-center justify-center w-full py-3 text-sm font-semibold rounded-lg text-white"
              style={{ background: '#0B5FFF' }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue to checkout
            </a>
          ) : (
            <Button
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="w-full h-12 text-sm font-semibold text-white"
              style={{ background: '#0B5FFF' }}
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
