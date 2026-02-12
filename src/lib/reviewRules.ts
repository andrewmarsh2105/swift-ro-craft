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
}

/**
 * Pure, deterministic review-issue computation.
 * Call on every render / after every save — no caching, no stored booleans.
 */
export function getReviewIssues(ro: RepairOrder, allROs: RepairOrder[]): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  // Rule 1 – Missing hours (non-TBD lines with a description but 0 hours)
  if (ro.lines?.length > 0) {
    ro.lines.forEach((line) => {
      if (!line.isTbd && line.description && (line.hoursPaid === 0 || line.hoursPaid == null)) {
        issues.push({
          code: 'missing_hours',
          title: 'Missing hours',
          detail: `Line ${line.lineNo}: "${line.description}" has 0 paid hours.`,
          suggestedAction: 'go_to_line',
          severity: 'warning',
          roId: ro.id,
          lineId: line.id,
          lineNo: line.lineNo,
        });
      }
    });
  }

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
      });
    }
  }

  return issues;
}
