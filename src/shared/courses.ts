import { appendSnapshot, diffHistory, diffSnapshots, SNAPSHOT_HISTORY_LIMIT, type ActivityChange } from './diff';
import type { CourseSnapshot } from './types';
import { isCourseSnapshot } from './validation';

/** Oldest courses are dropped beyond this, so one site cannot fill `chrome.storage.local`. */
export const MAX_COURSES_PER_SITE = 50;
export const MAX_NICKNAME = 60;
/**
 * Serialized size budget of one site's course records. 50 courses x 2 snapshots x 200 long activities
 * could reach about 10 MB, the whole `chrome.storage.local` quota; past this budget the least recently
 * captured courses are dropped first (v0.9 performance pass).
 */
export const COURSE_RECORDS_BUDGET = 1_000_000;

export function courseRecordsKey(siteId: string): string {
  return `site:${siteId}:snapshots`;
}
export function coursePrefsKey(siteId: string): string {
  return `site:${siteId}:courses`;
}

/** What's new state of one course (ML-017). */
export interface CourseRecord {
  /** Oldest first, at most `SNAPSHOT_HISTORY_LIMIT` entries; the last one is the current state. */
  history: CourseSnapshot[];
  /** True after "Mark as seen", and when there is nothing to compare yet. Local only. */
  seen: boolean;
}
/** Course records of one site, keyed by Moodle course id. */
export type CourseRecords = Record<string, CourseRecord>;

/**
 * Adds a capture to a course record. A capture equal to the current state replaces it in place,
 * so frequent recaptures keep the last *different* state as the comparison base.
 * A capture not newer than the current state is ignored.
 */
export function applySnapshot(record: CourseRecord | undefined, snapshot: CourseSnapshot): CourseRecord {
  const latest = record?.history.at(-1);
  if (!record || !latest) return { history: [snapshot], seen: true };
  if (Date.parse(snapshot.capturedAt) <= Date.parse(latest.capturedAt)) return record;
  if (diffSnapshots(latest, snapshot).changes.length === 0) {
    return { history: [...record.history.slice(0, -1), snapshot], seen: record.seen };
  }
  return { history: appendSnapshot(record.history, snapshot), seen: false };
}

function latestAt(record: CourseRecord): number {
  return Date.parse(record.history.at(-1)?.capturedAt ?? '') || 0;
}

/** Applies a capture to a site's records and drops the least recently captured courses beyond the cap. */
export function addSnapshot(records: CourseRecords, snapshot: CourseSnapshot): CourseRecords {
  const next: CourseRecords = { ...records, [snapshot.courseId]: applySnapshot(records[snapshot.courseId], snapshot) };
  const ids = Object.keys(next);
  if (ids.length <= MAX_COURSES_PER_SITE && JSON.stringify(next).length <= COURSE_RECORDS_BUDGET) return next;
  // Newest first; the course just captured always stays.
  ids.sort((a, b) =>
    a === snapshot.courseId ? -1 : b === snapshot.courseId ? 1 : latestAt(next[b]!) - latestAt(next[a]!)
  );
  const kept = ids.slice(0, MAX_COURSES_PER_SITE);
  let size = JSON.stringify(Object.fromEntries(kept.map((id) => [id, next[id]!]))).length;
  while (kept.length > 1 && size > COURSE_RECORDS_BUDGET) {
    const dropped = kept.pop()!;
    size -= JSON.stringify({ [dropped]: next[dropped] }).length - 1;
  }
  return Object.fromEntries(kept.map((id) => [id, next[id]!]));
}

/**
 * Records of a site with the last viewed course added when it has no record yet
 * (data captured before records existed). Read-only helper; nothing new is flagged.
 */
export function withLastSnapshot(records: CourseRecords, last: CourseSnapshot | null): CourseRecords {
  if (!last || records[last.courseId]) return records;
  return { ...records, [last.courseId]: { history: [last], seen: true } };
}

/** Changes the student has not marked as seen yet. */
export function pendingChanges(record: CourseRecord): ActivityChange[] {
  return record.seen ? [] : (diffHistory(record.history)?.changes ?? []);
}

export function isCourseRecords(input: unknown, origin: string): input is CourseRecords {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const entries = Object.entries(input as Record<string, unknown>);
  return (
    entries.length <= MAX_COURSES_PER_SITE &&
    entries.every(([courseId, value]) => {
      if (!/^\d+$/.test(courseId) || !value || typeof value !== 'object') return false;
      const record = value as Partial<CourseRecord>;
      const history = record.history;
      return (
        typeof record.seen === 'boolean' &&
        Array.isArray(history) &&
        history.length >= 1 &&
        history.length <= SNAPSHOT_HISTORY_LIMIT &&
        history.every((item) => isCourseSnapshot(item, origin) && item.courseId === courseId) &&
        history.every((item, index) => index === 0 || item.capturedAt > history[index - 1]!.capturedAt)
      );
    })
  );
}

// Personalization (ML-016). Stored per site; never sent to Moodle.

export const COURSE_COLORS = ['blue', 'green', 'amber', 'rose', 'violet', 'slate'] as const;
export type CourseColor = (typeof COURSE_COLORS)[number];

export interface CoursePrefs {
  pinned?: true;
  hidden?: true;
  nickname?: string;
  color?: CourseColor;
  /** Manual order inside the site; set only by moving a course. */
  position?: number;
}
export type CoursePrefsMap = Record<string, CoursePrefs>;

/** Validated prefs with defaults removed; null when the input is malformed. */
export function cleanPrefs(input: unknown): CoursePrefs | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const allowed = new Set(['pinned', 'hidden', 'nickname', 'color', 'position']);
  if (Object.keys(raw).some((key) => !allowed.has(key))) return null;
  const prefs: CoursePrefs = {};
  for (const flag of ['pinned', 'hidden'] as const) {
    if (raw[flag] === true) prefs[flag] = true;
    else if (raw[flag] !== undefined && raw[flag] !== false) return null;
  }
  if (raw.nickname !== undefined) {
    if (typeof raw.nickname !== 'string') return null;
    const nickname = raw.nickname.replace(/\s+/g, ' ').trim();
    if (nickname.length > MAX_NICKNAME) return null;
    if (nickname) prefs.nickname = nickname;
  }
  if (raw.color !== undefined) {
    if (!(COURSE_COLORS as readonly unknown[]).includes(raw.color)) return null;
    prefs.color = raw.color as CourseColor;
  }
  if (raw.position !== undefined) {
    if (!Number.isInteger(raw.position) || (raw.position as number) < 0) return null;
    prefs.position = raw.position as number;
  }
  return prefs;
}

export function isCoursePrefsMap(input: unknown): input is CoursePrefsMap {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const entries = Object.entries(input as Record<string, unknown>);
  return (
    entries.length <= MAX_COURSES_PER_SITE &&
    entries.every(([courseId, value]) => {
      const clean = /^\d+$/.test(courseId) ? cleanPrefs(value) : null;
      return clean !== null && JSON.stringify(clean) === JSON.stringify(value);
    })
  );
}

/** `<siteId>/<courseId>` keys of hidden courses across sites; hidden courses stay out of Today and Tasks. */
export function hiddenCourseKeys(prefsBySite: Record<string, CoursePrefsMap>): Set<string> {
  const keys = new Set<string>();
  for (const [siteId, prefs] of Object.entries(prefsBySite)) {
    for (const [courseId, pref] of Object.entries(prefs)) if (pref.hidden) keys.add(`${siteId}/${courseId}`);
  }
  return keys;
}

/** Course ids of one site in display order: pinned first, then manual position, then most recently captured. */
export function orderCourses(records: CourseRecords, prefs: CoursePrefsMap): string[] {
  return Object.keys(records).sort((a, b) => {
    const pa = prefs[a] ?? {};
    const pb = prefs[b] ?? {};
    if (Boolean(pa.pinned) !== Boolean(pb.pinned)) return pa.pinned ? -1 : 1;
    const xa = pa.position ?? Number.MAX_SAFE_INTEGER;
    const xb = pb.position ?? Number.MAX_SAFE_INTEGER;
    if (xa !== xb) return xa - xb;
    return latestAt(records[b]!) - latestAt(records[a]!) || a.localeCompare(b);
  });
}

/**
 * Moves a course one step up or down inside its group (pinned or not) and returns prefs where every
 * course of the site has an explicit position. Unknown course or no neighbour: prefs unchanged.
 */
export function moveCourse(
  records: CourseRecords,
  prefs: CoursePrefsMap,
  courseId: string,
  direction: 'up' | 'down'
): CoursePrefsMap {
  const order = orderCourses(records, prefs);
  const index = order.indexOf(courseId);
  const target = index + (direction === 'up' ? -1 : 1);
  const neighbour = order[target];
  if (index < 0 || neighbour === undefined) return prefs;
  if (Boolean(prefs[courseId]?.pinned) !== Boolean(prefs[neighbour]?.pinned)) return prefs;
  order[target] = courseId;
  order[index] = neighbour;
  return Object.fromEntries(order.map((id, position) => [id, { ...prefs[id], position }]));
}
