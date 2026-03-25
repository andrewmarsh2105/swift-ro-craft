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
        "flex items-center justify-between px-3 h-11 border-b border-border/60 bg-card/97 backdrop-blur-sm",
        sticky && "sticky top-0 z-30",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center h-11 w-11 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-[14px] font-bold text-foreground truncate tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground truncate leading-tight">{subtitle}</p>
          )}
        </div>
      </div>
      {rightActions && (
        <div className="flex items-center gap-1 flex-shrink-0">{rightActions}</div>
      )}
    </header>
  );
}
