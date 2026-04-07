import { useState, useEffect, useCallback, useRef } from 'react';
import { useRO } from '@/contexts/ROContext';
import { useFlagContext } from '@/contexts/FlagContext';
import { effectiveDate as effectiveDateOf } from '@/lib/roDisplay';
import { localDateStr } from '@/lib/utils';

const ENABLED_KEY = 'ro-notif-enabled';
const LAST_PREFIX = 'ro-notif-last-';
const RATE_LIMIT_HOURS = 6;
const INTERVAL_MS = 30 * 60 * 1000;

// Evaluated once at module load — stable for the session
const SUPPORTED = typeof window !== 'undefined' && 'Notification' in window;

type NotifType = 'no_ros_today' | 'behind_weekly' | 'period_closing';

function getHoursSinceLastNotif(type: NotifType): number {
  const last = localStorage.getItem(`${LAST_PREFIX}${type}`);
  if (!last) return Infinity;
  return (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60);
}

function markNotifSent(type: NotifType): void {
  localStorage.setItem(`${LAST_PREFIX}${type}`, new Date().toISOString());
}

function fireNotification(title: string, body: string): void {
  try {
    const n = new Notification(title, { body, icon: '/pwa-192x192.png', badge: '/pwa-64x64.png' });
    setTimeout(() => n.close(), 8000);
  } catch {
    // Some contexts block Notification construction even after permission granted
  }
}

function getWeekStart(today: string, weekStartDay: number): string {
  const d = new Date(today + 'T00:00:00');
  const diff = (d.getDay() - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return localDateStr(d);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

export function useGoalNotifications() {
  const { ros } = useRO();
  const { userSettings } = useFlagContext();

  // Refs let checkAndNotify read current values without being recreated on each change,
  // which would otherwise tear down and restart the 30-minute interval on every RO update.
  const rosRef = useRef(ros);
  const settingsRef = useRef(userSettings);
  rosRef.current = ros;
  settingsRef.current = userSettings;

  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    () => (SUPPORTED ? Notification.permission : 'unsupported'),
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => localStorage.getItem(ENABLED_KEY) === 'true',
  );

  // Stable callback — reads live values from refs, never needs to be recreated
  const checkAndNotify = useCallback(() => {
    if (!SUPPORTED || Notification.permission !== 'granted') return;

    const { hoursGoalDaily, hoursGoalWeekly: weeklyGoal, weekStartDay } = settingsRef.current;
    const ros = rosRef.current;
    const today = localDateStr();
    const hour = new Date().getHours();

    if (hoursGoalDaily > 0 && hour >= 11 && getHoursSinceLastNotif('no_ros_today') >= RATE_LIMIT_HOURS) {
      if (!ros.some(ro => effectiveDateOf(ro) === today)) {
        fireNotification(
          "Haven't Logged Any ROs Today",
          'Tap to open RO Navigator and track your hours.',
        );
        markNotifSent('no_ros_today');
      }
    }

    if (weeklyGoal > 0 && getHoursSinceLastNotif('behind_weekly') >= RATE_LIMIT_HOURS) {
      const weekStart = getWeekStart(today, weekStartDay);
      const weekEnd = addDays(weekStart, 6);
      const daysLeft = daysBetween(today, weekEnd);

      if (daysLeft <= 3) {
        const weekHours = ros
          .filter(ro => { const d = effectiveDateOf(ro); return d >= weekStart && d <= weekEnd; })
          .reduce((sum, ro) => sum + (ro.lines?.length
            ? ro.lines.reduce((s, l) => s + l.hoursPaid, 0)
            : (ro.paidHours || 0)), 0);

        if (weekHours < weeklyGoal * 0.7) {
          const dayLabel = daysLeft === 1 ? 'day' : 'days';
          fireNotification(
            `${(weeklyGoal - weekHours).toFixed(1)} hrs Behind Weekly Goal`,
            `${daysLeft} ${dayLabel} left in the week — keep pushing!`,
          );
          markNotifSent('behind_weekly');
        }
      }
    }

    if (getHoursSinceLastNotif('period_closing') >= 24) {
      const weekStart = getWeekStart(today, weekStartDay);
      const daysLeft = daysBetween(today, addDays(weekStart, 6));
      if (daysLeft >= 0 && daysLeft <= 2) {
        const dayLabel = daysLeft === 1 ? 'day' : 'days';
        fireNotification(
          'Pay Period Closing Soon',
          `Your period ends in ${daysLeft} ${dayLabel} — review and flag any open ROs.`,
        );
        markNotifSent('period_closing');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally reads from refs

  // Start/stop interval based on enabled state. checkAndNotify is stable so
  // the interval is never reset by RO data changes.
  useEffect(() => {
    if (!SUPPORTED || Notification.permission !== 'granted' || !notificationsEnabled) return;
    checkAndNotify();
    const id = setInterval(checkAndNotify, INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkAndNotify, notificationsEnabled]);

  // Sync React state with actual browser permission (e.g. user grants/revokes externally)
  useEffect(() => {
    if (SUPPORTED) setPermissionState(Notification.permission);
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!SUPPORTED) return;

    if (notificationsEnabled) {
      localStorage.setItem(ENABLED_KEY, 'false');
      setNotificationsEnabled(false);
      return;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
      setPermissionState(permission);
    }

    if (permission === 'granted') {
      localStorage.setItem(ENABLED_KEY, 'true');
      setNotificationsEnabled(true);
    } else {
      setPermissionState(permission);
    }
  }, [notificationsEnabled]);

  return { permissionState, notificationsEnabled, toggleNotifications };
}
