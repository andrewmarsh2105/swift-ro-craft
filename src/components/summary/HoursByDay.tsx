import { maskHours } from '@/lib/maskHours';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableFooter, TableRow, TableCell } from '@/components/ui/table';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayData {
  date: string;
  totalHours: number;
  roCount: number;
}

interface HoursByDayProps {
  byDay: DayData[];
  totalHours: number;
  totalROs: number;
  todayStr: string;
  hideTotals: boolean;
}

export function HoursByDay({ byDay, totalHours, totalROs, todayStr, hideTotals }: HoursByDayProps) {
  const maxDayHours = Math.max(...byDay.map(d => d.totalHours), 1);
  const activeDays = byDay.filter((d) => d.totalHours > 0 || d.roCount > 0);
  const hiddenPastZeroActivityDays = byDay.filter((d) => d.totalHours === 0 && d.roCount === 0 && d.date < todayStr).length;
  const futureDaysInRange = byDay.filter((d) => d.date > todayStr).length;

  return (
    <div className="brand-panel overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
      <div className="px-4 pt-2.5 pb-1.5 flex items-center justify-between">
        <span className="data-header">Hours by Day</span>
        <span className="text-[9px] text-muted-foreground/30">{byDay.length}d</span>
      </div>
      <Table>
        <TableBody>
          {activeDays.map((day) => {
            const date = new Date(day.date + 'T12:00:00');
            const isToday = day.date === todayStr;
            const barWidth = maxDayHours > 0 ? (day.totalHours / maxDayHours) * 100 : 0;
            return (
              <TableRow key={day.date} className={cn('border-border/30', isToday && 'bg-primary/[0.04]')}>
                <TableCell className="py-2 pl-4 w-14">
                  <div className="text-[11px] font-semibold text-muted-foreground/65 uppercase">{dayNames[date.getDay()]}</div>
                  <div className={cn('text-sm font-bold tabular-nums', isToday && 'text-primary')}>{date.getDate()}</div>
                </TableCell>
                <TableCell className="py-2 pr-2">
                  <div className="relative h-6 flex items-center">
                    <div
                      className={cn('absolute left-0 top-0 h-full rounded-r transition-all', isToday ? 'bg-primary/20' : 'bg-primary/10')}
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="relative z-10 text-[13px] font-bold tabular-nums ml-2">
                      {maskHours(day.totalHours, hideTotals)}h
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2 pr-4 text-right">
                  <span className="text-[11px] text-muted-foreground/65">{day.roCount} RO{day.roCount !== 1 ? 's' : ''}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-border/40">
            <TableCell className="font-bold text-xs py-1.5 pl-4 text-muted-foreground">Total</TableCell>
            <TableCell className="font-bold text-xs tabular-nums py-1.5">{maskHours(totalHours, hideTotals)}h</TableCell>
            <TableCell className="text-right text-[10px] text-muted-foreground py-1.5 pr-4">{totalROs} ROs</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      {hiddenPastZeroActivityDays > 0 && (
        <div className="px-4 pb-2 text-[10px] text-muted-foreground/60">
          Hidden {hiddenPastZeroActivityDays} past zero-activity day{hiddenPastZeroActivityDays === 1 ? '' : 's'}.
          {futureDaysInRange > 0 && ` ${futureDaysInRange} future day${futureDaysInRange === 1 ? '' : 's'} in this period not counted.`}
        </div>
      )}
    </div>
  );
}
