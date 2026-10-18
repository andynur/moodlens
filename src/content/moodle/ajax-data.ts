import type { Course, MoodleTask, TaskKind } from '../../shared/types';

const MAX_COURSES = 200;
const MAX_EVENTS = 500;
const MAX_TEXT = 300;
const POSITIVE_INTEGER = /^\d+$/;
const MODULE_KIND: Readonly<Record<string, TaskKind>> = {
  assign: 'assign',
  quiz: 'quiz',
  attendance: 'attendance',
  forum: 'forum'
};

type UnknownRecord = Record<string, unknown>;

function record(input: unknown): UnknownRecord | null {
  return input !== null && typeof input === 'object' && !Array.isArray(input) ? (input as UnknownRecord) : null;
}

function numericId(input: unknown): string | null {
  if (typeof input === 'number' && Number.isSafeInteger(input) && input > 0) return String(input);
  if (typeof input === 'string' && POSITIVE_INTEGER.test(input) && input !== '0') return input;
  return null;
}

function boundedText(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.replace(/\s+/g, ' ').trim();
  return value.length > 0 && value.length <= MAX_TEXT ? value : null;
}

function boolean(input: unknown): boolean | null {
  if (typeof input === 'boolean') return input;
  if (input === 0 || input === 1) return Boolean(input);
  return null;
}

function timestamp(input: unknown): string | null {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input <= 0) return null;
  const milliseconds = input * 1000;
  const date = new Date(milliseconds);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : null;
}

/** Accept only same-origin Moodle view URLs; drop every other query parameter. */
export function normalizeTaskUrl(input: unknown, origin: string): string | null {
  if (typeof input !== 'string' || input.length > 2048) return null;
  try {
    const url = new URL(input, origin);
    if (url.origin !== origin || url.username || url.password) return null;
    const id = url.searchParams.get('id');
    if (!id || !POSITIVE_INTEGER.test(id)) return null;
    if (
      !/^\/mod\/[a-z][a-z0-9_]*\/view\.php$/.test(url.pathname) &&
      url.pathname !== '/course/view.php' &&
      url.pathname !== '/calendar/view.php'
    ) {
      return null;
    }
    return `${origin}${url.pathname}?id=${id}`;
  } catch {
    return null;
  }
}

/** Strictly validates Moodle's course timeline envelope and returns only bounded fields. */
export function normalizeCourseResponse(input: unknown, siteId: string): Course[] | null {
  const response = record(input);
  if (!response || !Array.isArray(response.courses) || response.courses.length > MAX_COURSES) return null;
  const courses: Course[] = [];
  const ids = new Set<string>();
  for (const raw of response.courses) {
    const item = record(raw);
    const id = numericId(item?.id);
    const name = boundedText(item?.fullnamedisplay) ?? boundedText(item?.fullname);
    const visible = boolean(item?.visible);
    if (!item || !id || !name || visible === null || ids.has(id)) return null;
    ids.add(id);
    const course: Course = { siteId, id, name, visible };
    const shortName = boundedText(item.shortname);
    if (shortName) course.shortName = shortName;
    const hasProgress = boolean(item.hasprogress);
    if (
      hasProgress === true &&
      typeof item.progress === 'number' &&
      Number.isFinite(item.progress) &&
      item.progress >= 0 &&
      item.progress <= 100
    ) {
      course.progress = Math.round(item.progress);
    }
    courses.push(course);
  }
  return courses;
}

function eventKind(item: UnknownRecord): TaskKind {
  const moduleName = typeof item.modulename === 'string' ? item.modulename.toLowerCase() : '';
  if (MODULE_KIND[moduleName]) return MODULE_KIND[moduleName];
  return boolean(item.isactionevent) === true ? 'event' : 'other';
}

/** Strictly validates Moodle calendar action events and normalizes them into local Task records. */
export function normalizeTaskResponse(input: unknown, siteId: string, origin: string): MoodleTask[] | null {
  const response = record(input);
  if (!response || !Array.isArray(response.events) || response.events.length > MAX_EVENTS) return null;
  const tasks: MoodleTask[] = [];
  const ids = new Set<string>();
  for (const raw of response.events) {
    const item = record(raw);
    const eventId = numericId(item?.id);
    const title = boundedText(item?.name);
    const course = record(item?.course);
    const courseId = numericId(course?.id);
    const visible = boolean(item?.visible);
    const dueAt = timestamp(item?.timesort);
    const overdue = boolean(item?.overdue);
    const action = record(item?.action);
    const url = normalizeTaskUrl(action?.url, origin) ?? normalizeTaskUrl(item?.url, origin);
    if (!item || !eventId || !title || !courseId || visible === null || !dueAt || overdue === null || !url) {
      return null;
    }
    if (!visible) continue;
    const activityId = numericId(item.instance);
    const stableId = `${courseId}:${eventId}`;
    if (ids.has(stableId)) return null;
    ids.add(stableId);
    tasks.push({
      siteId,
      courseId,
      ...(activityId ? { activityId } : {}),
      kind: eventKind(item),
      title,
      dueAt,
      url,
      status: overdue ? 'overdue' : 'open',
      source: 'ajax'
    });
  }
  return tasks;
}
