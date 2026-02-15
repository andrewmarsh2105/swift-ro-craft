import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';

interface UpgradePromptProps {
  feature: string;
}

export function UpgradePrompt({ feature }: UpgradePromptProps) {
  const { openCheckout } = useSubscription();

  const handleUpgrade = async () => {
    try {
      await openCheckout();
    } catch {
      toast.error('Failed to open checkout. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="p-4 bg-primary/10 rounded-full">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold">Pro Feature</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {feature} is available on the Pro plan. Upgrade to unlock this and more.
      </p>
      <button
        onClick={handleUpgrade}
        className="py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Upgrade to Pro — $9.99/mo
      </button>
    </div>
  );
}
