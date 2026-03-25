interface SettingsGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsGroup({ title, description, children }: SettingsGroupProps) {
  return (
    <div className="space-y-2">
      <div className="px-4">
        <h3 className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="card-mobile divide-y divide-border/80 border border-border/90 bg-gradient-to-b from-card to-secondary/35">
        {children}
      </div>
    </div>
  );
}
