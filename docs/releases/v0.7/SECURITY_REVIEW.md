# v0.7 Security Review

Date: 2026-10-19  
Scope: source, tests and packaged-extension configuration for the v0.7.0 closed-beta candidate. This is not an institutional authorization, legal opinion or live-site penetration test.

## Result

No Critical or High findings remain open. One Medium finding was fixed during the review. One Low verification gap remains because the repository has no sanitized finished-quiz fixture; the affected guard path fails closed.

## Findings

### M-01 — Practice capture was not bound to the offered review URL (fixed)

- **Evidence before fix:** the background sent `CAPTURE_QUIZ_MISTAKES` to the stored tab and accepted any structurally shaped reply. A navigation to a different finished review between the offer and capture could save that other review's mistakes. Text lengths were enforced only later while creating cards.
- **Failure mode:** a fast same-tab navigation could associate cards with the wrong review. An unexpectedly large content-script reply could also consume unnecessary service-worker memory before the later card sanitizer discarded it.
- **Fix:** the content script now returns its current URL (`src/content/index.ts:90-100`); the background requires an exact match with the session offer and rejects empty or over-limit question/answer text at the message boundary (`src/background/practice.ts:78-116`).
- **Test:** `tests/practice.test.ts` rejects a reply from a different review URL and a 2,001-character question.

### L-01 — Quiz DOM markers are not verified against sanitized Moodle markup (open verification gap)

- **Evidence:** timer and finished-review selectors are explicitly marked unverified (`src/content/moodle/guard.ts:42-48`). A review is accepted only when the summary and question evidence both match; missing or malformed evidence remains guarded (`src/content/moodle/guard.ts:56-68,93-109`).
- **Failure mode:** a theme or locale with different markup may keep Practice disabled on a genuinely finished review. Known attempt paths, lesson/H5P paths, timers and malformed states remain blocked, so this is presently an availability/compatibility risk rather than a known bypass.
- **Required verification:** capture and sanitize a real active-attempt page and a finished-review page, then add fixture tests for the observed English/Indonesian markers.

## Control evidence

- **Permissions and origin scope:** no static host access; only optional HTTPS origin access, with optional notifications (`public/manifest.json:13-16`). Enabled sites require an already granted exact-origin permission; removal deletes site data, revokes that origin and reconciles registered scripts (`src/background/sites.ts:80-110,137-160`).
- **Context boundaries:** local and session storage are restricted to trusted extension contexts. Data-changing panel messages require an extension-page sender; content-script messages are separately routed and validated (`src/background/index.ts:20-22,49-63,153-205`).
- **Moodle AJAX:** five read methods are allowlisted and write-like names are rejected. The session key is read only at call time, requests are same-origin, redirects fail, and request/response sizes plus call rates are bounded (`src/content/moodle/ajax.ts:1-20,51-75,88-176`).
- **Assessment and private quiz data:** guard parsing fails closed (`src/content/moodle/guard.ts:93-145`). Quiz-review cards live in IndexedDB and are absent from the backup allowlist (`src/shared/backup.ts:10-15,30-59`); card exports also filter them by origin.
- **DOM/CSP/remote code:** production source contains no `dangerouslySetInnerHTML`, dynamic code execution or remote script URL. Appearance changes use a packaged static stylesheet and fixed classes. The MV3 default extension-page CSP applies because the manifest does not weaken it.
- **Storage lifecycle:** clear-all revokes sites, clears alarms, local/session storage and the study database (`src/background/index.ts:123-136`). Site removal deletes its IndexedDB records and namespaced local keys before revoking access (`src/background/sites.ts:137-150`).
- **Store accuracy:** the bilingual policy and store listing describe optional per-origin access, local storage, no telemetry/backend and no shipped AI. The trademark assessment remains separate and unresolved.

## Verification run

- `npx vitest run tests/practice.test.ts`: 7/7 passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm audit`: 0 vulnerabilities.
- Full `npm run check --silent` is required again after the release evidence update.

