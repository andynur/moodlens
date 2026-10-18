import type { EnableSiteResponse, OkResponse, TaskCaptureClaimResponse } from '../shared/types';
import { snapshotKey, taskDataKey, taskFetchKey } from '../shared/sites';
import { isCourseSnapshot, isCourseUrl, canonicalCourseUrl, isTaskDataset } from '../shared/validation';
import { migrateStorage } from './migrate';
import { clearReminderAlarms, handleReminderAlarm, setReminderPrefs, syncReminders } from './reminders';
import { enableSite, loadSites, reconcileScripts, removeSite, renameSite, revokeAllSites } from './sites';

// Keep extension local/session storage inaccessible to lower-trust content scripts.
void chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
void chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });

// Every event waits for the storage layout to be current; the worker keeps no other state.
const ready = migrateStorage(chrome.storage.local).catch(() => undefined);
const reconcile = () =>
  void ready
    .then(async () => {
      await reconcileScripts();
      await syncReminders();
    })
    .catch(() => undefined);

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  reconcile();
});
chrome.runtime.onStartup.addListener(reconcile);
chrome.permissions.onAdded.addListener(reconcile);
chrome.permissions.onRemoved.addListener(reconcile);
chrome.alarms.onAlarm.addListener((alarm) => void ready.then(() => handleReminderAlarm(alarm)).catch(() => undefined));

function fromExtensionPage(sender: chrome.runtime.MessageSender): boolean {
  return !sender.tab && sender.id === chrome.runtime.id;
}

async function storeSnapshot(payload: unknown, sender: chrome.runtime.MessageSender): Promise<OkResponse> {
  // Only content scripts on a registered site's course page may report, and only for that page.
  if (!sender.tab || !sender.url) return { ok: false };
  const senderOrigin = sender.origin ?? new URL(sender.url).origin;
  const site = (await loadSites()).find((item) => item.origin === senderOrigin);
  if (!site || !isCourseUrl(sender.url, site.origin)) return { ok: false };
  if (!isCourseSnapshot(payload, site.origin) || payload.sourceUrl !== canonicalCourseUrl(sender.url, site.origin)) {
    return { ok: false };
  }
  await chrome.storage.local.set({ [snapshotKey(site.id)]: payload });
  return { ok: true };
}

const TASK_FETCH_INTERVAL_MS = 15 * 60 * 1000;

async function senderSite(sender: chrome.runtime.MessageSender) {
  if (!sender.tab || !sender.url) return null;
  const url = new URL(sender.url);
  if (url.protocol !== 'https:') return null;
  return (await loadSites()).find((site) => site.origin === (sender.origin ?? url.origin)) ?? null;
}

async function claimTaskCapture(
  force: unknown,
  sender: chrome.runtime.MessageSender
): Promise<TaskCaptureClaimResponse> {
  const site = await senderSite(sender);
  if (!site) return { ok: false, due: false };
  const key = taskFetchKey(site.id);
  const stored = await chrome.storage.local.get(key);
  const previous = typeof stored[key] === 'string' ? Date.parse(stored[key] as string) : NaN;
  const now = Date.now();
  const due = force === true || !Number.isFinite(previous) || now - previous >= TASK_FETCH_INTERVAL_MS;
  if (due) await chrome.storage.local.set({ [key]: new Date(now).toISOString() });
  return { ok: true, due, siteId: site.id };
}

async function storeTaskDataset(payload: unknown, sender: chrome.runtime.MessageSender): Promise<OkResponse> {
  const site = await senderSite(sender);
  if (!site || !isTaskDataset(payload, site.id, site.origin)) return { ok: false };
  await chrome.storage.local.set({ [taskDataKey(site.id)]: payload });
  await syncReminders();
  return { ok: true };
}

async function clearAll(): Promise<OkResponse> {
  await revokeAllSites();
  await clearReminderAlarms();
  await Promise.all([chrome.storage.local.clear(), chrome.storage.session.clear()]);
  // Keep the cleared store on the current layout so the next start does not migrate it again.
  await migrateStorage(chrome.storage.local);
  return { ok: true };
}

type Task = () => Promise<OkResponse | EnableSiteResponse | TaskCaptureClaimResponse>;

/** Picks the work for a message synchronously, so the listener knows whether it will respond. */
function route(raw: unknown, sender: chrome.runtime.MessageSender): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const message = raw as Record<string, unknown>;
  if (message.type === 'COURSE_SNAPSHOT') return () => storeSnapshot(message.payload, sender);
  if (message.type === 'TASK_CAPTURE_CLAIM') return () => claimTaskCapture(message.force, sender);
  if (message.type === 'TASK_DATASET') return () => storeTaskDataset(message.payload, sender);
  const known = [
    'ENABLE_SITE',
    'RENAME_SITE',
    'REMOVE_SITE',
    'CLEAR_LOCAL_DATA',
    'SET_REMINDERS'
  ];
  if (typeof message.type !== 'string' || !known.includes(message.type)) return null;
  // Everything below changes the registry or deletes data: trusted extension pages only.
  if (!fromExtensionPage(sender)) return () => Promise.resolve({ ok: false });
  switch (message.type) {
    case 'ENABLE_SITE':
      return () => enableSite(message.origin).then((site) => ({ ok: site !== null, site }));
    case 'RENAME_SITE':
      return () => renameSite(message.siteId, message.label).then((ok) => ({ ok }));
    case 'REMOVE_SITE':
      return () => removeSite(message.siteId).then((ok) => ({ ok }));
    case 'SET_REMINDERS':
      return () => setReminderPrefs(message.prefs).then((ok) => ({ ok }));
    default:
      return clearAll;
  }
}

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse: (value: unknown) => void) => {
  const task = route(raw, sender);
  if (!task) return false;
  void ready
    .then(task)
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false }));
  return true;
});
