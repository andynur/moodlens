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

let queued: number | undefined;
function scheduleCapture(): void {
  if (queued !== undefined) window.clearTimeout(queued);
  queued = window.setTimeout(() => {
    queued = undefined;
    capture();
  }, 600);
}

capture();
const observer = new MutationObserver(scheduleCapture);
// Observe a narrow subtree when possible, as Moodle themes vary.
observer.observe(document.querySelector('#page-content') ?? document.body, {
  subtree: true, childList: true, characterData: true
});
window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
