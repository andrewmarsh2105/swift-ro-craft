import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles, Wallet } from 'lucide-react';

const valuePoints = [
  'Log repair orders fast from phone or desktop',
  'Track labor hours by day and pay period',
  'Catch missing pay before payroll closes',
];

export function AccessIntroScreen() {
  const { startTrial, startCheckout, checkoutLoading, checkoutFallbackUrl } = useSubscription();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-3 py-4 sm:px-4"
      style={{
        background:
          'radial-gradient(900px 500px at -5% -20%, rgba(59,130,246,0.38), transparent 62%), radial-gradient(860px 460px at 110% 110%, rgba(191,219,254,0.24), transparent 60%), linear-gradient(150deg, #07173F 0%, #072867 56%, #0B5FFF 100%)',
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border shadow-2xl" style={{ borderColor: 'rgba(191,219,254,0.7)', background: '#F8FBFF' }}>
        <div className="border-b px-5 py-5 sm:px-8 sm:py-7 md:px-10" style={{ borderColor: '#DBEAFE', background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FBFF 100%)' }}>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: '#BFDBFE', color: '#1E3A8A', background: '#FFFFFF' }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} />
            First-time access
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight" style={{ color: '#0F172A' }}>
            Welcome to RO Navigator
          </h1>
          <p className="mt-2 text-sm md:text-base leading-snug" style={{ color: '#475569' }}>
            Track every RO. Verify every hour. Keep your pay-period records clear and easy to prove.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
            {valuePoints.map((point) => (
              <div key={point} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: '#DBEAFE', background: '#FFFFFF', color: '#0F172A' }}>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#0B5FFF' }} />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-5 sm:px-8 sm:py-7 md:px-10">
          <div className="rounded-2xl border p-4 sm:p-5 md:p-6 shadow-[0_12px_25px_-22px_rgba(11,95,255,0.75)]" style={{ borderColor: '#BFDBFE', background: '#FFFFFF' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1D4ED8' }}>Access options</p>
            <p className="mt-2 text-sm" style={{ color: '#1E3A8A' }}>
              Your trial starts when you choose it.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs" style={{ color: '#475569' }}>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} /> 14-day trial</span>
              <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} /> $15.99 one-time</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} /> No monthly fee</span>
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <Button
              onClick={() => void startTrial()}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white shadow-[0_8px_18px_-12px_rgba(11,95,255,0.8)]"
              style={{ background: 'linear-gradient(90deg, #0B5FFF 0%, #1D4ED8 100%)' }}
            >
              Start 14-Day Free Trial
            </Button>

            {checkoutFallbackUrl ? (
              <a
                href={checkoutFallbackUrl}
                className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold shadow-[0_8px_18px_-14px_rgba(15,23,42,0.45)]"
                style={{ border: '1px solid #BFDBFE', color: '#0F172A', background: '#FFFFFF' }}
              >
                Continue to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            ) : (
              <Button
                variant="outline"
                onClick={startCheckout}
                disabled={checkoutLoading}
                className="w-full h-11 rounded-xl text-sm font-semibold shadow-[0_8px_18px_-14px_rgba(15,23,42,0.45)]"
                style={{ borderColor: '#BFDBFE', color: '#0F172A', background: '#FFFFFF' }}
              >
                {checkoutLoading ? 'Opening checkout…' : 'Buy Full Access — $15.99 one time'}
              </Button>
            )}
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed" style={{ color: '#64748B' }}>
            Secure checkout with Stripe. No monthly fee. Lifetime access after purchase.
          </p>
        </div>
      </div>
    </div>
  );
}
