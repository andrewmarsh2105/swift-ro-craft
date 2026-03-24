import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { SegmentedControl } from '@/components/mobile/SegmentedControl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface PayPeriodRangeSectionProps {
  userSettings: {
    payPeriodType?: 'week' | 'two_weeks' | 'custom';
    payPeriodEndDates?: number[] | null;
    weekStartDay?: number;
  };
  updateUserSetting: (key: string, value: unknown) => void;
}

export function PayPeriodRangeSection({ userSettings, updateUserSetting }: PayPeriodRangeSectionProps) {
  const payPeriodType = userSettings.payPeriodType || 'week';
  const payPeriodEndDates: number[] = userSettings.payPeriodEndDates || [];
  const [newDay, setNewDay] = useState('');

  const handleAddEndDate = () => {
    const day = parseInt(newDay);
    if (isNaN(day) || day < 1 || day > 31) return;
    if (payPeriodEndDates.includes(day)) return;
    const updated = [...payPeriodEndDates, day].sort((a, b) => a - b);
    updateUserSetting('payPeriodEndDates', updated);
    setNewDay('');
  };

  const handleRemoveEndDate = (day: number) => {
    const updated = payPeriodEndDates.filter((d: number) => d !== day);
    updateUserSetting('payPeriodEndDates', updated.length > 0 ? updated : null);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4">
        Pay Period Range
      </h3>
      <div className="card-mobile p-4 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">Default period for Summary &amp; Main page</p>
          <SegmentedControl
            options={[
              { value: 'week', label: '1 Week' },
              { value: 'two_weeks', label: '2 Weeks' },
              { value: 'custom', label: 'Custom' },
            ]}
            value={payPeriodType}
            onChange={(v) => updateUserSetting('payPeriodType', v)}
          />
        </div>

        {payPeriodType === 'custom' && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Set the day(s) of the month your pay period ends on (e.g., 15 and 28).
              {payPeriodEndDates.length < 2 && (
                <span className="block mt-1 text-xs text-muted-foreground/70">
                  Add at least 2 dates to define your pay cycle.
                </span>
              )}
            </p>

            {payPeriodEndDates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {payPeriodEndDates.map((day: number) => (
                  <div key={day} className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5">
                    <span className="text-sm font-semibold tabular-nums">{day}{getOrdinalSuffix(day)}</span>
                    <button
                      onClick={() => handleRemoveEndDate(day)}
                      className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                max={31}
                value={newDay}
                onChange={e => setNewDay(e.target.value)}
                placeholder="Day (1-31)"
                className="flex-1 h-10 px-3 bg-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleAddEndDate}
                disabled={!newDay || isNaN(parseInt(newDay)) || parseInt(newDay) < 1 || parseInt(newDay) > 31}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {payPeriodEndDates.length >= 2 && (
              <p className="text-xs text-muted-foreground">
                Periods: {payPeriodEndDates.map((day: number, i: number) => {
                  const nextDay = payPeriodEndDates[(i + 1) % payPeriodEndDates.length];
                  const startDay = day + 1 > 31 ? 1 : day + 1;
                  return `${startDay}${getOrdinalSuffix(startDay)} – ${nextDay}${getOrdinalSuffix(nextDay)}`;
                }).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground mb-3">Week starts on</p>
          <div className="flex gap-1.5">
            {(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const).map((day, index) => (
              <button
                key={day}
                onClick={() => updateUserSetting('weekStartDay', index)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  (userSettings.weekStartDay ?? 0) === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-muted'
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
