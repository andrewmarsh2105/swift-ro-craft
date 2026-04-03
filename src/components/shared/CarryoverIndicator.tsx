import { Repeat2 } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CarryoverIndicatorProps {
  className?: string;
  iconClassName?: string;
  label?: string;
}

export function CarryoverIndicator({
  className,
  iconClassName,
  label = "Carryover from prior period",
}: CarryoverIndicatorProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            title={label}
            className={cn(
              "inline-flex h-[18px] w-[18px] items-center justify-center rounded-sm border border-border/70 text-muted-foreground/90 quiet-transition",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              className,
            )}
          >
            <Repeat2 className={cn("h-3 w-3", iconClassName)} aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
