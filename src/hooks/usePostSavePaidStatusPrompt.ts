import { useCallback, useMemo, useState } from 'react';
import { localDateStr } from '@/lib/utils';
import { toast } from 'sonner';
import type { PostSaveStatusChoice } from '@/components/shared/PostSavePaidStatusPrompt';

interface PendingROStatusChoice {
  roId: string;
  roNumber?: string;
  onComplete?: () => void;
}

interface UsePostSavePaidStatusPromptArgs {
  updateRO: (id: string, updates: { paidDate: string }) => Promise<boolean>;
}

export function usePostSavePaidStatusPrompt({ updateRO }: UsePostSavePaidStatusPromptArgs) {
  const [pending, setPending] = useState<PendingROStatusChoice | null>(null);
  const [isSavingChoice, setIsSavingChoice] = useState(false);

  const requestStatusChoice = useCallback((choice: PendingROStatusChoice) => {
    setPending(choice);
  }, []);

  const resolveChoice = useCallback(async (selection: PostSaveStatusChoice) => {
    if (!pending || isSavingChoice) return;

    setIsSavingChoice(true);
    try {
      const paidDate = selection === 'paid' ? localDateStr() : '';
      const success = await updateRO(pending.roId, { paidDate });
      if (!success) return;

      if (selection === 'paid') {
        toast.success(`RO #${pending.roNumber || ''} marked paid`);
      } else {
        toast.success(`RO #${pending.roNumber || ''} saved as open`);
      }
      pending.onComplete?.();
      setPending(null);
    } finally {
      setIsSavingChoice(false);
    }
  }, [isSavingChoice, pending, updateRO]);

  const dismissPrompt = useCallback(() => {
    if (isSavingChoice) return;
    toast.message(`RO #${pending?.roNumber || ''} left open for now`);
    pending?.onComplete?.();
    setPending(null);
  }, [isSavingChoice, pending]);

  return useMemo(() => ({
    statusPromptOpen: !!pending,
    statusPromptRONumber: pending?.roNumber,
    isSavingChoice,
    requestStatusChoice,
    resolveChoice,
    dismissPrompt,
  }), [pending, isSavingChoice, requestStatusChoice, resolveChoice, dismissPrompt]);
}
