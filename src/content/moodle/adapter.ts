import type { ActivityType, CompletionStatus, CourseSnapshot, MoodleActivity } from '../../shared/types';
import { isActivityUrl, isCourseUrl, LMS_ORIGIN, canonicalCourseUrl } from '../../shared/validation';

// Candidate selectors only. Real authenticated Moodle page fixtures have NOT been verified.
const COURSE_HEADING = '.page-header-headings h1, #page-header h1, h1';
const ACTIVITY_CONTAINER = '.activity-item, li.activity';
const MODULE_LINK = 'a[href*="/mod/"][href*="/view.php"]';
const COMPLETION_CONTAINER = '.activity-completion, [data-region="completion-info"], [data-region="completion"]';
const MAX_ACTIVITIES = 200;

const TYPE_FROM_PATH: Readonly<Record<string, ActivityType>> = {
  resource: 'resource', page: 'page', url: 'url', attendance: 'attendance',
  quiz: 'quiz', forum: 'forum', assign: 'assign'
};

function concise(value: string | null | undefined, max = 300): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function getType(path: string): ActivityType {
  const moduleName = path.match(/^\/mod\/([a-z]+)\/view\.php$/)?.[1];
  return TYPE_FROM_PATH[moduleName ?? ''] ?? 'unknown';
}

export function parseCompletion(container: Element): CompletionStatus {
  const scope = container.querySelector(COMPLETION_CONTAINER);
  if (!scope) return 'unknown';
  const candidate = concise([
    scope.textContent,
    scope.getAttribute('aria-label'),
    scope.getAttribute('title'),
    ...Array.from(scope.querySelectorAll('[aria-label], [title]'))
      .slice(0, 6)
      .map((node) => `${node.getAttribute('aria-label') ?? ''} ${node.getAttribute('title') ?? ''}`)
  ].join(' '), 1000).toLowerCase();
  if (/\b(?:not completed|not done|mark as done|belum selesai|tandai selesai)\b/.test(candidate)) return 'incomplete';
  if (/\b(?:completed|done|mark as not done|sudah selesai|selesai)\b/.test(candidate)) return 'complete';
  return 'unknown';
}

export function parseCourse(doc: Document, urlString: string, now = new Date()): CourseSnapshot | null {
  if (!isCourseUrl(urlString)) return null;
  const url = new URL(urlString);
  const courseId = url.searchParams.get('id')!;
  const heading = doc.querySelector(COURSE_HEADING);
  const courseName = concise(heading?.textContent) || 'Untitled course';
  const activities: MoodleActivity[] = [];
  const seen = new Set<string>();

  for (const container of Array.from(doc.querySelectorAll(ACTIVITY_CONTAINER))) {
    if (activities.length >= MAX_ACTIVITIES) break;
    const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>(MODULE_LINK));
    const link = anchors.find((a) => {
      try {
        const u = new URL(a.href);
        return isActivityUrl(`${u.origin}${u.pathname}?id=${u.searchParams.get('id')}`);
      } catch { return false; }
    });
    if (!link) continue;
    const activityUrl = new URL(link.href);
    const id = activityUrl.searchParams.get('id')!;
    const identity = `${activityUrl.pathname}?id=${id}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const label = concise(link.textContent || link.getAttribute('aria-label') || link.title || '', 300);
    if (!label) continue;
    activities.push({
      id, courseId, title: label,
      type: getType(activityUrl.pathname),
      url: `${LMS_ORIGIN}${activityUrl.pathname}?id=${id}`, 
      completion: parseCompletion(container)
    });
  }
  return { courseId, courseName, sourceUrl: canonicalCourseUrl(urlString)!, capturedAt: now.toISOString(), activities };
}
