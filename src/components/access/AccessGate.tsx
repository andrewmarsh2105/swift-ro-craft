import type { ReactNode } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AccessLockedScreen } from './AccessLockedScreen';
import { AccessIntroScreen } from './AccessIntroScreen';
import { useAuth } from '@/contexts/AuthContext';

export function AccessGate({ children }: { children: ReactNode }) {
  const { accessState, accessError, checkAccess, accessStatus } = useSubscription();
  const { signOut } = useAuth();

  if (accessState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">We couldn&apos;t verify access right now</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {accessError ?? 'This looks like a temporary connection issue. Your access has not changed.'}
          </p>
          <Button className="mt-5 w-full" onClick={() => void checkAccess()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
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

  return <>{children}</>;
}
