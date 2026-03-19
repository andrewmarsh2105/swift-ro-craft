interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-bold text-foreground/85 uppercase tracking-wider px-4">
        {title}
      </h3>
      <div className="card-mobile divide-y divide-border/80 border border-border/90 bg-gradient-to-b from-card to-secondary/35">
        {children}
      </div>
    </div>
  );
}
