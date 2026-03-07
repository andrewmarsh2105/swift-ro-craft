import { useEffect, useState } from "react";
import { Bug, ChevronDown, ChevronUp, X, Trash2 } from "lucide-react";
import {
  clearDebugEntries,
  getDebugEntries,
  subscribeDebug,
  type DebugEntry,
} from "@/lib/debug";

export function DevDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<DebugEntry[]>(() => getDebugEntries());

  useEffect(() => {
    return subscribeDebug(() => setEntries(getDebugEntries()));
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-2 left-2 z-[9999] max-w-sm">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 bg-orange-600 text-white text-xs rounded shadow-lg"
          >
            <Bug className="h-3 w-3" />
            RO Debug Log
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>

          <div className="flex items-center gap-0.5">
            <button
              className="p-1 text-gray-400 hover:text-white"
              onClick={() => clearDebugEntries()}
              title="Clear"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <button
              className="p-1 text-gray-400 hover:text-white"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="mt-1 bg-gray-900 text-gray-100 rounded shadow-xl border border-gray-700 max-h-64 overflow-y-auto text-[11px] font-mono">
          {entries.length === 0 ? (
            <div className="p-2 text-gray-500">
              No entries yet. Save an RO to see logs.
            </div>
          ) : (
            entries.map((e, i) => (
              <div key={i} className="p-1.5 border-b border-gray-800 last:border-0">
                <div className="flex gap-2">
                  <span className="text-gray-500">{e.timestamp}</span>
                  <span className={e.error ? 'text-red-400' : 'text-green-400'}>
                    {e.roId && (
                      <span className="text-blue-400 mr-1">
                        RO: {e.roId.slice(0, 6)}
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-gray-200">{e.action}</p>
                {e.userId && (
                  <p className="text-gray-400">
                    User: {e.userId.slice(0, 6)}
                  </p>
                )}
                {typeof e.lineCount === "number" && (
                  <p className="text-gray-400">Lines: {e.lineCount}</p>
                )}
                {e.error && <p className="text-red-300 break-all">{e.error}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
