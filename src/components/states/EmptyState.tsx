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
      "flex flex-col items-center justify-center py-16 px-8 text-center",
      variant === 'welcome'
        ? "rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.04] to-transparent"
        : "rounded-2xl border border-dashed border-border/80 bg-muted/20",
      className,
    )}>
      {Icon && (
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mb-5",
            variant === 'welcome'
              ? "bg-primary/10 border border-primary/20 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.25)]"
              : "bg-muted border border-border"
          )}
        >
          <Icon
            className={cn("h-7 w-7", variant === 'welcome' ? "text-primary" : "text-muted-foreground/60")}
          />
        </div>
      )}
      <p className={cn(
        "font-bold text-base tracking-tight",
        variant === 'welcome' ? "text-foreground" : "text-foreground/80",
      )}>
        {title}
      </p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {actions && <div className="mt-5 flex items-center gap-3">{actions}</div>}
    </div>
  );
}
