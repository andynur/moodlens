import { applyAppearance, cleanAppearance } from '../shared/appearance';

// Registered at document_start only for enabled sites with an appearance option on (ML-018).
// The stylesheet ships with this script; it styles nothing until the classes below are set.
const marker = globalThis as { moodlensAppearance?: true };

function apply(input: unknown): void {
  applyAppearance(document.documentElement, cleanAppearance(input) ?? {});
}

if (!marker.moodlensAppearance) {
  marker.moodlensAppearance = true;
  chrome.runtime.onMessage.addListener((raw: unknown, sender) => {
    if (sender.id !== chrome.runtime.id || !raw || typeof raw !== 'object') return false;
    const message = raw as { type?: unknown; appearance?: unknown };
    if (message.type === 'APPEARANCE') apply(message.appearance);
    return false;
  });
  chrome.runtime
    .sendMessage({ type: 'GET_APPEARANCE' })
    .then((response: unknown) => apply((response as { appearance?: unknown } | null)?.appearance))
    .catch(() => undefined);
}
