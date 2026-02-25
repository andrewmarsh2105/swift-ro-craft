import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Check, X, Camera, Table2, BarChart3, Infinity } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';
import spreadsheetPreview from '@/assets/pro-spreadsheet-preview.jpg';
import multiperiodPreview from '@/assets/pro-multiperiod-preview.jpg';

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  { name: 'Manual RO entry', free: true, pro: true },
  { name: 'Flag Inbox', free: true, pro: true },
  { name: 'Summary (1wk / 2wk / custom)', free: true, pro: true },
  { name: 'Proof Pack & CSV export', free: true, pro: true },
  { name: 'RO creation limit', free: '150/mo', pro: 'Unlimited' },
  { name: 'OCR scan (photo capture)', free: false, pro: true },
  { name: 'Scan templates', free: false, pro: true },
  { name: 'Spreadsheet view & print', free: false, pro: true },
  { name: 'Multi-period reporting', free: false, pro: true },
];

export function ProUpgradeDialog({ open, onOpenChange }: ProUpgradeDialogProps) {
  const { startCheckout } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleCheckout = async () => {
    onOpenChange(false);
    await startCheckout(selectedPlan);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/15 to-primary/5 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Crown className="h-6 w-6 text-primary" />
              Upgrade to Pro
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Unlock the full power of your RO tracker.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Plan Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                selectedPlan === 'monthly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <p className="text-sm font-medium text-muted-foreground">Monthly</p>
              <p className="text-lg font-bold">$8.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all relative',
                selectedPlan === 'yearly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                Save 26%
              </span>
              <p className="text-sm font-medium text-muted-foreground">Yearly</p>
              <p className="text-lg font-bold">$79.99<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
              <p className="text-xs text-muted-foreground">~$6.67/mo</p>
            </button>
          </div>

          {/* Comparison Table */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Feature</th>
                  <th className="text-center p-3 font-medium text-muted-foreground w-20">Free</th>
                  <th className="text-center p-3 font-semibold text-primary w-20">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {features.map((f) => (
                  <tr key={f.name} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{f.name}</td>
                    <td className="p-3 text-center">
                      {f.free === true ? (
                        <Check className="h-4 w-4 text-primary mx-auto" />
                      ) : f.free === false ? (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{f.free}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {f.pro === true ? (
                        <Check className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <span className="text-xs font-medium text-primary">{f.pro}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Feature Previews */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">What you'll get</h3>

            <div className="space-y-3">
              <div className="rounded-xl border overflow-hidden">
                <img src={spreadsheetPreview} alt="Spreadsheet View" className="w-full h-36 object-cover" />
                <div className="p-3 flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Spreadsheet View</p>
                    <p className="text-xs text-muted-foreground">Full-screen grid with CSV export &amp; print</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <img src={multiperiodPreview} alt="Multi-Period Reporting" className="w-full h-36 object-cover" />
                <div className="p-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Multi-Period Reporting</p>
                    <p className="text-xs text-muted-foreground">Compare pay periods side-by-side with delta indicators</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 rounded-xl border p-3 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">OCR Scanning</p>
                    <p className="text-xs text-muted-foreground">Snap &amp; auto-fill</p>
                  </div>
                </div>
                <div className="flex-1 rounded-xl border p-3 flex items-center gap-2">
                  <Infinity className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Unlimited ROs</p>
                    <p className="text-xs text-muted-foreground">No monthly cap</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <Button onClick={handleCheckout} className="w-full py-6 text-base font-semibold rounded-xl">
            <Crown className="h-5 w-5 mr-2" />
            {selectedPlan === 'monthly' ? 'Subscribe — $8.99/month' : 'Subscribe — $79.99/year'}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Cancel anytime. Managed through Stripe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
