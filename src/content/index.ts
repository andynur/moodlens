import { parseCourse } from './moodle/adapter';
import { evaluateGuard } from './moodle/guard';
import { captureReviewMistakes } from './moodle/quiz-review';
import { captureTaskDataset } from './moodle/task-capture';
import type { IncomingMessage, TaskCaptureClaimResponse } from '../shared/types';

// Registered by the background only for origins the student enabled (D-002).
function capture(): void {
  const snapshot = parseCourse(document, location.href);
  if (!snapshot) return;
  const message: IncomingMessage = { type: 'COURSE_SNAPSHOT', payload: snapshot };
  chrome.runtime.sendMessage(message).catch(() => {
    // Extension may be reloading or temporarily unavailable. Avoid emitting sensitive logs.
  });
}

// Guard reports (ML-022). The page is evaluated locally; only the verdict leaves the page.
let reported = '';
function reportGuard(): boolean {
  const state = evaluateGuard(document, location.href);
  const fingerprint = `${location.href}|${state.reasons.join(',')}`;
  if (fingerprint !== reported) {
    reported = fingerprint;
    const message: IncomingMessage = { type: 'GUARD_STATE', payload: state };
    chrome.runtime.sendMessage(message).catch(() => {
      // Extension may be reloading. Avoid emitting sensitive logs.
    });
  }
  return state.active;
}

/**
 * Tells the panel that this finished review page holds wrong questions (ML-020). Only the count is
 * sent; the question text stays on the page until the student presses Save.
 */
function offerPractice(): void {
  const capture = captureReviewMistakes(document, location.href);
  if (!capture || capture.mistakes.length === 0) return;
  chrome.runtime.sendMessage({ type: 'PRACTICE_OFFER', count: capture.mistakes.length }).catch(() => {
    // Extension may be reloading. Avoid emitting sensitive logs.
  });
}

async function captureTasks(force = false): Promise<void> {
  // No reads of our own while an assessment is open: the guard fails closed (ML-022).
  if (reportGuard()) return;
  const claim = (await chrome.runtime
    .sendMessage({ type: 'TASK_CAPTURE_CLAIM', force })
    .catch(() => null)) as TaskCaptureClaimResponse | null;
  if (!claim?.ok || !claim.due || !claim.siteId) return;
  try {
    const payload = await captureTaskDataset(
      document,
      location.href,
      claim.siteId,
      new Date(),
      undefined,
      claim.unsupported
    );
    const message: IncomingMessage = { type: 'TASK_DATASET', payload };
    await chrome.runtime.sendMessage(message);
  } catch {
    // The page may be navigating or lack a usable Moodle session. No sensitive logs.
  }
}

// Debounce DOM bursts, but cap the wait: pages with constant mutations (lazy video, session timers)
// would otherwise reset the timer forever and keep a stale first capture.
const QUIET_MS = 600;
const MAX_WAIT_MS = 3000;
let queued: number | undefined;
let firstQueuedAt: number | undefined;
function scheduleCapture(): void {
  const now = Date.now();
  firstQueuedAt ??= now;
  if (queued !== undefined) window.clearTimeout(queued);
  const delay = Math.max(0, Math.min(QUIET_MS, firstQueuedAt + MAX_WAIT_MS - now));
  queued = window.setTimeout(() => {
    queued = undefined;
    firstQueuedAt = undefined;
    reportGuard();
    capture();
  }, delay);
}

reportGuard();
offerPractice();
capture();
void captureTasks();
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse: (value: unknown) => void) => {
  const type = message && typeof message === 'object' ? (message as { type?: unknown }).type : undefined;
  if (type === 'REFRESH_TASKS') void captureTasks(true);
  // The guard is evaluated again here, so a page that locked again saves nothing (ML-022).
  if (type === 'CAPTURE_QUIZ_MISTAKES') {
    const capture = captureReviewMistakes(document, location.href);
    sendResponse(
      capture
        ? { ok: true, mistakes: capture.mistakes, ...(capture.cmid ? { cmid: capture.cmid } : {}) }
        : { ok: false }
    );
  }
  return false;
});
// A page restored from the back/forward cache does not rerun this script; recapture so
// completion changed on an activity page shows up after going back.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  observe();
  offerPractice();
  scheduleCapture();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  reportGuard();
  scheduleCapture();
});
const observer = new MutationObserver(scheduleCapture);
// Observe a narrow subtree when possible, as Moodle themes vary.
function observe(): void {
  observer.observe(document.querySelector('#page-content') ?? document.body, {
    subtree: true,
    childList: true,
    characterData: true
  });
}
observe();
window.addEventListener('pagehide', () => observer.disconnect());
