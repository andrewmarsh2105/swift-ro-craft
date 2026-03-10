import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddROHeader(props: {
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <header className="border-b bg-card px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button onClick={props.onBack} className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="flex-1 text-lg font-semibold text-foreground">New Repair Order</h1>

        <Button size="sm" onClick={props.onSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </header>
  );
}
