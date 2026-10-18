import { parseCourse } from './moodle/adapter';
import { evaluateGuard } from './moodle/guard';
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
capture();
void captureTasks();
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (message && typeof message === 'object' && (message as { type?: unknown }).type === 'REFRESH_TASKS') {
    void captureTasks(true);
  }
});
// A page restored from the back/forward cache does not rerun this script; recapture so
// completion changed on an activity page shows up after going back.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  observe();
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
