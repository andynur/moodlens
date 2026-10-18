import {
  buildReminderSchedule,
  DEFAULT_REMINDER_PREFS,
  isReminderSchedule,
  normalizeReminderPrefs,
  REMINDER_ALARM_PREFIX,
  REMINDER_PREFS_KEY,
  REMINDER_SCHEDULE_KEY,
  type ReminderPrefs
} from '../shared/reminders';
import { taskDataKey } from '../shared/sites';
import type { TaskDataset } from '../shared/types';
import { isTaskDataset } from '../shared/validation';
import { loadSites } from './sites';

export async function clearReminderAlarms(): Promise<void> {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith(REMINDER_ALARM_PREFIX))
      .map((alarm) => chrome.alarms.clear(alarm.name))
  );
}

export async function syncReminders(): Promise<void> {
  const sites = await loadSites();
  const keys = [REMINDER_PREFS_KEY, ...sites.map((site) => taskDataKey(site.id))];
  const stored = await chrome.storage.local.get(keys);
  const prefs = normalizeReminderPrefs(stored[REMINDER_PREFS_KEY]) ?? DEFAULT_REMINDER_PREFS;
  const datasets: TaskDataset[] = [];
  for (const site of sites) {
    const value: unknown = stored[taskDataKey(site.id)];
    if (isTaskDataset(value, site.id, site.origin)) datasets.push(value);
  }
  const schedule = buildReminderSchedule(datasets, prefs);
  await clearReminderAlarms();
  await Promise.all(Object.values(schedule).map((item) => chrome.alarms.create(item.alarmName, { when: item.when })));
  await chrome.storage.local.set({ [REMINDER_SCHEDULE_KEY]: schedule });
}

export async function setReminderPrefs(input: unknown): Promise<boolean> {
  const prefs = normalizeReminderPrefs(input);
  if (!prefs) return false;
  await chrome.storage.local.set({ [REMINDER_PREFS_KEY]: prefs });
  await syncReminders();
  return true;
}

export async function handleReminderAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  if (!alarm.name.startsWith(REMINDER_ALARM_PREFIX)) return;
  const stored = await chrome.storage.local.get([REMINDER_PREFS_KEY, REMINDER_SCHEDULE_KEY]);
  const prefs: ReminderPrefs | null = normalizeReminderPrefs(stored[REMINDER_PREFS_KEY]);
  const schedule: unknown = stored[REMINDER_SCHEDULE_KEY];
  if (!prefs?.enabled || !isReminderSchedule(schedule)) return;
  const item = schedule[alarm.name];
  if (!item) return;
  const permitted = await chrome.permissions.contains({ permissions: ['notifications'] });
  if (!permitted) return;
  await chrome.notifications.create(alarm.name, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: item.taskTitle,
    message: item.courseName
  });
}
