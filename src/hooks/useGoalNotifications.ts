import { useState, useEffect, useCallback } from 'react';
import { useRO } from '@/contexts/ROContext';
import { effectiveDate as effectiveDateOf } from '@/lib/roDisplay';
import { localDateStr } from '@/lib/utils';

const ENABLED_KEY = 'ro-notif-enabled';
const LAST_PREFIX = 'ro-notif-last-';
const RATE_LIMIT_HOURS = 6;
const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

type NotifType = 'no_ros_today' | 'behind_weekly' | 'period_closing';

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function getHoursSinceLastNotif(type: NotifType): number {
  const last = localStorage.getItem(`${LAST_PREFIX}${type}`);
  if (!last) return Infinity;
  const elapsed = Date.now() - new Date(last).getTime();
  return elapsed / (1000 * 60 * 60);
}

function markNotifSent(type: NotifType): void {
  localStorage.setItem(`${LAST_PREFIX}${type}`, new Date().toISOString());
}

function fireNotification(title: string, body: string): void {
  try {
    const n = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
    });
    setTimeout(() => n.close(), 8000);
  } catch {
    // Silently ignore — some contexts block Notification construction
  }
}

function getWeekStart(today: string, weekStartDay: number): string {
  const d = new Date(today + 'T00:00:00');
  const dayOfWeek = d.getDay();
  const diff = (dayOfWeek - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return localDateStr(d);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function useGoalNotifications() {
  const { ros } = useRO();

  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    () => (isSupported() ? Notification.permission : 'unsupported'),
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => localStorage.getItem(ENABLED_KEY) === 'true',
  );

  const checkAndNotify = useCallback(() => {
    if (!isSupported() || Notification.permission !== 'granted') return;
    if (localStorage.getItem(ENABLED_KEY) !== 'true') return;

    const today = localDateStr();
    const hour = new Date().getHours();

    const dailyGoal = parseFloat(localStorage.getItem('ro-tracker-goal-daily') || '0') || 0;
    const weeklyGoal = parseFloat(localStorage.getItem('ro-tracker-goal-weekly') || '0') || 0;
    const weekStartDay = parseInt(localStorage.getItem('ro-tracker-week-start-day') || '0', 10);

    // Check 1: No ROs logged today (only after 11am)
    if (dailyGoal > 0 && hour >= 11 && getHoursSinceLastNotif('no_ros_today') >= RATE_LIMIT_HOURS) {
      const todayROs = ros.filter(ro => effectiveDateOf(ro) === today);
      if (todayROs.length === 0) {
        fireNotification(
          "Haven't Logged Any ROs Today",
          'Tap to open RO Navigator and track your hours.',
        );
        markNotifSent('no_ros_today');
      }
    }

    // Check 2: Behind weekly goal with ≤ 3 days left
    if (weeklyGoal > 0 && getHoursSinceLastNotif('behind_weekly') >= RATE_LIMIT_HOURS) {
      const weekStart = getWeekStart(today, weekStartDay);
      const weekEnd = addDays(weekStart, 6);
      const daysLeft = daysBetween(today, weekEnd);

      if (daysLeft <= 3) {
        const weekHours = ros
          .filter(ro => {
            const d = effectiveDateOf(ro);
            return d >= weekStart && d <= weekEnd;
          })
          .reduce((sum, ro) => {
            if (ro.lines?.length) return sum + ro.lines.reduce((s, l) => s + l.hoursPaid, 0);
            return sum + (ro.paidHours || 0);
          }, 0);

        if (weekHours < weeklyGoal * 0.7) {
          const behind = (weeklyGoal - weekHours).toFixed(1);
          const dayLabel = daysLeft === 1 ? 'day' : 'days';
          fireNotification(
            `${behind} hrs Behind Weekly Goal`,
            `${daysLeft} ${dayLabel} left in the week — keep pushing!`,
          );
          markNotifSent('behind_weekly');
        }
      }
    }

    // Check 3: Pay period closing soon (once per day)
    if (getHoursSinceLastNotif('period_closing') >= 24) {
      const weekStart = getWeekStart(today, weekStartDay);
      const weekEnd = addDays(weekStart, 6);
      const daysLeft = daysBetween(today, weekEnd);

      if (daysLeft <= 2 && daysLeft >= 0) {
        const dayLabel = daysLeft === 1 ? 'day' : 'days';
        fireNotification(
          'Pay Period Closing Soon',
          `Your period ends in ${daysLeft} ${dayLabel} — review and flag any open ROs.`,
        );
        markNotifSent('period_closing');
      }
    }
  }, [ros]);

  // Run on mount and every 30 minutes
  useEffect(() => {
    if (!isSupported() || Notification.permission !== 'granted') return;
    if (localStorage.getItem(ENABLED_KEY) !== 'true') return;

    checkAndNotify();
    const id = setInterval(checkAndNotify, INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkAndNotify]);

  const toggleNotifications = useCallback(async () => {
    if (!isSupported()) return;

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
      // Kick off a check shortly after enabling
      setTimeout(() => checkAndNotify(), 300);
    } else {
      setPermissionState(permission);
    }
  }, [notificationsEnabled, checkAndNotify]);

  // Sync permission state on mount (catches externally changed permission)
  useEffect(() => {
    if (!isSupported()) return;
    setPermissionState(Notification.permission);
  }, []);

  return {
    permissionState,
    notificationsEnabled,
    toggleNotifications,
  };
}
