export interface DebugEntry {
  timestamp: string;
  action: string;
  roId?: string;
  userId?: string;
  error?: string;
  lineCount?: number;
}

const MAX_ENTRIES = 50;

const debugLog: DebugEntry[] = [];
const emitter = new EventTarget();

export function pushDebug(entry: Omit<DebugEntry, "timestamp">): void {
  debugLog.unshift({
    ...entry,
    timestamp: new Date().toISOString().split("T")[1].split(".")[0],
  });

  if (debugLog.length > MAX_ENTRIES) debugLog.pop();
  emitter.dispatchEvent(new Event("update"));
}

export function getDebugEntries(): DebugEntry[] {
  return [...debugLog];
}

export function clearDebugEntries(): void {
  debugLog.length = 0;
  emitter.dispatchEvent(new Event("update"));
}

export function subscribeDebug(onUpdate: () => void): () => void {
  const handler = () => onUpdate();
  emitter.addEventListener("update", handler);
  return () => emitter.removeEventListener("update", handler);
}
