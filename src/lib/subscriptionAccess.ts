export type StripeSubscriptionStatus =
  | 'trialing'
  | 'lifetime'
  | 'expired'
  | 'override'
  | null;

export function hasProAccess(status: StripeSubscriptionStatus): boolean {
  return status === 'trialing' || status === 'lifetime' || status === 'override';
}

export function hasBillingIssue(_status: StripeSubscriptionStatus): boolean {
  return false;
}
