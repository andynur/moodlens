import {
  appearanceActive,
  appearanceKey,
  cleanAppearance,
  isAppearancePrefs,
  type AppearancePrefs
} from '../shared/appearance';
import type { Site } from '../shared/types';
import { loadSites, reconcileScripts, siteTabs } from './sites';

async function loadAppearance(site: Site): Promise<AppearancePrefs> {
  const key = appearanceKey(site.id);
  const value: unknown = (await chrome.storage.local.get(key))[key];
  return isAppearancePrefs(value) ? value : {};
}

/** Answers the appearance script of a registered site's tab with that site's options only. */
export async function appearanceFor(
  sender: chrome.runtime.MessageSender
): Promise<{ ok: boolean; appearance: AppearancePrefs }> {
  if (!sender.tab || !sender.url) return { ok: false, appearance: {} };
  const origin = sender.origin ?? new URL(sender.url).origin;
  const site = (await loadSites()).find((item) => item.origin === origin);
  return site ? { ok: true, appearance: await loadAppearance(site) } : { ok: false, appearance: {} };
}

/**
 * Saves a site's appearance, (un)registers its script and updates open tabs at once.
 * Turning everything off clears the classes in open tabs, so the page returns to Moodle's own look.
 */
export async function setAppearance(siteId: unknown, input: unknown): Promise<boolean> {
  const site = (await loadSites()).find((item) => item.id === siteId);
  const prefs = cleanAppearance(input);
  if (!site || !prefs) return false;
  const key = appearanceKey(site.id);
  if (appearanceActive(prefs)) await chrome.storage.local.set({ [key]: prefs });
  else await chrome.storage.local.remove(key);
  await reconcileScripts();
  for (const tab of await siteTabs(site)) {
    if (tab.id === undefined) continue;
    const delivered = await chrome.tabs
      .sendMessage(tab.id, { type: 'APPEARANCE', appearance: prefs })
      .then(() => true)
      .catch(() => false);
    // Tabs opened before the script was registered get it now; it then asks for the options itself.
    if (!delivered && appearanceActive(prefs)) {
      const target = { tabId: tab.id };
      await chrome.scripting.insertCSS({ target, files: ['appearance.css'] }).catch(() => undefined);
      await chrome.scripting.executeScript({ target, files: ['appearance.js'] }).catch(() => undefined);
    }
  }
  return true;
}
