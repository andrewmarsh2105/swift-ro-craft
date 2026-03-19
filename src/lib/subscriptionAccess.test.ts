import { describe, expect, it } from 'vitest';
import { hasBillingIssue, hasProAccess, type StripeSubscriptionStatus } from './subscriptionAccess';

describe('subscriptionAccess', () => {
  it('grants Pro access only for active/trialing/override states', () => {
    const statuses: StripeSubscriptionStatus[] = [
      'active',
      'trialing',
      'override',
      'past_due',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'canceled',
      null,
    ];

    const granted = statuses.filter((status) => hasProAccess(status));
    expect(granted).toEqual(['active', 'trialing', 'override']);
  });

  it('flags billing issues only for recoverable payment states', () => {
    expect(hasBillingIssue('past_due')).toBe(true);
    expect(hasBillingIssue('unpaid')).toBe(true);
    expect(hasBillingIssue('incomplete')).toBe(true);

    expect(hasBillingIssue('active')).toBe(false);
    expect(hasBillingIssue('trialing')).toBe(false);
    expect(hasBillingIssue('canceled')).toBe(false);
    expect(hasBillingIssue('incomplete_expired')).toBe(false);
    expect(hasBillingIssue(null)).toBe(false);
  });
});
