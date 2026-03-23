import type { RepairOrder } from '@/types/ro';

export type ReviewSeverity = 'warning' | 'error';

export interface ReviewIssue {
  code: string;
  title: string;
  detail: string;
  suggestedAction: 'go_to_line' | 'convert_to_flag' | 'info';
  severity: ReviewSeverity;
  roId: string;
  lineId?: string;
  lineNo?: number;
  duplicateRoIds?: string[];
}

/**
 * Pure, deterministic review-issue computation.
 * Call on every render / after every save — no caching, no stored booleans.
 */
export function getReviewIssues(ro: RepairOrder, allROs: RepairOrder[]): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  // Rule 1 – reserved for future use (missing_hours removed — 0h lines are valid)

  // Rule 2 – Duplicate RO number
  if (ro.roNumber !== '') {
    const dupes = allROs.filter((r) => r.id !== ro.id && r.roNumber === ro.roNumber);
    if (dupes.length > 0) {
      issues.push({
        code: 'duplicate_ro',
        title: 'Duplicate RO #',
        detail: `RO #${ro.roNumber} appears ${dupes.length + 1} times. Consider renumbering or removing a duplicate.`,
        suggestedAction: 'info',
        severity: 'error',
        roId: ro.id,
        duplicateRoIds: dupes.map((d) => d.id),
      });
    }
  }

  return issues;
}
