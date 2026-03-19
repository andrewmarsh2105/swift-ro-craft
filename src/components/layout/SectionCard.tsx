import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <Card className={cn("overflow-hidden", className)}>
      {(title || rightSlot) && (
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60 bg-muted/20 pb-3">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {rightSlot}
        </CardHeader>
      )}
      <CardContent className={cn(title ? "pt-4" : "pt-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
