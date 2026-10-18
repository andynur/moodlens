import { createBackup, parseBackup, type Backup } from '../shared/backup';
import { isSiteList, originPattern } from '../shared/sites';
import { SCHEMA_VERSION } from './migrate';
import { loadSites, reconcileScripts } from './sites';
import { removeSiteStudyData } from './studyStore';

export async function exportBackup(): Promise<Backup> {
  return createBackup(await chrome.storage.local.get(null));
}

/**
 * Replaces all local data with a validated backup. Host access is never granted here:
 * origins the backup does not list are revoked, and listed sites without access ask for it in the panel.
 */
export async function importBackup(input: unknown): Promise<boolean> {
  const parsed = parseBackup(input);
  if (!parsed || !isSiteList(parsed.data.sites)) return false;
  const keep = new Set(parsed.data.sites.map((site) => originPattern(site.origin)));
  const { origins = [] } = await chrome.permissions.getAll();
  const revoke = origins.filter((origin) => !keep.has(origin));
  if (revoke.length > 0) await chrome.permissions.remove({ origins: revoke });
  // Backups carry no study data; keep it only for sites the backup lists.
  const listed = new Set(parsed.data.sites.map((site) => site.id));
  for (const site of await loadSites()) if (!listed.has(site.id)) await removeSiteStudyData(site.id);
  await chrome.storage.local.clear();
  await chrome.storage.local.set({ ...parsed.data, schemaVersion: SCHEMA_VERSION });
  await reconcileScripts();
  return true;
}
