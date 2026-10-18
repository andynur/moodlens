import type { Locale, MoodleTask, TaskDataset, TaskKind } from './types';

export type TaskGroup = 'overdue' | 'today' | 'thisWeek' | 'later' | 'noDate';

export interface TaskFilters {
  siteId?: string;
  courseId?: string;
  kind?: TaskKind;
  search?: string;
}

export function formatRelativeDue(dueAt: string, locale: Locale, now = new Date()): string | null {
  const due = new Date(dueAt);
  if (!Number.isFinite(due.valueOf())) return null;
  const differenceMs = due.valueOf() - now.valueOf();
  const absoluteMs = Math.abs(differenceMs);
  const [divisor, unit]: [number, Intl.RelativeTimeFormatUnit] =
    absoluteMs < 90 * 60_000
      ? [60_000, 'minute']
      : absoluteMs < 22 * 3_600_000
        ? [3_600_000, 'hour']
        : [86_400_000, 'day'];
  return new Intl.RelativeTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', { numeric: 'auto' }).format(
    Math.round(differenceMs / divisor),
    unit
  );
}

function dateParts(date: Date, timeZone: string): [number, number, number] {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return [value('year'), value('month'), value('day')];
}

function calendarDay(parts: [number, number, number]): number {
  return Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86_400_000;
}

/** Calendar grouping in the requested timezone; date math is DST-independent. */
export function taskGroup(
  task: MoodleTask,
  now = new Date(),
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
): TaskGroup {
  if (!task.dueAt) return 'noDate';
  const due = new Date(task.dueAt);
  if (!Number.isFinite(due.valueOf())) return 'noDate';
  if (task.status === 'overdue' || (task.status !== 'done' && due.valueOf() < now.valueOf())) return 'overdue';
  const today = calendarDay(dateParts(now, timeZone));
  const dueDay = calendarDay(dateParts(due, timeZone));
  if (dueDay === today) return 'today';
  const weekday = new Date(today * 86_400_000).getUTCDay();
  const endOfWeek = today + ((7 - weekday) % 7);
  return dueDay > today && dueDay <= endOfWeek ? 'thisWeek' : 'later';
}

export function filterTasks(tasks: MoodleTask[], filters: TaskFilters): MoodleTask[] {
  const query = filters.search?.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  return tasks.filter(
    (task) =>
      (!filters.siteId || task.siteId === filters.siteId) &&
      (!filters.courseId || task.courseId === filters.courseId) &&
      (!filters.kind || task.kind === filters.kind) &&
      (!query || task.title.toLocaleLowerCase().includes(query))
  );
}

export function taskIdentity(task: MoodleTask): string {
  return [task.siteId, task.courseId, task.activityId ?? '', task.url, task.dueAt ?? '', task.title].join('|');
}

export function mergeTaskDatasets(datasets: TaskDataset[]): MoodleTask[] {
  const latest = new Map<string, MoodleTask>();
  for (const task of datasets.flatMap((dataset) => dataset.tasks)) latest.set(taskIdentity(task), task);
  return [...latest.values()].sort((a, b) => {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title);
  });
}
