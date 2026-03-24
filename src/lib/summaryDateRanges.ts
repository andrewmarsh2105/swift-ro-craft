import { localDateStr } from '@/lib/utils';

export function getDayRange(): { start: string; end: string } {
  const d = new Date();
  const s = localDateStr(d);
  return { start: s, end: s };
}

export function getWeekRange(weekStartDay: number): { start: string; end: string } {
  const d = new Date();
  const diff = (d.getDay() - weekStartDay + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: localDateStr(start), end: localDateStr(end) };
}

export function getMonthRange(): { start: string; end: string } {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: localDateStr(start), end: localDateStr(end) };
}

export function getTwoWeekRange(weekStartDay: number): { start: string; end: string } {
  const d = new Date();
  const diff = (d.getDay() - weekStartDay + 7) % 7;
  const end = new Date(d);
  end.setDate(d.getDate() + (6 - diff));
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  return { start: localDateStr(start), end: localDateStr(end) };
}

export function getLastWeekRange(weekStartDay: number): { start: string; end: string } {
  const d = new Date();
  const diff = (d.getDay() - weekStartDay + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff - 7);
  const end = new Date(d);
  end.setDate(d.getDate() - diff - 1);
  return { start: localDateStr(start), end: localDateStr(end) };
}
