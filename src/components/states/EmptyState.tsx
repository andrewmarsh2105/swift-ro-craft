import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actions, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground/50" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground/70">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>}
      {actions && <div className="mt-4 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
