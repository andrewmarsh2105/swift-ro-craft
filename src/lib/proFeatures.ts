/**
 * src/lib/proFeatures.ts
 *
 * Single source of truth for Pro tier constants, feature definitions,
 * and contextual upgrade messaging. Import from here instead of hardcoding
 * values across components.
 */

/** Free-tier monthly RO cap. */
export const RO_MONTHLY_CAP = 150;

/** Every defined upgrade trigger context in the app. */
export type UpgradeTrigger =
  | 'ro-cap'
  | 'scan'
  | 'spreadsheet'
  | 'export'
  | 'closeout'
  | 'compare'
  | 'generic';

export interface UpgradeContext {
  /** Short headline shown at top of the dialog. */
  headline: string;
  /** One-sentence payoff pitch. */
  pitch: string;
  /** Which feature card to visually highlight in the feature list. */
  highlightFeature?: string;
}

/**
 * Contextual upgrade messaging keyed by the trigger location.
 * Use this to show relevant copy instead of the generic "Don't leave hours on the table."
 */
export const UPGRADE_CONTEXT: Record<UpgradeTrigger, UpgradeContext> = {
  'ro-cap': {
    headline: 'You hit your monthly limit',
    pitch: `Free accounts are capped at ${RO_MONTHLY_CAP} ROs/month. Go Pro and log every RO, every day — no cap.`,
    highlightFeature: 'Unlimited ROs',
  },
  'scan': {
    headline: 'Scan ROs with your camera',
    pitch: 'Take a photo of your RO — Pro reads the lines and fills them in automatically. No more typing every job.',
    highlightFeature: 'Scan ROs with your phone',
  },
  'spreadsheet': {
    headline: 'Spreadsheet view is Pro',
    pitch: 'See every line in a sortable, filterable table — the fastest way to review your pay period before submitting.',
    highlightFeature: 'Full exports',
  },
  'export': {
    headline: 'Export your records',
    pitch: 'Download payroll CSV, audit XLSX, or PDF for any date range — so you have proof when it matters.',
    highlightFeature: 'Full exports',
  },
  'closeout': {
    headline: 'Lock in your pay period',
    pitch: "Freeze a snapshot when the period closes — so your records can't change after payday.",
    highlightFeature: 'Pay period closeouts & comparison',
  },
  'compare': {
    headline: 'Compare two pay periods',
    pitch: 'See two periods side by side — catch patterns, flag discrepancies, and prove your hours.',
    highlightFeature: 'Pay period closeouts & comparison',
  },
  'generic': {
    headline: 'Upgrade to Pro',
    pitch: "Don't leave hours on the table. Get the full picture — every RO, every period, every export.",
    highlightFeature: undefined,
  },
};
