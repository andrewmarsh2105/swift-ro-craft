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
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
          </div>
          {rightSlot}
        </CardHeader>
      )}
      <CardContent className={cn(title ? "" : "pt-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
