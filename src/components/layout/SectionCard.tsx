import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  rightSlot,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <div className={cn("brand-panel overflow-hidden relative", className)}>
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />
      {(title || rightSlot) && (
        <div className="flex items-center justify-between gap-2 pl-5 pr-4 py-2.5 border-b border-border/45 bg-gradient-to-r from-accent/45 to-transparent">
          <div>
            {title && (
              <h3 className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground/85">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{description}</p>
            )}
          </div>
          {rightSlot}
        </div>
      )}
      <div className={cn("pl-5 pr-4 py-3", contentClassName)}>{children}</div>
    </div>
  );
}
