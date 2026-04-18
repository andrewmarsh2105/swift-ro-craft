import { describe, expect, it } from 'vitest';
import { hasBillingIssue, hasProAccess, type StripeSubscriptionStatus } from './subscriptionAccess';

describe('subscriptionAccess', () => {
  it('grants app access only for trialing/lifetime/override states', () => {
    const statuses: StripeSubscriptionStatus[] = [
      'trialing',
      'lifetime',
      'override',
      'expired',
      null,
    ];

    const granted = statuses.filter((status) => hasProAccess(status));
    expect(granted).toEqual(['trialing', 'lifetime', 'override']);
  });

  it('never reports billing issues in one-time lifetime model', () => {
    expect(hasBillingIssue('trialing')).toBe(false);
    expect(hasBillingIssue('lifetime')).toBe(false);
    expect(hasBillingIssue('override')).toBe(false);
    expect(hasBillingIssue('expired')).toBe(false);
    expect(hasBillingIssue(null)).toBe(false);
  });
});
