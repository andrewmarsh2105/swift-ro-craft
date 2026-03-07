import type { Preset } from "@/types/ro";

export function PresetButton(props: { preset: Preset; onClick: () => void }) {
  const p = props.preset;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
      onClick={props.onClick}
      title={p.workTemplate || p.name}
    >
      <span className="font-medium">{p.name}</span>
      {typeof p.defaultHours === "number" && (
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {p.defaultHours}h
        </span>
      )}
    </button>
  );
}
