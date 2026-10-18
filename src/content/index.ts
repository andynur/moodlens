import { parseCourse } from './moodle/adapter';
import type { IncomingMessage } from '../shared/types';

// Only the allowlisted course page matches this content script in manifest.json.
function capture(): void {
  const snapshot = parseCourse(document, location.href);
  if (!snapshot) return;
  const message: IncomingMessage = { type: 'COURSE_SNAPSHOT', payload: snapshot };
  chrome.runtime.sendMessage(message).catch(() => {
    // Extension may be reloading or temporarily unavailable. Avoid emitting sensitive logs.
  });
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
    capture();
  }, delay);
}

capture();
// A page restored from the back/forward cache does not rerun this script; recapture so
// completion changed on an activity page shows up after going back.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  observe();
  scheduleCapture();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleCapture();
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
