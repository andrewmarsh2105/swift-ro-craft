import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Advisor } from "@/types/ro";

export function AdvisorPickerSheet(props: {
  advisor: string;
  setAdvisor: (name: string) => void;
  advisors: Advisor[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.advisors;
    return props.advisors.filter((a) => a.name.toLowerCase().includes(q));
  }, [props.advisors, query]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Advisor</h3>
          <p className="text-xs text-muted-foreground">Who wrote this RO?</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
          onClick={() => setOpen((v) => !v)}
        >
          {props.advisor ? props.advisor : "Choose advisor"}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {open && (
        <div className="rounded-md border bg-card p-3 space-y-2">
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Search advisors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((a) => (
              <button
                key={a.id}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
                onClick={() => {
                  props.setAdvisor(a.name);
                  setOpen(false);
                }}
              >
                {a.name}
                {props.advisor === a.name && <span className="text-xs text-primary">Selected</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
