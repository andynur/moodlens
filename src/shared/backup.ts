import { appearanceKey, isAppearancePrefs } from './appearance';
import { isReviewLogRetention, STUDY_RETENTION_KEY } from './cards';
import { coursePrefsKey, courseRecordsKey, isCoursePrefsMap, isCourseRecords } from './courses';
import { DASHBOARD_KEY, isDashboardLayout } from './dashboard';
import { isSiteList, snapshotKey } from './sites';
import { isXpState } from './xp';
import type { Site } from './types';
import { isCourseSnapshot } from './validation';

// Backup (ML-023 part 2). Allowlist only: keys added later (API keys, quiz-derived cards) stay out
// until they are listed here on purpose.

export const BACKUP_FORMAT = 'moodlens-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5_000_000;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: Record<string, unknown>;
}

export interface BackupPreview {
  exportedAt: string;
  sites: number;
  courses: number;
}

const GLOBAL_KEYS: Record<string, (value: unknown) => boolean> = {
  locale: (value) => value === 'en' || value === 'id',
  onboarded: (value) => value === true,
  theme: (value) => value === 'light' || value === 'dark' || value === 'system',
  [DASHBOARD_KEY]: isDashboardLayout,
  [STUDY_RETENTION_KEY]: isReviewLogRetention,
  xp: isXpState
};

function siteKeys(site: Site): Record<string, (value: unknown) => boolean> {
  return {
    [snapshotKey(site.id)]: (value) => isCourseSnapshot(value, site.origin),
    [courseRecordsKey(site.id)]: (value) => isCourseRecords(value, site.origin),
    [coursePrefsKey(site.id)]: isCoursePrefsMap,
    [appearanceKey(site.id)]: isAppearancePrefs
  };
}

function validators(sites: Site[]): Record<string, (value: unknown) => boolean> {
  return Object.assign({}, GLOBAL_KEYS, ...sites.map(siteKeys)) as Record<string, (value: unknown) => boolean>;
}

/** Builds a backup from a full `chrome.storage.local` read; invalid and unlisted values are left out. */
export function createBackup(stored: Record<string, unknown>, now = new Date()): Backup {
  const sites = isSiteList(stored.sites) ? stored.sites : [];
  const data: Record<string, unknown> = { sites };
  for (const [key, valid] of Object.entries(validators(sites))) {
    if (key in stored && valid(stored[key])) data[key] = stored[key];
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

/** Strict check of an imported backup: any unknown key or invalid value rejects the whole file. */
export function parseBackup(input: unknown): { data: Record<string, unknown>; preview: BackupPreview } | null {
  if (!input || typeof input !== 'object') return null;
  const backup = input as Partial<Backup>;
  if (backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) return null;
  if (typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))) return null;
  const data = backup.data;
  if (!data || typeof data !== 'object' || Array.isArray(data) || !isSiteList(data.sites)) return null;
  const sites = data.sites;
  if (new Set(sites.map((site) => site.id)).size !== sites.length) return null;
  const allowed = validators(sites);
  for (const [key, value] of Object.entries(data)) {
    if (key === 'sites') continue;
    const valid = allowed[key];
    if (!valid || !valid(value)) return null;
  }
  const courses = sites.reduce((sum, site) => {
    const records = data[courseRecordsKey(site.id)];
    return sum + (records ? Object.keys(records as object).length : data[snapshotKey(site.id)] ? 1 : 0);
  }, 0);
  return { data, preview: { exportedAt: backup.exportedAt, sites: sites.length, courses } };
}

/** Parses file text; null for oversized, non-JSON or invalid backups. */
export function parseBackupText(text: string): ReturnType<typeof parseBackup> {
  if (text.length > MAX_BACKUP_BYTES) return null;
  try {
    return parseBackup(JSON.parse(text));
  } catch {
    return null;
  }
}
