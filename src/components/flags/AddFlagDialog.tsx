import { useEffect, useState } from "react";
import { Flag } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FlagType } from "@/types/flags";
import { FLAG_TYPE_COLORS, FLAG_TYPE_LABELS } from "@/types/flags";

interface AddFlagDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (flagType: FlagType, note?: string) => void;
  title?: string;
  defaultType?: FlagType;
  defaultNote?: string;
}

const FLAG_OPTIONS: FlagType[] = ["needs_time", "questionable", "waiting", "advisor_question", "other"];

export function AddFlagDialog({
  open,
  onClose,
  onSubmit,
  title = "Add Flag",
  defaultType,
  defaultNote,
}: AddFlagDialogProps) {
  const [selectedType, setSelectedType] = useState<FlagType>("needs_time");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedType(defaultType ?? "needs_time");
    setNote(defaultNote ?? "");
  }, [open, defaultType, defaultNote]);

  const handleSubmit = () => {
    onSubmit(selectedType, note.trim() || undefined);
    setSelectedType("needs_time");
    setNote("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            {FLAG_OPTIONS.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors touch-feedback",
                  selectedType === type
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", FLAG_TYPE_COLORS[type]?.replace("text-", "bg-"))} />
                  {FLAG_TYPE_LABELS[type]}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Note (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for this flag..."
              className="min-h-[96px]"
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1 h-9" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 h-9" onClick={handleSubmit}>
            Add flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
