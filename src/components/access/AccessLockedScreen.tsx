import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Lock, RefreshCw, ShieldCheck, Sparkles, Wallet, CreditCard } from 'lucide-react';

export function AccessLockedScreen() {
  const { startCheckout, checkoutLoading, checkoutFallbackUrl, checkAccess } = useSubscription();
  const { signOut } = useAuth();

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
            <Lock className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} />
            Access locked
          </div>
          <h1 className="mt-3.5 text-xl sm:text-2xl md:text-3xl font-bold tracking-tight" style={{ color: '#0F172A' }}>
            Your free trial has ended
          </h1>
          <p className="mt-2 text-sm md:text-base leading-snug" style={{ color: '#475569' }}>
            Unlock full RO Navigator access with one quick, one-time payment.
          </p>
        </div>

        <div className="px-5 py-5 sm:px-8 sm:py-7 md:px-10">
          <div className="rounded-2xl border p-4 sm:p-5 md:p-6 shadow-[0_12px_24px_-18px_rgba(11,95,255,0.75)]" style={{ borderColor: '#BFDBFE', background: '#FFFFFF' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1D4ED8' }}>Lifetime access</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-3xl sm:text-4xl font-bold leading-none" style={{ color: '#0F172A' }}>$15.99</p>
              <p className="pb-1 text-sm" style={{ color: '#64748B' }}>one-time payment</p>
            </div>
            <p className="mt-2 text-sm leading-snug" style={{ color: '#1E3A8A' }}>No subscription. Lifetime access stays unlocked permanently.</p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
            {[
              { icon: ShieldCheck, text: 'Keep all saved records' },
              { icon: Wallet, text: 'No monthly billing' },
              { icon: Sparkles, text: 'Unlock in minutes' },
            ].map((item) => (
              <div key={item.text} className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2" style={{ borderColor: '#DBEAFE', color: '#0F172A', background: '#FFFFFF' }}>
                <item.icon className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2.5">
            {checkoutFallbackUrl ? (
              <a
                href={checkoutFallbackUrl}
                className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-[0_8px_18px_-12px_rgba(11,95,255,0.8)]"
                style={{ background: 'linear-gradient(90deg, #0B5FFF 0%, #1D4ED8 100%)' }}
              >
                Continue to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            ) : (
              <Button
                onClick={startCheckout}
                disabled={checkoutLoading}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white shadow-[0_8px_18px_-12px_rgba(11,95,255,0.8)]"
                style={{ background: 'linear-gradient(90deg, #0B5FFF 0%, #1D4ED8 100%)' }}
              >
                {checkoutLoading ? 'Opening checkout…' : 'Buy Full Access — $15.99'}
              </Button>
            )}
            <p className="text-center text-xs leading-relaxed" style={{ color: '#64748B' }}>
              Your saved ROs stay available after you unlock. Secure checkout is handled by Stripe.
            </p>
            <div className="rounded-lg border px-3 py-2 text-center text-[11px]" style={{ borderColor: '#DBEAFE', background: '#FFFFFF', color: '#475569' }}>
              <span className="inline-flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" style={{ color: '#0B5FFF' }} />
                Already unlocked accounts are never charged again.
              </span>
            </div>
            <Button
              variant="ghost"
              onClick={() => void checkAccess()}
              className="w-full h-10 text-sm"
              style={{ color: '#334155' }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Already paid? Refresh access
            </Button>
            <Button
              variant="outline"
              onClick={signOut}
              className="w-full h-11"
              style={{ borderColor: '#DBEAFE', color: '#0F172A' }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
