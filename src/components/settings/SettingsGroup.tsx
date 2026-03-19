interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wide px-4">
        {title}
      </h3>
      <div className="card-mobile divide-y divide-border/70 border border-border/80">
        {children}
      </div>
    </div>
  );
}
