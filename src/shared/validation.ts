import type {
  CourseSnapshot,
  MoodleActivity,
  ActivityType,
  CompletionStatus,
  Course,
  MoodleTask,
  TaskDataset,
  TaskKind,
  TaskSource,
  TaskStatus
} from './types';

const KNOWN_TYPES: ReadonlySet<string> = new Set<ActivityType>([
  'resource',
  'page',
  'url',
  'attendance',
  'quiz',
  'forum',
  'assign',
  'folder',
  'book',
  'feedback',
  'unknown'
]);
const KNOWN_COMPLETION: ReadonlySet<string> = new Set<CompletionStatus>(['complete', 'incomplete', 'unknown']);
const TASK_KINDS: ReadonlySet<string> = new Set<TaskKind>(['assign', 'quiz', 'attendance', 'forum', 'event', 'other']);
const TASK_STATUSES: ReadonlySet<string> = new Set<TaskStatus>(['open', 'overdue', 'done', 'unknown']);
const TASK_SOURCES: ReadonlySet<string> = new Set<TaskSource>(['ajax', 'dom']);

// Every URL policy takes the enabled site's origin (from the site registry) instead of a constant (D-002).
export function canonicalCourseUrl(input: string, origin: string): string | null {
  if (!isCourseUrl(input, origin)) return null;
  const u = new URL(input);
  return `${origin}/course/view.php?id=${u.searchParams.get('id')}`;
}

export function isCourseUrl(input: string, origin: string): boolean {
  try {
    const url = new URL(input);
    return (
      url.origin === origin && url.pathname === '/course/view.php' && /^\d+$/.test(url.searchParams.get('id') ?? '')
    );
  } catch {
    return false;
  }
}

export function isActivityUrl(input: string, origin: string): boolean {
  try {
    const url = new URL(input);
    return (
      url.origin === origin &&
      /^\/mod\/(?:resource|page|url|attendance|quiz|forum|assign|folder|book|feedback)\/view\.php$/.test(
        url.pathname
      ) &&
      /^\d+$/.test(url.searchParams.get('id') ?? '') &&
      Array.from(url.searchParams.keys()).every((key) => key === 'id')
    );
  } catch {
    return false;
  }
}

export function isTaskUrl(input: string, origin: string): boolean {
  try {
    const url = new URL(input);
    return (
      url.origin === origin &&
      (/^\/mod\/[a-z][a-z0-9_]*\/view\.php$/.test(url.pathname) ||
        url.pathname === '/course/view.php' ||
        url.pathname === '/calendar/view.php') &&
      /^\d+$/.test(url.searchParams.get('id') ?? '') &&
      Array.from(url.searchParams.keys()).every((key) => key === 'id')
    );
  } catch {
    return false;
  }
}

function validActivity(input: unknown, courseId: string, origin: string): input is MoodleActivity {
  if (!input || typeof input !== 'object') return false;
  const item = input as Partial<MoodleActivity>;
  return (
    typeof item.id === 'string' &&
    /^\d+$/.test(item.id) &&
    item.courseId === courseId &&
    typeof item.title === 'string' &&
    item.title.length > 0 &&
    item.title.length <= 300 &&
    typeof item.type === 'string' &&
    KNOWN_TYPES.has(item.type) &&
    typeof item.completion === 'string' &&
    KNOWN_COMPLETION.has(item.completion) &&
    typeof item.restricted === 'boolean' &&
    (item.url === null ? item.restricted : typeof item.url === 'string' && isActivityUrl(item.url, origin))
  );
}

export function isCourseSnapshot(input: unknown, origin: string): input is CourseSnapshot {
  if (!input || typeof input !== 'object') return false;
  const s = input as Partial<CourseSnapshot>;
  if (typeof s.sourceUrl !== 'string' || !isCourseUrl(s.sourceUrl, origin)) return false;
  const actualId = new URL(s.sourceUrl).searchParams.get('id');
  if (canonicalCourseUrl(s.sourceUrl, origin) !== s.sourceUrl) return false;
  const courseId = s.courseId;
  return (
    typeof courseId === 'string' &&
    courseId === actualId &&
    courseId.length <= 80 &&
    (s.courseName === null ||
      (typeof s.courseName === 'string' && s.courseName.length > 0 && s.courseName.length <= 300)) &&
    typeof s.capturedAt === 'string' &&
    Number.isFinite(Date.parse(s.capturedAt)) &&
    Array.isArray(s.activities) &&
    s.activities.length <= 200 &&
    s.activities.every((activity) => validActivity(activity, courseId, origin))
  );
}

function validCourse(input: unknown, siteId: string): input is Course {
  if (!input || typeof input !== 'object') return false;
  const course = input as Partial<Course>;
  return (
    course.siteId === siteId &&
    typeof course.id === 'string' &&
    /^\d+$/.test(course.id) &&
    typeof course.name === 'string' &&
    course.name.length > 0 &&
    course.name.length <= 300 &&
    (course.shortName === undefined ||
      (typeof course.shortName === 'string' && course.shortName.length > 0 && course.shortName.length <= 300)) &&
    typeof course.visible === 'boolean' &&
    (course.progress === undefined ||
      (typeof course.progress === 'number' &&
        Number.isInteger(course.progress) &&
        course.progress >= 0 &&
        course.progress <= 100))
  );
}

function validTask(input: unknown, siteId: string, origin: string): input is MoodleTask {
  if (!input || typeof input !== 'object') return false;
  const task = input as Partial<MoodleTask>;
  return (
    task.siteId === siteId &&
    typeof task.courseId === 'string' &&
    /^\d+$/.test(task.courseId) &&
    (task.activityId === undefined || (typeof task.activityId === 'string' && /^\d+$/.test(task.activityId))) &&
    typeof task.kind === 'string' &&
    TASK_KINDS.has(task.kind) &&
    typeof task.title === 'string' &&
    task.title.length > 0 &&
    task.title.length <= 300 &&
    (task.dueAt === undefined || (typeof task.dueAt === 'string' && Number.isFinite(Date.parse(task.dueAt)))) &&
    typeof task.url === 'string' &&
    isTaskUrl(task.url, origin) &&
    typeof task.status === 'string' &&
    TASK_STATUSES.has(task.status) &&
    typeof task.source === 'string' &&
    TASK_SOURCES.has(task.source)
  );
}

export function isTaskDataset(input: unknown, siteId: string, origin: string): input is TaskDataset {
  if (!input || typeof input !== 'object') return false;
  const data = input as Partial<TaskDataset>;
  return (
    data.siteId === siteId &&
    Array.isArray(data.courses) &&
    data.courses.length <= 200 &&
    data.courses.every((course) => validCourse(course, siteId)) &&
    new Set(data.courses.map((course) => course.id)).size === data.courses.length &&
    Array.isArray(data.tasks) &&
    data.tasks.length <= 500 &&
    data.tasks.every((task) => validTask(task, siteId, origin)) &&
    typeof data.capturedAt === 'string' &&
    Number.isFinite(Date.parse(data.capturedAt)) &&
    typeof data.source === 'string' &&
    TASK_SOURCES.has(data.source) &&
    data.tasks.every((task) => task.source === data.source)
  );
}
