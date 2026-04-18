import { describe, expect, it } from 'vitest';
import { hasProAccess, type AccessStatus } from './subscriptionAccess';

describe('subscriptionAccess', () => {
  it('grants app access only for trialing/lifetime/override states', () => {
    const statuses: AccessStatus[] = [
      'trialing',
      'lifetime',
      'override',
      'expired',
      null,
    ];

    const granted = statuses.filter((status) => hasProAccess(status));
    expect(granted).toEqual(['trialing', 'lifetime', 'override']);
  });
});
