import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  rightActions,
  className,
  sticky = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 h-12 border-b border-border bg-card",
        sticky && "sticky top-0 z-30",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center h-9 w-9 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate leading-tight">{subtitle}</p>
          )}
        </div>
      </div>
      {rightActions && <div className="flex items-center gap-1.5 flex-shrink-0">{rightActions}</div>}
    </header>
  );
}
