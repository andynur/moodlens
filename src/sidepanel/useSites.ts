import { useEffect, useState } from 'react';
import { appearanceKey, isAppearancePrefs, type AppearancePrefs } from '../shared/appearance';
import {
  coursePrefsKey,
  courseRecordsKey,
  isCoursePrefsMap,
  isCourseRecords,
  withLastSnapshot,
  type CoursePrefs,
  type CoursePrefsMap,
  type CourseRecords
} from '../shared/courses';
import { isSiteList, originPattern, snapshotKey } from '../shared/sites';
import type { CourseSnapshot, EnableSiteResponse, OkResponse, Site } from '../shared/types';
import { normalizeSiteOrigin } from '../shared/sites';
import { isCourseSnapshot } from '../shared/validation';

export const hasChrome = typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id);

export interface SitesState {
  sites: Site[];
  /** Latest validated snapshot per site id. */
  snapshots: Record<string, CourseSnapshot>;
  /** What's new records per site id, including the last viewed course. */
  records: Record<string, CourseRecords>;
  /** Moodle page appearance per site id (ML-018). */
  appearance: Record<string, AppearancePrefs>;
  /** Personalization per site id. */
  prefs: Record<string, CoursePrefsMap>;
  /** Whether Chrome still grants host access per site id; the student can revoke it outside Moodlens. */
  access: Record<string, boolean>;
  failed: boolean;
}

const EMPTY: SitesState = {
  sites: [],
  snapshots: {},
  records: {},
  prefs: {},
  appearance: {},
  access: {},
  failed: false
};

async function readState(): Promise<SitesState> {
  const stored = await chrome.storage.local.get('sites');
  const sites = isSiteList(stored.sites) ? stored.sites : [];
  const keys = sites.flatMap((site) => [
    snapshotKey(site.id),
    courseRecordsKey(site.id),
    coursePrefsKey(site.id),
    appearanceKey(site.id)
  ]);
  const values = keys.length > 0 ? await chrome.storage.local.get(keys) : {};
  const snapshots: Record<string, CourseSnapshot> = {};
  const records: Record<string, CourseRecords> = {};
  const prefs: Record<string, CoursePrefsMap> = {};
  const appearance: Record<string, AppearancePrefs> = {};
  const access: Record<string, boolean> = {};
  for (const site of sites) {
    const value: unknown = values[snapshotKey(site.id)];
    if (isCourseSnapshot(value, site.origin)) snapshots[site.id] = value;
    const siteRecords: unknown = values[courseRecordsKey(site.id)];
    records[site.id] = withLastSnapshot(
      isCourseRecords(siteRecords, site.origin) ? siteRecords : {},
      snapshots[site.id] ?? null
    );
    const sitePrefs: unknown = values[coursePrefsKey(site.id)];
    prefs[site.id] = isCoursePrefsMap(sitePrefs) ? sitePrefs : {};
    const siteAppearance: unknown = values[appearanceKey(site.id)];
    appearance[site.id] = isAppearancePrefs(siteAppearance) ? siteAppearance : {};
    access[site.id] = await chrome.permissions.contains({ origins: [originPattern(site.origin)] });
  }
  return { sites, snapshots, records, prefs, appearance, access, failed: false };
}

/** Site registry, snapshots and access, kept current from storage and permission events. */
export function useSites(): SitesState {
  const [state, setState] = useState<SitesState>(EMPTY);
  useEffect(() => {
    if (!hasChrome) return;
    let latest = 0;
    const reload = () => {
      const run = ++latest;
      readState()
        .then((next) => run === latest && setState(next))
        .catch(() => run === latest && setState({ ...EMPTY, failed: true }));
    };
    const onStorage = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && Object.keys(changes).some((key) => key === 'sites' || key.startsWith('site:'))) reload();
    };
    reload();
    chrome.storage.onChanged.addListener(onStorage);
    chrome.permissions.onAdded.addListener(reload);
    chrome.permissions.onRemoved.addListener(reload);
    return () => {
      latest = -1;
      chrome.storage.onChanged.removeListener(onStorage);
      chrome.permissions.onAdded.removeListener(reload);
      chrome.permissions.onRemoved.removeListener(reload);
    };
  }, []);
  return state;
}

export type EnableOutcome = { kind: 'invalid' | 'denied' | 'error' } | { kind: 'enabled'; site: Site };

/**
 * Asks Chrome for one origin and registers it. Must be called directly from a click handler:
 * `permissions.request` needs the user gesture, so nothing may be awaited before it.
 */
export async function enableSiteFromInput(input: string): Promise<EnableOutcome> {
  const origin = normalizeSiteOrigin(input);
  if (!origin) return { kind: 'invalid' };
  const granted = await chrome.permissions.request({ origins: [originPattern(origin)] }).catch(() => false);
  if (!granted) return { kind: 'denied' };
  const response = (await chrome.runtime
    .sendMessage({ type: 'ENABLE_SITE', origin })
    .catch(() => null)) as EnableSiteResponse | null;
  return response?.ok && response.site ? { kind: 'enabled', site: response.site } : { kind: 'error' };
}

export async function sendSiteCommand(
  message:
    | { type: 'RENAME_SITE' | 'REMOVE_SITE'; siteId: string; label?: string }
    | { type: 'MARK_COURSE_SEEN'; siteId: string; courseId: string }
    | { type: 'SET_COURSE_PREFS'; siteId: string; courseId: string; prefs: CoursePrefs }
    | { type: 'MOVE_COURSE'; siteId: string; courseId: string; direction: 'up' | 'down' }
    | { type: 'IMPORT_BACKUP'; backup: unknown }
    | { type: 'SET_APPEARANCE'; siteId: string; appearance: AppearancePrefs }
) {
  const response = (await chrome.runtime.sendMessage(message).catch(() => null)) as OkResponse | null;
  return response?.ok === true;
}

/** Active tab address when Chrome exposes it (only on origins already granted); used to prefill the form. */
export async function activeTabOrigin(): Promise<string | null> {
  if (!hasChrome) return null;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
  return tab?.url ? normalizeSiteOrigin(tab.url) : null;
}
