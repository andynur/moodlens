/**
 * Review-log retention (D-014). The student picks how long Moodlens keeps review history; the
 * background prunes every site's logs when the choice changes and on browser start.
 */
import { normalizeRetention, STUDY_RETENTION_KEY, type ReviewLogRetention } from '../shared/cards';
import { loadSites } from './sites';
import { openStudyDb, pruneReviewLogs } from './studyStore';

export async function loadRetention(): Promise<ReviewLogRetention> {
  const stored: unknown = (await chrome.storage.local.get(STUDY_RETENTION_KEY))[STUDY_RETENTION_KEY];
  return normalizeRetention(stored);
}

/** Prunes review logs of every registered site. No-op where IndexedDB is missing, as in unit tests. */
export async function pruneAllReviewLogs(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  now = new Date()
): Promise<void> {
  const sites = await loadSites();
  if (!factory || sites.length === 0) return;
  const retention = await loadRetention();
  const db = await openStudyDb(factory);
  try {
    for (const site of sites) await pruneReviewLogs(db, site.id, now, retention);
  } finally {
    db.close();
  }
}

/** Stores a validated retention choice and applies it at once. Unknown values fall back to the default. */
export async function setReviewLogRetention(
  input: unknown,
  factory: IDBFactory | undefined = globalThis.indexedDB,
  now = new Date()
): Promise<ReviewLogRetention> {
  const retention = normalizeRetention(input);
  await chrome.storage.local.set({ [STUDY_RETENTION_KEY]: retention });
  await pruneAllReviewLogs(factory, now);
  return retention;
}
