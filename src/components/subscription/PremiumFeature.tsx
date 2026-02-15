import { useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradePrompt } from './UpgradePrompt';
import { Loader2 } from 'lucide-react';

interface PremiumFeatureProps {
  feature: string;
  children: React.ReactNode;
}

export function PremiumFeature({ feature, children }: PremiumFeatureProps) {
  const { isPro, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPro) {
    return <UpgradePrompt feature={feature} />;
  }

  return <>{children}</>;
}
