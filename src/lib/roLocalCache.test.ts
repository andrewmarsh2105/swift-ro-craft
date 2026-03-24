/**
 * Tests for roLocalCache.ts — the IndexedDB read-cache that lets the app
 * display ROs while offline.
 *
 * Uses fake-indexeddb to avoid needing a real browser environment.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { saveROsToCache, loadROsFromCache, clearROsCache } from '@/lib/roLocalCache';
import type { RepairOrder } from '@/types/ro';

function makeRO(id: string, roNumber: string): RepairOrder {
  return {
    id,
    roNumber,
    date: '2026-03-01',
    advisor: 'Test',
    paidHours: 0,
    laborType: 'customer-pay',
    workPerformed: '',
    lines: [],
    isSimpleMode: true,
    photos: [],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };
}

beforeEach(async () => {
  await clearROsCache('user-a');
  await clearROsCache('user-b');
});

describe('roLocalCache — loadROsFromCache', () => {
  it('returns null when nothing has been cached for a user', async () => {
    const result = await loadROsFromCache('user-a');
    expect(result).toBeNull();
  });
});

describe('roLocalCache — saveROsToCache + loadROsFromCache', () => {
  it('saves and retrieves a snapshot for a user', async () => {
    const ros = [makeRO('ro-1', '1001'), makeRO('ro-2', '1002')];
    await saveROsToCache('user-a', ros);

    const result = await loadROsFromCache('user-a');
    expect(result).not.toBeNull();
    expect(result!.ros).toHaveLength(2);
    expect(result!.ros.map(r => r.roNumber)).toEqual(['1001', '1002']);
  });

  it('includes a savedAt timestamp', async () => {
    const before = new Date().toISOString();
    await saveROsToCache('user-a', [makeRO('ro-1', '1001')]);
    const result = await loadROsFromCache('user-a');
    const after = new Date().toISOString();

    expect(result!.savedAt >= before).toBe(true);
    expect(result!.savedAt <= after).toBe(true);
  });

  it('overwrites the previous snapshot on subsequent saves (one snapshot per user)', async () => {
    await saveROsToCache('user-a', [makeRO('ro-1', '1001'), makeRO('ro-2', '1002')]);
    await saveROsToCache('user-a', [makeRO('ro-3', '2000')]);

    const result = await loadROsFromCache('user-a');
    expect(result!.ros).toHaveLength(1);
    expect(result!.ros[0].roNumber).toBe('2000');
  });

  it('saves an empty list without error', async () => {
    await saveROsToCache('user-a', []);
    const result = await loadROsFromCache('user-a');
    expect(result!.ros).toEqual([]);
  });
});

describe('roLocalCache — user isolation', () => {
  it('keeps user-a and user-b snapshots independent', async () => {
    const rosA = [makeRO('ro-1', '1001')];
    const rosB = [makeRO('ro-2', '2001'), makeRO('ro-3', '2002')];

    await saveROsToCache('user-a', rosA);
    await saveROsToCache('user-b', rosB);

    const resultA = await loadROsFromCache('user-a');
    const resultB = await loadROsFromCache('user-b');

    expect(resultA!.ros).toHaveLength(1);
    expect(resultB!.ros).toHaveLength(2);
  });
});

describe('roLocalCache — clearROsCache', () => {
  it('removes the snapshot for the specified user', async () => {
    await saveROsToCache('user-a', [makeRO('ro-1', '1001')]);
    await clearROsCache('user-a');
    expect(await loadROsFromCache('user-a')).toBeNull();
  });

  it('does not affect other users when clearing one user', async () => {
    await saveROsToCache('user-a', [makeRO('ro-1', '1001')]);
    await saveROsToCache('user-b', [makeRO('ro-2', '2001')]);

    await clearROsCache('user-a');

    expect(await loadROsFromCache('user-a')).toBeNull();
    expect(await loadROsFromCache('user-b')).not.toBeNull();
  });

  it('is a no-op when no snapshot exists for the user', async () => {
    await expect(clearROsCache('nonexistent-user')).resolves.not.toThrow();
  });
});
