import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';
export type GoalSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/* ── Desktop inline field with auto-save ── */
export function DesktopInlineField({
  icon,
  label,
  value,
  onChange,
  onBlur,
  onSave,
  status,
  isDirty,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onSave: () => void;
  status: FieldStatus;
  isDirty: boolean;
  placeholder: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/50">{icon}</span>
          <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</label>
        </div>
        <DesktopFieldFeedback status={status} isDirty={isDirty} onSave={onSave} />
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSave(); (e.target as HTMLInputElement).blur(); } }}
        placeholder={placeholder}
        className={cn(
          'w-full h-8 px-3 text-[13px] bg-muted/30 rounded-md border transition-all',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
          isDirty ? 'border-primary/30' : 'border-transparent',
          status === 'error' && 'border-destructive/40 ring-1 ring-destructive/20',
        )}
      />
    </div>
  );
}

function DesktopFieldFeedback({ status, isDirty, onSave }: { status: FieldStatus; isDirty: boolean; onSave: () => void }) {
  if (status === 'saving') {
    return <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving</span>;
  }
  if (status === 'saved') {
    return <span className="text-[10px] text-green-600/80 flex items-center gap-1 font-medium"><Check className="h-2.5 w-2.5" /> Saved</span>;
  }
  if (status === 'error') {
    return <button onClick={onSave} className="text-[10px] text-destructive font-semibold">Retry</button>;
  }
  if (isDirty) {
    return <span className="text-[10px] text-primary/40">Unsaved</span>;
  }
  return null;
}

/* ── Goal field ── */
export function GoalField({
  icon,
  label,
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  min,
  max,
  step,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{label}</label>
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground/50 pointer-events-none">{prefix}</span>
        )}
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full h-8 text-[13px] bg-muted/30 rounded-md border border-transparent tabular-nums transition-all',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
            prefix ? 'pl-7 pr-10' : 'px-3 pr-10',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}

/* ── Goal save status ── */
export function GoalSaveStatusDisplay({ status }: { status: GoalSaveStatus }) {
  if (status === 'saved') {
    return (
      <span className="text-[11px] text-green-600/80 flex items-center gap-1 font-medium">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (status === 'error') {
    return <span className="text-[11px] text-destructive font-medium">Save failed — try again</span>;
  }
  return <div />;
}
