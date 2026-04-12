import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Use "welcome" for first-time empty state, "filtered" for no-results */
  variant?: 'welcome' | 'filtered';
}

export function EmptyState({ icon: Icon, title, description, actions, className, variant = 'filtered' }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      variant === 'welcome'
        ? "rounded-lg border border-primary/15 bg-primary/[0.03]"
        : "rounded-lg border border-dashed border-border/70 bg-muted/15",
      className,
    )}>
      {Icon && (
        <div
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center mb-4",
            variant === 'welcome'
              ? "bg-primary/10 border border-primary/20"
              : "bg-muted border border-border"
          )}
        >
          <Icon
            className={cn("h-5 w-5", variant === 'welcome' ? "text-primary" : "text-muted-foreground/50")}
          />
        </div>
      )}
      <p className={cn(
        "font-bold text-sm tracking-tight",
        variant === 'welcome' ? "text-foreground" : "text-foreground/70",
      )}>
        {title}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">{description}</p>
      )}
      {actions && <div className="mt-4 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
