export type AccessStatus =
  | 'trialing'
  | 'lifetime'
  | 'expired'
  | 'override'
  | null;

export function hasProAccess(status: AccessStatus): boolean {
  return status === 'trialing' || status === 'lifetime' || status === 'override';
}
