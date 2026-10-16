import type { CourseSnapshot, MoodleActivity, ActivityType, CompletionStatus } from './types';

export const LMS_ORIGIN = 'https://solusi.sibermu.ac.id';
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

export function canonicalCourseUrl(input: string): string | null {
  if (!isCourseUrl(input)) return null;
  const u = new URL(input);
  return `${LMS_ORIGIN}/course/view.php?id=${u.searchParams.get('id')}`;
}

export function isCourseUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return (
      url.origin === LMS_ORIGIN && url.pathname === '/course/view.php' && /^\d+$/.test(url.searchParams.get('id') ?? '')
    );
  } catch {
    return false;
  }
}

export function isActivityUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return (
      url.origin === LMS_ORIGIN &&
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

function validActivity(input: unknown, courseId: string): input is MoodleActivity {
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
    (item.url === null ? item.restricted : typeof item.url === 'string' && isActivityUrl(item.url))
  );
}

export function isCourseSnapshot(input: unknown): input is CourseSnapshot {
  if (!input || typeof input !== 'object') return false;
  const s = input as Partial<CourseSnapshot>;
  if (typeof s.sourceUrl !== 'string' || !isCourseUrl(s.sourceUrl)) return false;
  const actualId = new URL(s.sourceUrl).searchParams.get('id');
  if (canonicalCourseUrl(s.sourceUrl) !== s.sourceUrl) return false;
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
    s.activities.every((activity) => validActivity(activity, courseId))
  );
}
