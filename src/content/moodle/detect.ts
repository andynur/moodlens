import type { Detection } from '../../shared/types';

/**
 * Decides whether a page looks like Moodle, from DOM markers only (no `M.cfg`, no page scripts).
 *
 * Injected once with `chrome.scripting.executeScript({ func: detectMoodle })` after the student grants an
 * origin, so the function must stay self-contained: no imports or module-level references in its body.
 *
 * Signals (docs/04_MOODLE_ADAPTER.md §1):
 * - strong, body layout: `body#page-*` with a `pagelayout-*` class. Verified on SiberMu fixtures.
 * - strong, body context: `path-*` and `context-<n>` classes. Verified on SiberMu fixtures.
 * - strong, Moodle asset URLs (`/lib/javascript.php/`, `/theme/yui_combo.php`, ...). Verified on the
 *   SiberMu dashboard fixture (`/theme/image.php`); others unverified.
 * - strong, logout link to `/login/logout.php?sesskey=`. Only the selector matches; the value is never read.
 *   Unverified (removed from fixtures by the sanitizer).
 * - weak: `#region-main`, `meta[name="keywords"]` containing "moodle". Unverified on other themes.
 * Version hint: the `uses-drawers` body class arrived with Moodle 4.0 Boost layouts (inference, unverified
 * on non-Boost themes).
 */
export function detectMoodle(root: Document = document): Detection {
  const body = root.body as HTMLElement | null;
  const classes = body ? Array.from(body.classList) : [];
  const hasClass = (pattern: RegExp) => classes.some((name) => pattern.test(name));
  const assetSelector = [
    '/lib/javascript.php/',
    '/lib/requirejs.php/',
    '/theme/yui_combo.php',
    '/theme/styles.php/',
    '/theme/image.php/'
  ]
    .flatMap((path) => [`script[src*="${path}"]`, `link[href*="${path}"]`, `img[src*="${path}"]`])
    .join(', ');

  const strong = [
    Boolean(body && /^page-[a-z0-9-]+$/.test(body.id) && hasClass(/^pagelayout-[a-z0-9]+$/)),
    hasClass(/^path-[a-z0-9-]+$/) && hasClass(/^context-\d+$/),
    root.querySelector(assetSelector) !== null,
    root.querySelector('a[href*="/login/logout.php?sesskey="]') !== null
  ].filter(Boolean).length;
  const keywords = root.querySelector('meta[name="keywords"]')?.getAttribute('content') ?? '';
  const weak = [root.querySelector('#region-main') !== null, /\bmoodle\b/i.test(keywords)].filter(Boolean).length;

  const confidence = strong >= 2 ? 'high' : strong === 1 || weak >= 2 ? 'low' : 'none';
  const result: Detection = { isMoodle: confidence !== 'none', confidence };
  if (result.isMoodle && hasClass(/^uses-drawers$/)) result.versionHint = '4.x';
  return result;
}

/** Runtime guard for the value `executeScript` returns; the page's DOM is untrusted input. */
export function isDetection(input: unknown): input is Detection {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<Detection>;
  return (
    typeof value.isMoodle === 'boolean' &&
    (value.confidence === 'high' || value.confidence === 'low' || value.confidence === 'none') &&
    value.isMoodle === (value.confidence !== 'none') &&
    (value.versionHint === undefined || value.versionHint === '4.x')
  );
}
