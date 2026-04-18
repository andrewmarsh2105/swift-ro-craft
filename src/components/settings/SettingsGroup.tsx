interface SettingsGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Remove card wrapper — renders children directly under heading */
  flat?: boolean;
}

export function SettingsGroup({ title, description, children, flat }: SettingsGroupProps) {
  return (
    <div className="space-y-1.5">
      <div className="px-0.5 flex items-baseline gap-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground/75 uppercase tracking-[0.11em]">
          {title}
        </h3>
        {description && (
          <span className="text-[10px] text-muted-foreground/50">{description}</span>
        )}
      </div>
      {flat ? (
        children
      ) : (
        <div
          className="brand-panel divide-y divide-border/30 overflow-hidden"
          style={{ borderRadius: 'var(--radius)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
