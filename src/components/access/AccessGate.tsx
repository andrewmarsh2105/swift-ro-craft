import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AccessLockedScreen } from './AccessLockedScreen';

export function AccessGate({ children }: { children: ReactNode }) {
  const { loading, isPro } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPro) {
    return <AccessLockedScreen />;
  }

  return <>{children}</>;
}
