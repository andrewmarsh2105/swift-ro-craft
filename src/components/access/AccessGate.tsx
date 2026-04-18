import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AccessLockedScreen } from './AccessLockedScreen';

export function AccessGate({ children }: { children: ReactNode }) {
  const { accessState, accessError, checkAccess, isPro } = useSubscription();

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
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Could not verify access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {accessError ?? 'Please check your connection and try again.'}
          </p>
          <Button className="mt-5 w-full" onClick={() => void checkAccess()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry access check
          </Button>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return <AccessLockedScreen />;
  }

  return <>{children}</>;
}
