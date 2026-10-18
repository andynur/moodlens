import {
  addSnapshot,
  cleanPrefs,
  coursePrefsKey,
  courseRecordsKey,
  isCoursePrefsMap,
  isCourseRecords,
  moveCourse,
  withLastSnapshot,
  type CoursePrefsMap,
  type CourseRecords
} from '../shared/courses';
import { snapshotKey } from '../shared/sites';
import type { CourseSnapshot, Site } from '../shared/types';
import { isCourseSnapshot } from '../shared/validation';
import { loadSites } from './sites';

interface SiteCourses {
  records: CourseRecords;
  prefs: CoursePrefsMap;
}

async function loadCourses(site: Site): Promise<SiteCourses> {
  const keys = [courseRecordsKey(site.id), coursePrefsKey(site.id), snapshotKey(site.id)];
  const stored = await chrome.storage.local.get(keys);
  const records: unknown = stored[courseRecordsKey(site.id)];
  const prefs: unknown = stored[coursePrefsKey(site.id)];
  const last: unknown = stored[snapshotKey(site.id)];
  return {
    records: withLastSnapshot(
      isCourseRecords(records, site.origin) ? records : {},
      isCourseSnapshot(last, site.origin) ? last : null
    ),
    prefs: isCoursePrefsMap(prefs) ? prefs : {}
  };
}

/** Stores a validated capture as the site's last viewed course and in its what's new records. */
export async function saveSnapshot(site: Site, snapshot: CourseSnapshot): Promise<void> {
  const { records } = await loadCourses(site);
  await chrome.storage.local.set({
    [snapshotKey(site.id)]: snapshot,
    [courseRecordsKey(site.id)]: addSnapshot(records, snapshot)
  });
}

/** Loads a registered site and one of its known courses, or null. */
async function target(siteId: unknown, courseId: unknown) {
  const site = (await loadSites()).find((item) => item.id === siteId);
  if (!site || typeof courseId !== 'string') return null;
  const courses = await loadCourses(site);
  return courses.records[courseId] ? { site, courseId, ...courses } : null;
}

export async function markCourseSeen(siteId: unknown, courseId: unknown): Promise<boolean> {
  const found = await target(siteId, courseId);
  if (!found) return false;
  const records = { ...found.records, [found.courseId]: { ...found.records[found.courseId]!, seen: true } };
  await chrome.storage.local.set({ [courseRecordsKey(found.site.id)]: records });
  return true;
}

/** Replaces pin, hidden, nickname and color of a course; its manual position is kept. */
export async function setCoursePrefs(siteId: unknown, courseId: unknown, input: unknown): Promise<boolean> {
  const found = await target(siteId, courseId);
  const clean = cleanPrefs(input);
  if (!found || !clean) return false;
  const { position } = found.prefs[found.courseId] ?? {};
  const next = { ...clean };
  delete next.position;
  if (position !== undefined) next.position = position;
  const prefs = { ...found.prefs, [found.courseId]: next };
  if (Object.keys(next).length === 0) delete prefs[found.courseId];
  await chrome.storage.local.set({ [coursePrefsKey(found.site.id)]: prefs });
  return true;
}

export async function moveCourseOrder(siteId: unknown, courseId: unknown, direction: unknown): Promise<boolean> {
  const found = await target(siteId, courseId);
  if (!found || (direction !== 'up' && direction !== 'down')) return false;
  const prefs = moveCourse(found.records, found.prefs, found.courseId, direction);
  await chrome.storage.local.set({ [coursePrefsKey(found.site.id)]: prefs });
  return true;
}
