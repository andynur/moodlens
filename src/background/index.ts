import type { EnableSiteResponse, ExportBackupResponse, OkResponse, TaskCaptureClaimResponse } from '../shared/types';
import { claimRollingWindow } from '../shared/rateLimit';
import { taskDataKey, taskFetchKey, taskFetchRateKey, taskUnsupportedKey } from '../shared/sites';
import { isCourseSnapshot, isCourseUrl, canonicalCourseUrl, isTaskDataset } from '../shared/validation';
import { appearanceFor, setAppearance } from './appearance';
import { exportBackup, importBackup } from './backup';
import { clearGuardReports, guardStatus, reportGuard } from './guard';
import { markCourseSeen, moveCourseOrder, saveSnapshot, setCoursePrefs } from './courses';
import { migrateStorage } from './migrate';
import { clearReminderAlarms, handleReminderAlarm, setReminderPrefs, syncReminders } from './reminders';
import { pruneAllReviewLogs, setReviewLogRetention } from './retention';
import { clearPracticeOffer, recordPracticeOffer, saveQuizMistakes } from './practice';
import { addCards, createDeck, exportCards, removeDeck, reviewFlashcard, studyOverview } from './study';
import { deleteStudyDb } from './studyStore';
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
      await pruneAllReviewLogs();
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
  await saveSnapshot(site, payload);
  return { ok: true };
}

const TASK_FETCH_INTERVAL_MS = 15 * 60 * 1000;
const TASK_FETCH_RATE_WINDOW_MS = 60 * 1000;
// Each capture makes at most two allowlisted AJAX calls, preserving D-003's 10 calls/minute/site cap.
const TASK_FETCH_RATE_MAX = 5;
const TASK_UNSUPPORTED_TTL_MS = 24 * 60 * 60 * 1000;

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
  const fetchKey = taskFetchKey(site.id);
  const rateKey = taskFetchRateKey(site.id);
  const unsupportedKey = taskUnsupportedKey(site.id);
  const stored = await chrome.storage.local.get([fetchKey, rateKey, unsupportedKey]);
  const previous = typeof stored[fetchKey] === 'string' ? Date.parse(stored[fetchKey] as string) : NaN;
  const now = Date.now();
  const due = force === true || !Number.isFinite(previous) || now - previous >= TASK_FETCH_INTERVAL_MS;
  const cached = stored[unsupportedKey];
  const unsupported =
    cached && typeof cached === 'object'
      ? (['courses', 'tasks'] as const).filter((capability) => {
          const until = (cached as Record<string, unknown>)[capability];
          return typeof until === 'number' && until > now;
        })
      : [];
  if (!due) return { ok: true, due: false, siteId: site.id, unsupported };
  const rate = claimRollingWindow(stored[rateKey], now, TASK_FETCH_RATE_MAX, TASK_FETCH_RATE_WINDOW_MS);
  if (!rate.allowed) return { ok: true, due: false, siteId: site.id, unsupported };
  await chrome.storage.local.set({ [fetchKey]: new Date(now).toISOString(), [rateKey]: rate.timestamps });
  return { ok: true, due: true, siteId: site.id, unsupported };
}

async function storeTaskDataset(payload: unknown, sender: chrome.runtime.MessageSender): Promise<OkResponse> {
  const site = await senderSite(sender);
  if (!site || !isTaskDataset(payload, site.id, site.origin)) return { ok: false };
  if (payload.unsupported?.length) {
    const key = taskUnsupportedKey(site.id);
    const current = await chrome.storage.local.get(key);
    const cache = current[key] && typeof current[key] === 'object' ? (current[key] as Record<string, unknown>) : {};
    const until = Date.now() + TASK_UNSUPPORTED_TTL_MS;
    for (const capability of payload.unsupported) cache[capability] = until;
    await chrome.storage.local.set({ [key]: cache });
  }
  await chrome.storage.local.set({ [taskDataKey(site.id)]: payload });
  await syncReminders();
  return { ok: true };
}

async function clearAll(): Promise<OkResponse> {
  await revokeAllSites();
  await clearReminderAlarms();
  await Promise.all([
    chrome.storage.local.clear(),
    chrome.storage.session.clear(),
    clearGuardReports(),
    clearPracticeOffer(),
    deleteStudyDb()
  ]);
  // Keep the cleared store on the current layout so the next start does not migrate it again.
  await migrateStorage(chrome.storage.local);
  return { ok: true };
}

type Task = () => Promise<OkResponse | EnableSiteResponse | ExportBackupResponse | TaskCaptureClaimResponse>;

// Tasks run one at a time: several read-modify-write the same per-site keys.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  // Call with no arguments: a settled value from the previous task must never become a parameter.
  const run = queue.then(
    () => task(),
    () => task()
  );
  queue = run.catch(() => undefined);
  return run;
}

/** Picks the work for a message synchronously, so the listener knows whether it will respond. */
function route(raw: unknown, sender: chrome.runtime.MessageSender): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const message = raw as Record<string, unknown>;
  if (message.type === 'COURSE_SNAPSHOT') return () => storeSnapshot(message.payload, sender);
  if (message.type === 'TASK_CAPTURE_CLAIM') return () => claimTaskCapture(message.force, sender);
  if (message.type === 'TASK_DATASET') return () => storeTaskDataset(message.payload, sender);
  if (message.type === 'GET_APPEARANCE') return () => appearanceFor(sender);
  if (message.type === 'GUARD_STATE') return () => reportGuard(message.payload, sender);
  if (message.type === 'PRACTICE_OFFER') return () => recordPracticeOffer({ count: message.count }, sender);
  const known = [
    'ENABLE_SITE',
    'RENAME_SITE',
    'REMOVE_SITE',
    'CLEAR_LOCAL_DATA',
    'MARK_COURSE_SEEN',
    'SET_COURSE_PREFS',
    'MOVE_COURSE',
    'EXPORT_BACKUP',
    'IMPORT_BACKUP',
    'SET_APPEARANCE',
    'SET_REMINDERS',
    'GET_GUARD',
    'SET_STUDY_RETENTION',
    'STUDY_OVERVIEW',
    'STUDY_CREATE_DECK',
    'STUDY_DELETE_DECK',
    'STUDY_ADD_CARDS',
    'STUDY_REVIEW',
    'STUDY_EXPORT_CARDS',
    'STUDY_SAVE_MISTAKES'
  ];
  if (typeof message.type !== 'string' || !known.includes(message.type)) return null;
  // Everything below reads or changes stored data: trusted extension pages only.
  if (!fromExtensionPage(sender)) return () => Promise.resolve({ ok: false });
  switch (message.type) {
    case 'STUDY_OVERVIEW':
      return () => studyOverview();
    case 'STUDY_CREATE_DECK':
      return () => createDeck({ siteId: message.siteId, name: message.name, courseId: message.courseId });
    case 'STUDY_DELETE_DECK':
      return () => removeDeck(message.deckId);
    case 'STUDY_ADD_CARDS':
      return () => addCards({ siteId: message.siteId, deckId: message.deckId, cards: message.cards });
    case 'STUDY_REVIEW':
      return () => reviewFlashcard({ cardId: message.cardId, rating: message.rating });
    case 'STUDY_SAVE_MISTAKES':
      return () => saveQuizMistakes({ deckId: message.deckId });
    case 'STUDY_EXPORT_CARDS':
      return () => exportCards(message.format);
    case 'SET_STUDY_RETENTION':
      return () => setReviewLogRetention(message.days).then((days) => ({ ok: true, days }));
    case 'GET_GUARD':
      return () => guardStatus();
    case 'ENABLE_SITE':
      return () => enableSite(message.origin).then((site) => ({ ok: site !== null, site }));
    case 'RENAME_SITE':
      return () => renameSite(message.siteId, message.label).then((ok) => ({ ok }));
    case 'REMOVE_SITE':
      return () =>
        removeSite(message.siteId).then(async (ok) => {
          if (ok) await syncReminders();
          return { ok };
        });
    case 'MARK_COURSE_SEEN':
      return () => markCourseSeen(message.siteId, message.courseId).then((ok) => ({ ok }));
    case 'SET_COURSE_PREFS':
      return () => setCoursePrefs(message.siteId, message.courseId, message.prefs).then((ok) => ({ ok }));
    case 'MOVE_COURSE':
      return () => moveCourseOrder(message.siteId, message.courseId, message.direction).then((ok) => ({ ok }));
    case 'EXPORT_BACKUP':
      return () => exportBackup().then((backup) => ({ ok: true, backup }));
    case 'SET_APPEARANCE':
      return () => setAppearance(message.siteId, message.appearance).then((ok) => ({ ok }));
    case 'IMPORT_BACKUP':
      return () => importBackup(message.backup).then((ok) => ({ ok }));
    case 'SET_REMINDERS':
      return () => setReminderPrefs(message.prefs).then((ok) => ({ ok }));
    default:
      return () => clearAll();
  }
}

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse: (value: unknown) => void) => {
  const task = route(raw, sender);
  if (!task) return false;
  void ready
    .then(() => serialized(task))
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false }));
  return true;
});
