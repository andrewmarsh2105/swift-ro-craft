export type FlagType = 'needs_time' | 'questionable' | 'waiting' | 'advisor_question' | 'other';

export interface ROFlag {
  id: string;
  userId: string;
  roId: string;
  roLineId?: string | null;
  flagType: FlagType;
  note?: string | null;
  createdAt: string;
  clearedAt?: string | null;
}

export const FLAG_TYPE_LABELS: Record<FlagType, string> = {
  needs_time: 'Needs Time',
  questionable: 'Questionable',
  waiting: 'Waiting',
  advisor_question: 'Advisor Question',
  other: 'Other',
};

export const FLAG_TYPE_COLORS: Record<FlagType, string> = {
  needs_time: 'text-orange-500',
  questionable: 'text-yellow-500',
  waiting: 'text-blue-500',
  advisor_question: 'text-purple-500',
  other: 'text-muted-foreground',
};

export const FLAG_TYPE_BG: Record<FlagType, string> = {
  needs_time: 'bg-orange-500/10',
  questionable: 'bg-yellow-500/10',
  waiting: 'bg-blue-500/10',
  advisor_question: 'bg-purple-500/10',
  other: 'bg-muted',
};

// ReviewIssue type has moved to src/lib/reviewRules.ts
