import type { Course, MoodleTask, TaskKind } from '../../shared/types';
import { normalizeTaskUrl } from './ajax-data';

const COURSE_CARD = '.dashboard-card[data-course-id], [data-region="course-content"][data-course-id]';
const EVENT_ITEM = '[data-region="event-list-item"], [data-event-id][data-course-id]';
const MAX_COURSES = 200;
const MAX_TASKS = 500;

function text(node: Element | null): string | null {
  const value = (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return value.length > 0 && value.length <= 300 ? value : null;
}

function id(value: string | null): string | null {
  return value && /^\d+$/.test(value) && value !== '0' ? value : null;
}

function kindFromUrl(url: string): TaskKind {
  const moduleName = new URL(url).pathname.match(/^\/mod\/([a-z][a-z0-9_]*)\/view\.php$/)?.[1];
  if (moduleName === 'assign' || moduleName === 'quiz' || moduleName === 'attendance' || moduleName === 'forum') {
    return moduleName;
  }
  return moduleName ? 'event' : 'other';
}

function dueAt(item: Element): string | null {
  const raw = item.querySelector('time[datetime]')?.getAttribute('datetime');
  if (raw && Number.isFinite(Date.parse(raw))) return new Date(raw).toISOString();
  const timestamp = item.querySelector('[data-timestamp]')?.getAttribute('data-timestamp');
  if (!timestamp || !/^\d+$/.test(timestamp)) return null;
  const number = Number(timestamp);
  const milliseconds = number > 10_000_000_000 ? number : number * 1000;
  const date = new Date(milliseconds);
  return Number.isFinite(date.valueOf()) ? date.toISOString() : null;
}

/** Candidate Moodle 4.x dashboard-card fallback; selectors remain unverified outside SiberMu fixtures. */
export function parseDashboardCourses(doc: Document, siteId: string): Course[] {
  const courses: Course[] = [];
  const seen = new Set<string>();
  for (const card of Array.from(doc.querySelectorAll(COURSE_CARD))) {
    if (courses.length >= MAX_COURSES) break;
    const courseId = id(card.getAttribute('data-course-id'));
    const name = text(card.querySelector('.coursename .multiline, .coursename, [data-region="course-name"]'));
    if (!courseId || !name || seen.has(courseId)) continue;
    seen.add(courseId);
    const course: Course = { siteId, id: courseId, name, visible: true };
    const progress = Number(card.querySelector('[role="progressbar"][aria-valuenow]')?.getAttribute('aria-valuenow'));
    if (Number.isFinite(progress) && progress >= 0 && progress <= 100) course.progress = Math.round(progress);
    courses.push(course);
  }
  return courses;
}

/** Parses only timeline items carrying an explicit course id, safe URL and machine-readable timestamp. */
export function parseTimelineTasks(doc: Document, siteId: string, origin: string): MoodleTask[] {
  const tasks: MoodleTask[] = [];
  const seen = new Set<string>();
  for (const item of Array.from(doc.querySelectorAll(EVENT_ITEM))) {
    if (tasks.length >= MAX_TASKS) break;
    const courseId = id(item.getAttribute('data-course-id'));
    const link = item.querySelector<HTMLAnchorElement>('a[href*="/view.php"]');
    const url = normalizeTaskUrl(link?.href, origin);
    const title = text(item.querySelector('[data-region="event-name"], .event-name, h3, h4')) ?? text(link);
    const deadline = dueAt(item);
    if (!courseId || !url || !title || !deadline) continue;
    const identity = `${courseId}|${url}|${deadline}|${title}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    tasks.push({
      siteId,
      courseId,
      kind: kindFromUrl(url),
      title,
      dueAt: deadline,
      url,
      status: item.getAttribute('data-overdue') === 'true' ? 'overdue' : 'open',
      source: 'dom'
    });
  }
  return tasks;
}
