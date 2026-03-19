/**
 * IndexedDB-based offline queue for pending mutations.
 * Each queued action is stored with a timestamp and replayed in order on reconnect.
 */

export type QueuedActionType =
  | 'addRO'
  | 'updateRO'
  | 'deleteRO'
  | 'addFlag'
  | 'clearFlag'
  | 'uploadPhoto'
  | 'addAdvisor'
  | 'deleteAdvisor';

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: any;
  createdAt: string;
  retries: number;
  blocked?: boolean;
  lastError?: string;
}

export interface SyncConflict {
  queuedAction: QueuedAction;
  error: string;
}

const DB_NAME = 'ro-offline-queue';
const STORE_NAME = 'actions';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries'>): Promise<QueuedAction> {
  const db = await openDB();

  // Deduplication: check for existing actions that should be replaced
  const existing = await new Promise<QueuedAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedAction[]);
    req.onerror = () => reject(req.error);
  });

  // For addRO: skip if same roNumber already queued
  if (action.type === 'addRO' && action.payload?.ro?.roNumber) {
    const dup = existing.find(
      e => e.type === 'addRO' && e.payload?.ro?.roNumber === action.payload.ro.roNumber
    );
    if (dup) return dup; // Already queued, return existing
  }

  // For updateRO/deleteRO: replace existing action for same id
  if ((action.type === 'updateRO' || action.type === 'deleteRO') && action.payload?.id) {
    const dup = existing.find(
      e => (e.type === 'updateRO' || e.type === 'deleteRO') && e.payload?.id === action.payload.id
    );
    if (dup) {
      // Remove old entry and insert new one with same id
      const item: QueuedAction = { ...action, id: dup.id, createdAt: dup.createdAt, retries: 0 };
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve(item);
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  const item: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllQueued(): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const items = (req.result as QueuedAction[]).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function incrementRetry(id: string, error?: string, blocked: boolean = false): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as QueuedAction;
      if (item) {
        item.retries += 1;
        item.blocked = blocked;
        item.lastError = error || item.lastError;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetRetry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as QueuedAction;
      if (item) {
        item.retries = 0;
        item.blocked = false;
        item.lastError = undefined;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
