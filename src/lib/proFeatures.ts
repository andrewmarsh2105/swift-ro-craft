/**
 * src/lib/proFeatures.ts
 *
 * Single source of truth for upgrade feature definitions,
 * and contextual upgrade messaging. Import from here instead of hardcoding
 * values across components.
 */

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
    headline: 'Unlock full access',
    pitch: 'Your trial ended. Unlock RO Navigator once and keep lifetime access.',
    highlightFeature: 'Unlimited ROs',
  },
  'scan': {
    headline: 'Scan ROs with your camera',
    pitch: 'Take a photo of your RO — RO Navigator reads the lines and fills them in automatically. No more typing every job.',
    highlightFeature: 'Scan ROs with your phone',
  },
  'spreadsheet': {
    headline: 'See every line at once',
    pitch: 'Spreadsheet view shows all your ROs in one scrollable table — the fastest way to catch missing hours before payday.',
    highlightFeature: 'Export reports',
  },
  'export': {
    headline: 'Your pay period is done — lock it in',
    pitch: 'Export a complete period report for your records — every RO, every line, and total hours in one clean file.',
    highlightFeature: 'Export reports',
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
    headline: 'Unlock RO Navigator',
    pitch: '14-day free trial, then one-time $15.99 for lifetime access.',
    highlightFeature: undefined,
  },
};
