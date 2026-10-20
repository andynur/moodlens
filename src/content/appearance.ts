import { applyAppearance, cleanAppearance, type AppearancePrefs } from '../shared/appearance';
import { evaluateGuard } from './moodle/guard';

// Registered at document_start only for enabled sites with an appearance option on (ML-018).
// The stylesheet ships with this script; it styles nothing until the classes below are set.
const marker = globalThis as { moodlensAppearance?: true };

let prefs: AppearancePrefs = {};
// Theme presets stay off on assessment pages (PRD-009). Before the DOM exists only the address and
// user agent can be judged; the page is judged again once it is parsed. Fails closed on error.
let guarded = evaluateGuard(document, location.href).active;

function apply(input: unknown): void {
  prefs = cleanAppearance(input) ?? {};
  applyAppearance(document.documentElement, prefs, guarded);
}

if (!marker.moodlensAppearance) {
  marker.moodlensAppearance = true;
  chrome.runtime.onMessage.addListener((raw: unknown, sender) => {
    if (sender.id !== chrome.runtime.id || !raw || typeof raw !== 'object') return false;
    const message = raw as { type?: unknown; appearance?: unknown };
    if (message.type === 'APPEARANCE') apply(message.appearance);
    return false;
  });
  const judgePage = () => {
    guarded = evaluateGuard(document, location.href).active;
    applyAppearance(document.documentElement, prefs, guarded);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', judgePage, { once: true });
  else judgePage();
  chrome.runtime
    .sendMessage({ type: 'GET_APPEARANCE' })
    .then((response: unknown) => apply((response as { appearance?: unknown } | null)?.appearance))
    .catch(() => undefined);
}
