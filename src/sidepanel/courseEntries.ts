import type { ActivityChange } from '../shared/diff';
import { orderCourses, pendingChanges, type CourseColor, type CoursePrefs } from '../shared/courses';
import type { TranslationKey } from '../shared/i18n';
import type { CourseSnapshot, Site } from '../shared/types';
import { isCourseUrl } from '../shared/validation';
import { hasChrome, type SitesState } from './useSites';

/** One stored course with its personalization and unseen changes, as the panel shows it. */
export interface CourseEntry {
  key: string;
  site: Site;
  courseId: string;
  snapshot: CourseSnapshot;
  changes: ActivityChange[];
  prefs: CoursePrefs;
}

/** Every stored course, grouped by site in registry order, each group in its display order. */
export function courseEntries(state: SitesState): CourseEntry[] {
  return state.sites.flatMap((site) => {
    const records = state.records[site.id] ?? {};
    const prefs = state.prefs[site.id] ?? {};
    return orderCourses(records, prefs).map((courseId) => {
      const record = records[courseId]!;
      return {
        key: `${site.id}/${courseId}`,
        site,
        courseId,
        snapshot: record.history.at(-1)!,
        changes: pendingChanges(record),
        prefs: prefs[courseId] ?? {}
      };
    });
  });
}

export function courseTitle(entry: CourseEntry, translate: (key: TranslationKey) => string): string {
  return entry.prefs.nickname ?? entry.snapshot.courseName ?? translate('untitledCourse');
}

export const colorDot: Record<CourseColor, string> = {
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  amber: 'bg-amber-500',
  rose: 'bg-rose-600',
  violet: 'bg-violet-600',
  slate: 'bg-slate-500'
};

export const colorLabel: Record<CourseColor, TranslationKey> = {
  blue: 'colorBlue',
  green: 'colorGreen',
  amber: 'colorAmber',
  rose: 'colorRose',
  violet: 'colorViolet',
  slate: 'colorSlate'
};

/** Opens the course page in a new tab after checking it belongs to the course's own site. */
export function openCourse(entry: CourseEntry): boolean {
  const url = entry.snapshot.sourceUrl;
  if (!isCourseUrl(url, entry.site.origin)) return false;
  if (hasChrome) void chrome.tabs.create({ url });
  else window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
