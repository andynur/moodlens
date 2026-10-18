import type { ActivityType, CompletionStatus, CourseSnapshot, MoodleActivity } from '../../shared/types';
import { isActivityUrl, isCourseUrl, canonicalCourseUrl } from '../../shared/validation';

// Candidate selectors only. Real authenticated Moodle page fixtures have NOT been verified.
const COURSE_HEADING = '.page-header-headings h1, #page-header h1, h1';
const ACTIVITY_CONTAINER = '.activity-item, li.activity';
const MODULE_LINK = 'a[href*="/mod/"][href*="/view.php"]';
const COMPLETION_CONTAINER = '.activity-completion, [data-region="completion-info"], [data-region="completion"]';
// Verified on SiberMu: manual:mark-done in fixtures; manual:undo in live markup (2026-10-18), not yet in a fixture.
const MANUAL_TOGGLE = 'button[data-action="toggle-manual-completion"][data-toggletype]';
// Verified live on SiberMu (theme_remui, 2026-10-18): the course index drawer marks completion per module.
// Rendered by Moodle JS, so it may be absent on the first capture.
const COURSE_INDEX_COMPLETION = '[data-for="cm_completion"]';
const ACCESSHIDE = '.accesshide';
// Verified on SiberMu fixtures: locked activities render `.instancename` without a link.
const INSTANCE_NAME = '.instancename';
const SKIPPED_MODTYPES: ReadonlySet<string> = new Set(['label']);
const MAX_ACTIVITIES = 200;

const TYPE_FROM_PATH: Readonly<Record<string, ActivityType>> = {
  resource: 'resource',
  page: 'page',
  url: 'url',
  attendance: 'attendance',
  quiz: 'quiz',
  forum: 'forum',
  assign: 'assign',
  folder: 'folder',
  book: 'book',
  feedback: 'feedback'
};

function concise(value: string | null | undefined, max = 300): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
// Link text without `.accesshide` spans, which append the module type (" File", " Forum").
function visibleText(node: Element): string {
  const copy = node.cloneNode(true) as Element;
  copy.querySelectorAll(ACCESSHIDE).forEach((hidden) => hidden.remove());
  return copy.textContent ?? '';
}
function getType(path: string): ActivityType {
  const moduleName = path.match(/^\/mod\/([a-z]+)\/view\.php$/)?.[1];
  return TYPE_FROM_PATH[moduleName ?? ''] ?? 'unknown';
}
function modType(container: Element): string | null {
  return (
    Array.from(container.classList)
      .find((name) => name.startsWith('modtype_'))
      ?.slice('modtype_'.length) ?? null
  );
}

// An activity Moodle lists without a link: shown as restricted, never navigable.
function restrictedActivity(
  container: Element,
  courseId: string
): { identity: string; activity: MoodleActivity } | null {
  if (!container.matches('li.activity')) return null;
  const id = container.getAttribute('data-id') ?? '';
  const moduleName = modType(container);
  if (!/^\d+$/.test(id) || !moduleName || !/^[a-z]+$/.test(moduleName) || SKIPPED_MODTYPES.has(moduleName)) return null;
  const name = container.querySelector(INSTANCE_NAME);
  const title = concise(name ? visibleText(name) : '', 300);
  if (!title) return null;
  return {
    identity: `/mod/${moduleName}/view.php?id=${id}`,
    activity: {
      id,
      courseId,
      title,
      type: TYPE_FROM_PATH[moduleName] ?? 'unknown',
      url: null,
      restricted: true,
      completion: parseCompletion(container)
    }
  };
}

export function parseCompletion(container: Element): CompletionStatus {
  const scope = container.querySelector(COMPLETION_CONTAINER);
  if (!scope) return 'unknown';
  // The toggle type states the current state; prefer it over localized text.
  const toggleType = scope.querySelector(MANUAL_TOGGLE)?.getAttribute('data-toggletype');
  if (toggleType === 'manual:undo') return 'complete';
  if (toggleType === 'manual:mark-done') return 'incomplete';
  const candidate = concise(
    [
      scope.textContent,
      scope.getAttribute('aria-label'),
      scope.getAttribute('title'),
      ...Array.from(scope.querySelectorAll('[aria-label], [title]'))
        .slice(0, 6)
        .map((node) => `${node.getAttribute('aria-label') ?? ''} ${node.getAttribute('title') ?? ''}`)
    ].join(' '),
    1000
  ).toLowerCase();
  // "Mark as not done" means the activity is complete, so test it before the "not done" pattern.
  if (/\bmark as not done\b/.test(candidate)) return 'complete';
  if (/\b(?:not completed|not done|mark as done|to do|belum selesai|tandai selesai)\b/.test(candidate))
    return 'incomplete';
  if (/\b(?:completed|done|sudah selesai|selesai)\b/.test(candidate)) return 'complete';
  return 'unknown';
}

// Course index fallback. Moodle values: 0 incomplete, 1 complete, 2 complete pass, 3 complete fail.
export function parseCourseIndexCompletion(doc: Document, moduleId: string): CompletionStatus {
  if (!/^\d+$/.test(moduleId)) return 'unknown';
  const icon = doc.querySelector(`[data-for="cm"][data-id="${moduleId}"] ${COURSE_INDEX_COMPLETION}`);
  if (!icon) return 'unknown';
  const value = icon.getAttribute('data-value');
  if (value === '1' || value === '2' || icon.classList.contains('completion_complete')) return 'complete';
  if (value === '3' || icon.classList.contains('completion_incomplete') || icon.classList.contains('completion_fail'))
    return 'incomplete';
  return 'unknown';
}

/** Parses a course page of the site at `urlString`'s origin; the background checks that origin against the registry. */
export function parseCourse(doc: Document, urlString: string, now = new Date()): CourseSnapshot | null {
  let origin: string;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return null;
    origin = parsed.origin;
  } catch {
    return null;
  }
  if (!isCourseUrl(urlString, origin)) return null;
  const url = new URL(urlString);
  const courseId = url.searchParams.get('id')!;
  const heading = doc.querySelector(COURSE_HEADING);
  const courseName = concise(heading?.textContent) || null;
  const activities: MoodleActivity[] = [];
  const seen = new Set<string>();

  for (const container of Array.from(doc.querySelectorAll(ACTIVITY_CONTAINER))) {
    if (activities.length >= MAX_ACTIVITIES) break;
    const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>(MODULE_LINK));
    const link = anchors.find((a) => {
      try {
        const u = new URL(a.href);
        return isActivityUrl(`${u.origin}${u.pathname}?id=${u.searchParams.get('id')}`, origin);
      } catch {
        return false;
      }
    });
    if (!link) {
      const restricted = restrictedActivity(container, courseId);
      if (restricted && !seen.has(restricted.identity)) {
        seen.add(restricted.identity);
        activities.push(restricted.activity);
      }
      continue;
    }
    const activityUrl = new URL(link.href);
    const id = activityUrl.searchParams.get('id')!;
    const identity = `${activityUrl.pathname}?id=${id}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const label = concise(visibleText(link) || link.getAttribute('aria-label') || link.title || '', 300);
    if (!label) continue;
    activities.push({
      id,
      courseId,
      title: label,
      type: getType(activityUrl.pathname),
      url: `${origin}${activityUrl.pathname}?id=${id}`,
      restricted: false,
      completion: parseCompletion(container)
    });
  }
  for (const activity of activities) {
    if (activity.completion === 'unknown') activity.completion = parseCourseIndexCompletion(doc, activity.id);
  }
  return {
    courseId,
    courseName,
    sourceUrl: canonicalCourseUrl(urlString, origin)!,
    capturedAt: now.toISOString(),
    activities
  };
}
