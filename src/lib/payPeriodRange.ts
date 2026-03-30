import type { DateFilterKey } from '@/lib/dateRangeFilter';
import type { SummaryRange, PayPeriodType } from '@/hooks/useUserSettings';

export type EffectivePayPeriodType = 'week' | 'two_weeks' | 'custom';

export interface PayPeriodSettingsLike {
  payPeriodType?: PayPeriodType;
  payPeriodEndDates?: number[] | null;
  defaultSummaryRange?: SummaryRange;
}

export interface PeriodFilterLabels {
  current: string;
  previous: string;
  currentShort: string;
  previousShort: string;
}

export function hasCustomPayPeriod(endDates?: number[] | null): boolean {
  return Array.isArray(endDates) && endDates.length > 0;
}

export function getEffectivePayPeriodType(settings: PayPeriodSettingsLike): EffectivePayPeriodType {
  if (settings.payPeriodType === 'custom' && hasCustomPayPeriod(settings.payPeriodEndDates)) return 'custom';
  if (settings.payPeriodType === 'two_weeks') return 'two_weeks';
  if (settings.defaultSummaryRange === 'two_weeks') return 'two_weeks';
  return 'week';
}

export function getDefaultPeriodFilter(settings: PayPeriodSettingsLike): DateFilterKey {
  return getEffectivePayPeriodType(settings) === 'custom' ? 'pay_period' : 'week';
}

export function getPreviousPeriodFilter(settings: PayPeriodSettingsLike): DateFilterKey {
  return getEffectivePayPeriodType(settings) === 'custom' ? 'last_pay_period' : 'last_week';
}

export function getPeriodFilterLabels(settings: PayPeriodSettingsLike): PeriodFilterLabels {
  const type = getEffectivePayPeriodType(settings);
  if (type === 'two_weeks') {
    return {
      current: '2 Weeks',
      previous: 'Last 2 Weeks',
      currentShort: '2 Wk',
      previousShort: 'Last 2 Wk',
    };
  }
  if (type === 'custom') {
    return {
      current: 'Pay Period Range',
      previous: 'Last Pay Period Range',
      currentShort: 'Pay Period',
      previousShort: 'Last Period',
    };
  }
  return {
    current: 'Week',
    previous: 'Last Week',
    currentShort: 'Week',
    previousShort: 'Last Wk',
  };
}

export function normalizeDateFilterForPayPeriod(
  filter: DateFilterKey,
  settings: PayPeriodSettingsLike,
): DateFilterKey {
  const type = getEffectivePayPeriodType(settings);
  if (type === 'custom') {
    if (filter === 'week') return 'pay_period';
    if (filter === 'last_week') return 'last_pay_period';
    return filter;
  }

  if (filter === 'pay_period') return 'week';
  if (filter === 'last_pay_period') return 'last_week';
  return filter;
}


export function getDateFilterLabel(
  filter: DateFilterKey,
  settings: PayPeriodSettingsLike,
  short = false,
): string {
  const labels = getPeriodFilterLabels(settings);
  const current = short ? labels.currentShort : labels.current;
  const previous = short ? labels.previousShort : labels.previous;

  if (filter === 'week' || filter === 'pay_period') return current;
  if (filter === 'last_week' || filter === 'last_pay_period') return previous;
  if (filter === 'today') return 'Today';
  if (filter === 'month') return 'Month';
  if (filter === 'all') return 'All';
  if (filter === 'custom') return 'Custom';
  return current;
}
