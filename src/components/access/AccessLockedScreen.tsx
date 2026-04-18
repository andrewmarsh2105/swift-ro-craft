import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';

export function AccessLockedScreen() {
  const { startCheckout, checkoutLoading, checkoutFallbackUrl } = useSubscription();
  const { signOut } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(1200px 500px at 10% -10%, rgba(45,212,191,0.18), transparent 60%), linear-gradient(145deg, #062F2C 0%, #052826 55%, #041D1C 100%)',
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border p-8 md:p-10 text-center shadow-2xl" style={{ background: '#F5FBFA', borderColor: '#D7ECE8' }}>
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: '#0F766E' }}>
          <Lock className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: '#0F172A' }}>
          Your 14-day free trial has ended
        </h1>
        <p className="mt-3 text-base" style={{ color: '#4B5563' }}>
          Unlock RO Navigator for a one-time $15.99
        </p>
        <p className="mt-1.5 text-sm" style={{ color: '#0F766E' }}>
          No subscription. Lifetime access after purchase.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {[
            { icon: ShieldCheck, text: 'Lifetime unlock' },
            { icon: Sparkles, text: 'No monthly fee' },
            { icon: ShieldCheck, text: 'Instant access sync' },
          ].map((item) => (
            <div key={item.text} className="rounded-lg border px-3 py-2 flex items-center justify-center gap-1.5" style={{ borderColor: '#D7ECE8', color: '#0F172A' }}>
              <item.icon className="h-3.5 w-3.5" style={{ color: '#0F766E' }} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-7 space-y-3">
          {checkoutFallbackUrl ? (
            <a
              href={checkoutFallbackUrl}
              className="flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold text-white"
              style={{ background: '#0F766E' }}
            >
              Continue to Checkout
            </a>
          ) : (
            <Button
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="w-full h-12 text-sm font-semibold text-white"
              style={{ background: '#0F766E' }}
            >
              {checkoutLoading ? 'Opening checkout…' : 'Unlock Full Access'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full h-11"
            style={{ borderColor: '#D7ECE8', color: '#0F172A' }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
