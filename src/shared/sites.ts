import type { DetectionConfidence, Site } from './types';

const CONFIDENCE: ReadonlySet<string> = new Set<DetectionConfidence>(['high', 'low', 'none']);
export const MAX_SITES = 20;
export const MAX_LABEL = 60;

/**
 * Returns the origin of an HTTPS URL typed or shown to the student, or null.
 * HTTP, credentials and non-default schemes are refused (D-002: HTTPS only).
 */
export function normalizeSiteOrigin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Stable id from the origin: hostname plus a non-default port. Safe as a storage key part and script id. */
export function siteIdFor(origin: string): string {
  return new URL(origin).host;
}

/** Match pattern for `chrome.permissions` and `registerContentScripts` limited to one origin. */
export function originPattern(origin: string): string {
  return `${origin}/*`;
}

export function snapshotKey(siteId: string): string {
  return `site:${siteId}:lastCourseSnapshot`;
}

export function taskDataKey(siteId: string): string {
  return `site:${siteId}:tasks`;
}

export function taskFetchKey(siteId: string): string {
  return `site:${siteId}:taskFetchAt`;
}

export function taskFetchRateKey(siteId: string): string {
  return `site:${siteId}:taskFetchRate`;
}

export function taskUnsupportedKey(siteId: string): string {
  return `site:${siteId}:taskUnsupported`;
}

export function isSite(input: unknown): input is Site {
  if (!input || typeof input !== 'object') return false;
  const site = input as Partial<Site>;
  return (
    typeof site.origin === 'string' &&
    normalizeSiteOrigin(site.origin) === site.origin &&
    site.id === siteIdFor(site.origin) &&
    typeof site.label === 'string' &&
    site.label.length > 0 &&
    site.label.length <= MAX_LABEL &&
    typeof site.enabledAt === 'string' &&
    Number.isFinite(Date.parse(site.enabledAt)) &&
    (site.versionHint === undefined || (typeof site.versionHint === 'string' && site.versionHint.length <= 20)) &&
    (site.detection === undefined || (typeof site.detection === 'string' && CONFIDENCE.has(site.detection)))
  );
}

export function isSiteList(input: unknown): input is Site[] {
  return Array.isArray(input) && input.length <= MAX_SITES && input.every(isSite);
}

export function cleanLabel(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const label = input.replace(/\s+/g, ' ').trim();
  return label.length > 0 && label.length <= MAX_LABEL ? label : null;
}
