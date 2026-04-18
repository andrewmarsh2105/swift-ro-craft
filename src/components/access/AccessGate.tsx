import type { ReactNode } from 'react';
import { AlertCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AccessLockedScreen } from './AccessLockedScreen';
import { AccessIntroScreen } from './AccessIntroScreen';
import { useAuth } from '@/contexts/AuthContext';

const gateBackground = {
  background:
    'radial-gradient(900px 500px at -5% -20%, rgba(59,130,246,0.3), transparent 62%), radial-gradient(860px 460px at 110% 110%, rgba(191,219,254,0.22), transparent 60%), linear-gradient(150deg, #07173F 0%, #072867 56%, #0B5FFF 100%)',
};

export function AccessGate({ children }: { children: ReactNode }) {
  const { accessState, accessError, checkAccess, accessStatus } = useSubscription();
  const { signOut } = useAuth();

  if (accessState === 'loading') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={gateBackground}
      >
        <div className="w-full max-w-md rounded-2xl border bg-white/95 p-6 text-center shadow-sm" style={{ borderColor: '#DBEAFE' }}>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: '#EFF6FF', color: '#0B5FFF' }}>
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <h1 className="text-base font-semibold text-slate-900">Checking your RO Navigator access</h1>
          <p className="mt-2 text-sm text-slate-600">This usually takes just a moment.</p>
        </div>
      </div>
    );
  }

  if (accessState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={gateBackground}>
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm" style={{ borderColor: '#DBEAFE' }}>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: '#EFF6FF', color: '#0B5FFF' }}>
            <AlertCircle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Temporary connection issue</h1>
          <p className="mt-2 text-sm text-slate-600">
            {accessError ?? 'We could not refresh your access status right now. Your account state has not changed.'}
          </p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium text-slate-600" style={{ borderColor: '#DBEAFE' }}>
            <ShieldCheck className="h-3.5 w-3.5 text-[#0B5FFF]" />
            This is not a paywall state
          </div>
          <Button className="mt-5 w-full" onClick={() => void checkAccess()} style={{ background: 'linear-gradient(90deg, #0B5FFF 0%, #1D4ED8 100%)' }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry access check
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (accessStatus === 'eligible') {
    return <AccessIntroScreen />;
  }

  if (accessStatus === 'expired') {
    return <AccessLockedScreen />;
  }

  if (accessStatus === 'trialing' || accessStatus === 'lifetime' || accessStatus === 'override') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={gateBackground}>
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm" style={{ borderColor: '#DBEAFE' }}>
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: '#EFF6FF', color: '#0B5FFF' }}>
          <AlertCircle className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Unable to verify access state</h1>
        <p className="mt-2 text-sm text-slate-600">
          We received an unexpected access response. Please retry your access check.
        </p>
        <Button className="mt-5 w-full" onClick={() => void checkAccess()} style={{ background: 'linear-gradient(90deg, #0B5FFF 0%, #1D4ED8 100%)' }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry access check
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
