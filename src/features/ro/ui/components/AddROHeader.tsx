import { ArrowLeft, Save } from "lucide-react";

export function AddROHeader(props: {
  roNumber: string;
  setRoNumber: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <header className="border-b bg-card px-4 py-4">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button onClick={props.onBack} className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">New Repair Order</h1>
          <p className="text-xs text-muted-foreground">Create + save an RO</p>
        </div>

        <input
          className="w-28 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="RO #"
          value={props.roNumber}
          onChange={(e) => props.setRoNumber(e.target.value)}
        />

        <input
          className="rounded-md border bg-background px-3 py-2 text-sm"
          type="date"
          value={props.date}
          onChange={(e) => props.setDate(e.target.value)}
        />

        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          onClick={props.onSave}
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </header>
  );
}
