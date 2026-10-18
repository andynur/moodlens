import { detectMoodle, isDetection } from '../content/moodle/detect';
import { cleanLabel, isSiteList, MAX_SITES, normalizeSiteOrigin, originPattern, siteIdFor } from '../shared/sites';
import type { Site } from '../shared/types';
import { appearanceActive, appearanceKey, isAppearancePrefs } from '../shared/appearance';
import { removeSiteStudyData } from './studyStore';

const SITES_KEY = 'sites';
const SCRIPT_PREFIX = 'moodlens-';
const ENABLED_ORIGIN_PATH = '/*';

export async function loadSites(): Promise<Site[]> {
  const stored = await chrome.storage.local.get(SITES_KEY);
  return isSiteList(stored[SITES_KEY]) ? stored[SITES_KEY] : [];
}

async function saveSites(sites: Site[]): Promise<void> {
  await chrome.storage.local.set({ [SITES_KEY]: sites });
}

function hasAccess(origin: string): Promise<boolean> {
  return chrome.permissions.contains({ origins: [originPattern(origin)] });
}

function scriptFor(site: Site): chrome.scripting.RegisteredContentScript {
  return {
    id: `${SCRIPT_PREFIX}${site.id}`,
    matches: [`${site.origin}${ENABLED_ORIGIN_PATH}`],
    js: ['content.js'],
    runAt: 'document_idle',
    persistAcrossSessions: true
  };
}

const APPEARANCE_PREFIX = `${SCRIPT_PREFIX}appearance-`;

/** Appearance script (ML-018): early, so pages do not flash before the options apply. */
function appearanceScriptFor(site: Site): chrome.scripting.RegisteredContentScript {
  return {
    id: `${APPEARANCE_PREFIX}${site.id}`,
    matches: [`${site.origin}${ENABLED_ORIGIN_PATH}`],
    js: ['appearance.js'],
    css: ['appearance.css'],
    runAt: 'document_start',
    persistAcrossSessions: true
  };
}

async function wantsAppearance(site: Site): Promise<boolean> {
  const key = appearanceKey(site.id);
  const value: unknown = (await chrome.storage.local.get(key))[key];
  return isAppearancePrefs(value) && appearanceActive(value);
}

/**
 * Makes registered content scripts match the registry: one per site with granted access, plus an
 * appearance script for sites with an appearance option on, nothing else.
 * Runs on install, browser start and permission changes (the student can revoke access in Chrome).
 */
export async function reconcileScripts(): Promise<void> {
  const wanted = new Map<string, chrome.scripting.RegisteredContentScript>();
  for (const site of await loadSites()) {
    if (!(await hasAccess(site.origin))) continue;
    wanted.set(scriptFor(site).id, scriptFor(site));
    if (await wantsAppearance(site)) wanted.set(appearanceScriptFor(site).id, appearanceScriptFor(site));
  }
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const current = (script: chrome.scripting.RegisteredContentScript) =>
    script.matches?.join() === wanted.get(script.id)?.matches?.join();
  const stale = registered.filter((script) => script.id.startsWith(SCRIPT_PREFIX) && !current(script));
  if (stale.length > 0) await chrome.scripting.unregisterContentScripts({ ids: stale.map((script) => script.id) });
  const kept = new Set(registered.filter(current).map((script) => script.id));
  const missing = [...wanted.values()].filter((script) => !kept.has(script.id));
  if (missing.length > 0) await chrome.scripting.registerContentScripts(missing);
}

/**
 * Registers a site after the side panel obtained the origin permission on a user click.
 * Detection runs once on the active tab when it is on that origin; otherwise it stays unchecked.
 */
export async function enableSite(input: unknown, now = new Date()): Promise<Site | null> {
  const origin = typeof input === 'string' ? normalizeSiteOrigin(input) : null;
  if (!origin || !(await hasAccess(origin))) return null;
  const sites = await loadSites();
  const id = siteIdFor(origin);
  const existing = sites.find((site) => site.id === id);
  if (!existing && sites.length >= MAX_SITES) return null;
  const site: Site = existing ?? { id, origin, label: id, enabledAt: now.toISOString() };

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tabUrl = tab?.url ? new URL(tab.url) : null;
  if (tab?.id !== undefined && tabUrl?.origin === origin) {
    try {
      const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: detectMoodle });
      const detection: unknown = injection?.result;
      if (isDetection(detection)) {
        site.detection = detection.confidence;
        if (detection.versionHint) site.versionHint = detection.versionHint;
        else delete site.versionHint;
      }
    } catch {
      // Error pages and pages Chrome protects cannot be scripted; detection stays unchecked.
    }
  }
  await saveSites([...sites.filter((item) => item.id !== id), site]);
  await reconcileScripts();
  // Registered scripts only reach pages loaded later; capture the open enabled-site page now.
  if (tab?.id !== undefined && site.detection !== 'none' && tabUrl?.origin === origin) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }).catch(() => undefined);
  }
  return site;
}

/** Open tabs of a site; needs only the site's host permission, not `tabs`. */
export async function siteTabs(site: Site): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({ url: `${site.origin}${ENABLED_ORIGIN_PATH}` }).catch(() => []);
}

export async function renameSite(siteId: unknown, input: unknown): Promise<boolean> {
  const label = cleanLabel(input);
  const sites = await loadSites();
  const site = sites.find((item) => item.id === siteId);
  if (!label || !site) return false;
  site.label = label;
  await saveSites(sites);
  return true;
}

/** Removes a site: its registry entry, content script, host permission and every `site:<id>:` key. */
/** Clears appearance classes in a site's open tabs; tabs without the appearance script ignore it. */
export async function resetAppearanceTabs(site: Site): Promise<void> {
  for (const tab of await siteTabs(site)) {
    if (tab.id !== undefined)
      await chrome.tabs.sendMessage(tab.id, { type: 'APPEARANCE', appearance: {} }).catch(() => undefined);
  }
}

export async function removeSite(siteId: unknown): Promise<boolean> {
  const sites = await loadSites();
  const site = sites.find((item) => item.id === siteId);
  if (!site) return false;
  // Before access is revoked: afterwards Chrome no longer lists the site's tabs.
  await resetAppearanceTabs(site);
  // Study data goes first: if IndexedDB fails, the site stays listed and the student can retry.
  await removeSiteStudyData(site.id);
  await saveSites(sites.filter((item) => item.id !== site.id));
  const keys = Object.keys(await chrome.storage.local.get(null)).filter((key) => key.startsWith(`site:${site.id}:`));
  if (keys.length > 0) await chrome.storage.local.remove(keys);
  await chrome.permissions.remove({ origins: [originPattern(site.origin)] });
  await reconcileScripts();
  return true;
}

/** Revokes every granted origin and unregisters every Moodlens script; used by "Clear all local data". */
export async function revokeAllSites(): Promise<void> {
  for (const site of await loadSites()) await resetAppearanceTabs(site);
  const { origins = [] } = await chrome.permissions.getAll();
  if (origins.length > 0) await chrome.permissions.remove({ origins });
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const ids = registered.map((script) => script.id).filter((id) => id.startsWith(SCRIPT_PREFIX));
  if (ids.length > 0) await chrome.scripting.unregisterContentScripts({ ids });
}
