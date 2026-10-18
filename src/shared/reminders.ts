import type { TaskDataset } from './types';
import { taskIdentity } from './tasks';

export const REMINDER_PREFS_KEY = 'reminderPrefs';
export const REMINDER_SCHEDULE_KEY = 'reminderSchedule';
export const REMINDER_ALARM_PREFIX = 'moodlens-task:';
export const REMINDER_LEADS = [60, 180, 1440] as const;
export const MAX_REMINDERS = 500;

export interface ReminderPrefs {
  enabled: boolean;
  leadMinutes: number[];
}

export interface ScheduledReminder {
  alarmName: string;
  when: number;
  taskTitle: string;
  courseName: string;
}

export type ReminderSchedule = Record<string, ScheduledReminder>;

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { enabled: false, leadMinutes: [1440] };

export function normalizeReminderPrefs(input: unknown): ReminderPrefs | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<ReminderPrefs>;
  if (typeof raw.enabled !== 'boolean' || !Array.isArray(raw.leadMinutes)) return null;
  const leadMinutes = [...new Set(raw.leadMinutes)]
    .filter((lead): lead is number => typeof lead === 'number' && (REMINDER_LEADS as readonly number[]).includes(lead))
    .sort((a, b) => a - b);
  if (leadMinutes.length !== raw.leadMinutes.length || leadMinutes.length === 0) return null;
  return { enabled: raw.enabled, leadMinutes };
}

function hash(value: string): string {
  let result = 2_166_136_261;
  for (const char of value) {
    result ^= char.codePointAt(0)!;
    result = Math.imul(result, 16_777_619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

export function buildReminderSchedule(
  datasets: TaskDataset[],
  prefs: ReminderPrefs,
  now = Date.now()
): ReminderSchedule {
  if (!prefs.enabled) return {};
  const result: ReminderSchedule = {};
  for (const dataset of datasets) {
    const courseNames = new Map(dataset.courses.map((course) => [course.id, course.name]));
    for (const task of dataset.tasks) {
      if (!task.dueAt || task.status === 'done') continue;
      const due = Date.parse(task.dueAt);
      if (!Number.isFinite(due)) continue;
      for (const lead of prefs.leadMinutes) {
        const when = due - lead * 60_000;
        if (when <= now) continue;
        const alarmName = `${REMINDER_ALARM_PREFIX}${hash(`${taskIdentity(task)}|${lead}`)}`;
        result[alarmName] = {
          alarmName,
          when,
          taskTitle: task.title,
          courseName: courseNames.get(task.courseId) ?? task.courseId
        };
        if (Object.keys(result).length >= MAX_REMINDERS) return result;
      }
    }
  }
  return result;
}

export function isReminderSchedule(input: unknown): input is ReminderSchedule {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const entries = Object.entries(input as Record<string, unknown>);
  return (
    entries.length <= MAX_REMINDERS &&
    entries.every(([name, value]) => {
      if (!name.startsWith(REMINDER_ALARM_PREFIX) || !value || typeof value !== 'object') return false;
      const item = value as Partial<ScheduledReminder>;
      return (
        item.alarmName === name &&
        typeof item.when === 'number' &&
        Number.isFinite(item.when) &&
        typeof item.taskTitle === 'string' &&
        item.taskTitle.length > 0 &&
        item.taskTitle.length <= 300 &&
        typeof item.courseName === 'string' &&
        item.courseName.length > 0 &&
        item.courseName.length <= 300
      );
    })
  );
}
