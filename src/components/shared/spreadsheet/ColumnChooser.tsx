import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ALL_COLUMNS, type ColumnId } from './types';

interface ColumnChooserProps {
  activeColumns: ColumnId[];
  onToggle: (id: ColumnId) => void;
}

/** Required columns that can't be unchecked. */
const LOCKED: ColumnId[] = ['roNumber', 'hours'];

export function ColumnChooser({ activeColumns, onToggle }: ColumnChooserProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="end">
        <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Toggle columns</p>
        {ALL_COLUMNS.map(col => {
          const locked = LOCKED.includes(col.id);
          const checked = activeColumns.includes(col.id);
          return (
            <label
              key={col.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
            >
              <Checkbox
                checked={checked}
                disabled={locked}
                onCheckedChange={() => !locked && onToggle(col.id)}
              />
              <span className={locked ? 'text-muted-foreground' : ''}>{col.label}</span>
            </label>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
