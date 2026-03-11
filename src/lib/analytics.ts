/**
 * GA4 Analytics helper with deduplication.
 * Events are deduped per session using sessionStorage keys.
 */

const GA_ID = 'G-526451525';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
}

/** Dedupe key: event + userId (or 'anon') + date */
function dedupeKey(event: string, userId?: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `ga_sent_${event}_${userId || 'anon'}_${day}`;
}

function alreadySent(event: string, userId?: string): boolean {
  try {
    return sessionStorage.getItem(dedupeKey(event, userId)) === '1';
  } catch {
    return false;
  }
}

function markSent(event: string, userId?: string) {
  try {
    sessionStorage.setItem(dedupeKey(event, userId), '1');
  } catch {}
}

/**
 * signup_completed — fire once per session after successful sign-up
 */
export function trackSignupCompleted(userId: string) {
  if (alreadySent('signup_completed', userId)) return;
  gtag('event', 'signup_completed', {
    send_to: GA_ID,
    user_id: userId,
  });
  markSent('signup_completed', userId);
}

/**
 * checkout_started — fire once per session when checkout URL is received
 */
export function trackCheckoutStarted(userId: string, plan: string) {
  if (alreadySent('checkout_started', userId)) return;
  gtag('event', 'checkout_started', {
    send_to: GA_ID,
    user_id: userId,
    plan,
  });
  markSent('checkout_started', userId);
}

/**
 * purchase_completed — fire once per session when Pro becomes active
 */
export function trackPurchaseCompleted(userId: string) {
  if (alreadySent('purchase_completed', userId)) return;
  gtag('event', 'purchase_completed', {
    send_to: GA_ID,
    user_id: userId,
  });
  markSent('purchase_completed', userId);
}
