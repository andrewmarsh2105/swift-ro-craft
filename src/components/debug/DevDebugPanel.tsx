import { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, X } from 'lucide-react';

interface DebugEntry {
  timestamp: string;
  action: string;
  roId?: string;
  userId?: string;
  error?: string;
  lineCount?: number;
}

// Global debug log accessible from anywhere
const debugLog: DebugEntry[] = [];
const MAX_ENTRIES = 20;

export function pushDebug(entry: Omit<DebugEntry, 'timestamp'>) {
  debugLog.unshift({
    ...entry,
    timestamp: new Date().toISOString().split('T')[1].split('.')[0],
  });
  if (debugLog.length > MAX_ENTRIES) debugLog.pop();
  // Trigger re-render if panel is mounted
  window.dispatchEvent(new CustomEvent('debug-update'));
}

export function DevDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<DebugEntry[]>([...debugLog]);

  // Listen for updates
  useState(() => {
    const handler = () => setEntries([...debugLog]);
    window.addEventListener('debug-update', handler);
    return () => window.removeEventListener('debug-update', handler);
  });

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-2 left-2 z-[9999] max-w-sm">
      <button
        onClick={() => {
          setEntries([...debugLog]);
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1 px-2 py-1 bg-orange-600 text-white text-xs rounded shadow-lg"
      >
        <Bug className="h-3 w-3" />
        Debug
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
      
      {isOpen && (
        <div className="mt-1 bg-gray-900 text-gray-100 rounded shadow-xl border border-gray-700 max-h-64 overflow-y-auto text-[11px] font-mono">
          <div className="p-2 border-b border-gray-700 flex justify-between items-center">
            <span className="font-bold">RO Debug Log</span>
            <button onClick={() => { debugLog.length = 0; setEntries([]); }}>
              <X className="h-3 w-3" />
            </button>
          </div>
          {entries.length === 0 ? (
            <div className="p-2 text-gray-500">No entries yet. Save an RO to see logs.</div>
          ) : (
            entries.map((e, i) => (
              <div key={i} className="p-1.5 border-b border-gray-800 last:border-0">
                <div className="flex gap-2">
                  <span className="text-gray-500">{e.timestamp}</span>
                  <span className={e.error ? 'text-red-400' : 'text-green-400'}>{e.action}</span>
                </div>
                {e.roId && <div className="text-gray-400">ro: {e.roId.slice(0, 8)}…</div>}
                {e.lineCount !== undefined && <div className="text-gray-400">lines: {e.lineCount}</div>}
                {e.error && <div className="text-red-300 break-all">err: {e.error}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
