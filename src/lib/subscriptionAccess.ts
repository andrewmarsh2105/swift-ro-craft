export type StripeSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'canceled'
  | 'override'
  | null;

export function hasProAccess(status: StripeSubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing' || status === 'override';
}

export function hasBillingIssue(status: StripeSubscriptionStatus): boolean {
  return status === 'past_due' || status === 'unpaid' || status === 'incomplete';
}
