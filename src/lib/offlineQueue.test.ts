/**
 * Tests for offlineQueue.ts — the IndexedDB-backed write queue used to
 * buffer mutations while the device is offline.
 *
 * Uses fake-indexeddb to avoid needing a real browser environment.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { enqueue, dequeue, getAllQueued, incrementRetry, resetRetry, clearAll } from '@/lib/offlineQueue';

beforeEach(async () => {
  await clearAll();
});

describe('offlineQueue — enqueue & getAllQueued', () => {
  it('enqueues an action and retrieves it', async () => {
    await enqueue({ type: 'addRO', payload: { ro: { roNumber: '1001' } } });
    const queued = await getAllQueued();
    expect(queued).toHaveLength(1);
    expect(queued[0].type).toBe('addRO');
    expect(queued[0].retries).toBe(0);
    expect(queued[0].id).toBeTruthy();
    expect(queued[0].createdAt).toBeTruthy();
  });

  it('returns actions sorted by createdAt ascending', async () => {
    await enqueue({ type: 'addRO', payload: { ro: { roNumber: '1001' } } });
    await enqueue({ type: 'addAdvisor', payload: { name: 'Mike' } });
    await enqueue({ type: 'deleteAdvisor', payload: { id: 'adv-5' } });

    const queued = await getAllQueued();
    expect(queued).toHaveLength(3);
    // Timestamps should be non-decreasing
    for (let i = 1; i < queued.length; i++) {
      expect(new Date(queued[i].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(queued[i - 1].createdAt).getTime()
      );
    }
  });
});

describe('offlineQueue — addRO deduplication', () => {
  it('does not enqueue a second addRO for the same RO number', async () => {
    await enqueue({ type: 'addRO', payload: { ro: { roNumber: '2000' } } });
    await enqueue({ type: 'addRO', payload: { ro: { roNumber: '2000' } } });

    const queued = await getAllQueued();
    expect(queued).toHaveLength(1);
  });

  it('enqueues addRO actions for different RO numbers separately', async () => {
    await enqueue({ type: 'addRO', payload: { ro: { roNumber: '2001' } } });
    await enqueue({ type: 'addRO', payload: { ro: { roNumber: '2002' } } });

    const queued = await getAllQueued();
    expect(queued).toHaveLength(2);
  });
});

describe('offlineQueue — updateRO/deleteRO deduplication', () => {
  it('replaces an existing updateRO for the same id rather than adding a duplicate', async () => {
    await enqueue({ type: 'updateRO', payload: { id: 'ro-abc', paidHours: 3 } });
    await enqueue({ type: 'updateRO', payload: { id: 'ro-abc', paidHours: 5 } });

    const queued = await getAllQueued();
    expect(queued).toHaveLength(1);
    expect(queued[0].payload.paidHours).toBe(5);
  });

  it('replaces an existing deleteRO for the same id', async () => {
    await enqueue({ type: 'deleteRO', payload: { id: 'ro-xyz' } });
    await enqueue({ type: 'deleteRO', payload: { id: 'ro-xyz' } });

    const queued = await getAllQueued();
    expect(queued).toHaveLength(1);
  });

  it('does not merge updateRO and deleteRO for different ids', async () => {
    await enqueue({ type: 'updateRO', payload: { id: 'ro-1' } });
    await enqueue({ type: 'updateRO', payload: { id: 'ro-2' } });

    const queued = await getAllQueued();
    expect(queued).toHaveLength(2);
  });
});

describe('offlineQueue — dequeue', () => {
  it('removes a specific action by id', async () => {
    const action = await enqueue({ type: 'addAdvisor', payload: { name: 'Alex' } });
    await enqueue({ type: 'addAdvisor', payload: { name: 'Sam' } });

    await dequeue(action.id);

    const queued = await getAllQueued();
    expect(queued).toHaveLength(1);
    expect(queued[0].payload.name).toBe('Sam');
  });

  it('is a no-op when id does not exist', async () => {
    await enqueue({ type: 'addAdvisor', payload: { name: 'Alex' } });
    await dequeue('nonexistent-id');
    expect(await getAllQueued()).toHaveLength(1);
  });
});

describe('offlineQueue — incrementRetry', () => {
  it('increments the retry count', async () => {
    const action = await enqueue({ type: 'deleteRO', payload: { id: 'ro-1' } });
    await incrementRetry(action.id, 'network timeout');

    const queued = await getAllQueued();
    expect(queued[0].retries).toBe(1);
    expect(queued[0].lastError).toBe('network timeout');
  });

  it('marks action as blocked when blocked=true', async () => {
    const action = await enqueue({ type: 'deleteRO', payload: { id: 'ro-2' } });
    await incrementRetry(action.id, 'conflict', true);

    const queued = await getAllQueued();
    expect(queued[0].blocked).toBe(true);
  });

  it('accumulates multiple retries', async () => {
    const action = await enqueue({ type: 'updateRO', payload: { id: 'ro-3' } });
    await incrementRetry(action.id);
    await incrementRetry(action.id);
    await incrementRetry(action.id);

    const queued = await getAllQueued();
    expect(queued[0].retries).toBe(3);
  });
});

describe('offlineQueue — resetRetry', () => {
  it('resets retries and blocked flag to initial values', async () => {
    const action = await enqueue({ type: 'updateRO', payload: { id: 'ro-4' } });
    await incrementRetry(action.id, 'err', true);
    await incrementRetry(action.id, 'err2');

    await resetRetry(action.id);

    const queued = await getAllQueued();
    expect(queued[0].retries).toBe(0);
    expect(queued[0].blocked).toBe(false);
    expect(queued[0].lastError).toBeUndefined();
  });
});

describe('offlineQueue — clearAll', () => {
  it('removes all queued actions', async () => {
    await enqueue({ type: 'addRO', payload: { ro: { roNumber: '3000' } } });
    await enqueue({ type: 'addRO', payload: { ro: { roNumber: '3001' } } });

    await clearAll();

    expect(await getAllQueued()).toHaveLength(0);
  });
});
