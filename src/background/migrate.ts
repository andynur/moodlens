import { isSiteList, siteIdFor, snapshotKey } from '../shared/sites';
import type { Site } from '../shared/types';
import { isCourseSnapshot } from '../shared/validation';

export const SCHEMA_VERSION = 2;
// v0.2 stored one snapshot for its single hardcoded site; both names exist only to migrate that data.
const LEGACY_SNAPSHOT_KEY = 'lastCourseSnapshot';
const LEGACY_ORIGIN = 'https://solusi.sibermu.ac.id';

interface Area {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string): Promise<void>;
}

/**
 * Upgrades stored data to the multi-site layout. Idempotent; runs on every service worker start.
 * A v0.2 snapshot makes SiberMu the first registered site. Its host access is not carried over
 * (v0.2 had a static content script), so the panel asks the student to grant it again.
 */
export async function migrateStorage(area: Area, now = new Date()): Promise<void> {
  const stored = await area.get(['schemaVersion', 'sites', LEGACY_SNAPSHOT_KEY]);
  if (typeof stored.schemaVersion === 'number' && stored.schemaVersion >= SCHEMA_VERSION) return;
  const sites: Site[] = isSiteList(stored.sites) ? stored.sites : [];
  const updates: Record<string, unknown> = { schemaVersion: SCHEMA_VERSION };
  const legacy: unknown = stored[LEGACY_SNAPSHOT_KEY];
  if (isCourseSnapshot(legacy, LEGACY_ORIGIN)) {
    const id = siteIdFor(LEGACY_ORIGIN);
    if (!sites.some((site) => site.id === id)) {
      sites.push({ id, origin: LEGACY_ORIGIN, label: id, enabledAt: now.toISOString() });
    }
    updates[snapshotKey(id)] = legacy;
  }
  updates.sites = sites;
  await area.set(updates);
  await area.remove(LEGACY_SNAPSHOT_KEY);
}
