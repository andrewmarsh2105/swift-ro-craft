/** Shared UI timing constants — single source of truth for animation/feedback durations */
export const UI_TIMEOUTS = {
  /** Duration for highlight animations on newly added/changed rows */
  HIGHLIGHT_MS: 2500,
  /** Duration for "saved" / "copied" status feedback text */
  STATUS_FEEDBACK_MS: 2500,
  /** Shorter feedback for clipboard copy toasts */
  TOAST_FEEDBACK_MS: 2000,
  /** Brief delay before auto-focus (allows layout to settle) */
  FOCUS_DELAY_MS: 50,
} as const;

/** RO store fetch limits */
export const FETCH_LIMITS = {
  /** Days of data to fetch immediately (hot window) */
  HOT_WINDOW_DAYS: 120,
  /** Max ROs in phase 1 fetch */
  PHASE1_RO_LIMIT: 3000,
  /** Max lines in phase 1 fetch */
  PHASE1_LINE_LIMIT: 10000,
  /** Max ROs in phase 2 (background) fetch */
  PHASE2_RO_LIMIT: 7000,
} as const;
