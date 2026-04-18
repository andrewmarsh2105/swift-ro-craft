/**
 * Access status model for RO Navigator's current business rules:
 * 14-day free trial, then one-time lifetime unlock (no recurring plans).
 *
 * Some callers still use legacy "subscription" naming, but this union
 * represents access states rather than monthly/yearly billing plans.
 */
export type AccessStatus =
  | 'trialing'
  | 'lifetime'
  | 'expired'
  | 'override'
  | null;

export function hasProAccess(status: AccessStatus): boolean {
  return status === 'trialing' || status === 'lifetime' || status === 'override';
}
