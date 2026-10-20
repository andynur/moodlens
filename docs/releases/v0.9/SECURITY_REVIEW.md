# v0.9 Security Review

Date: 2026-10-20
Scope: source, tests and manifest of the v0.9 release candidate, with focus on what changed since the v0.7 review (`docs/releases/v0.7/SECURITY_REVIEW.md`): BYOK AI study (`src/background/ai.ts`, `src/shared/ai/`, `src/sidepanel/pdf.ts`, `AiStudy.tsx`, `AiSettings.tsx`) and appearance theme presets (ML-018, D-020). This is not an institutional authorization, legal opinion, live-site penetration test or compliance certification.

## Result

No Critical, High or Medium findings. Two Low findings were fixed during the review. The v0.7 Low verification gap (L-01, unverified quiz DOM markers) is still open and unchanged; one Low design limit is accepted and documented.

## Findings

### L-02 — Provider reply was read whole before the size check (fixed)

- **Evidence before fix:** `sendAiTask` called `response.text()` and only then compared the length with `MAX_RESPONSE_BYTES`.
- **Failure mode:** a misbehaving provider or gateway answering with a very large body could make the service worker hold all of it in memory before refusing it. No data exposure; availability only.
- **Fix:** the body is now read as a stream and dropped as soon as it passes 2,000,000 bytes, and a declared `Content-Length` above the cap is refused without reading (`readCapped` in `src/background/ai.ts`).
- **Test:** `tests/ai-service.test.ts` maps an over-cap body and an over-cap `Content-Length` to `bad-response`.

### L-03 — "Forget key" kept the provider host permission (fixed)

- **Evidence before fix:** `forgetAiKeys` removed keys and the pending request, but the provider origin stayed granted until "Clear all local data".
- **Failure mode:** the student expects Forget key to end the provider relationship; the extension kept host access to the provider origin it no longer needed. Not exploitable without a key, but broader than necessary.
- **Fix:** Forget key now also removes the host permissions of every provider origin that is not an enabled Moodle site. The next request asks Chrome for access again at Continue.
- **Test:** `tests/ai-service.test.ts` checks the provider origin is removed and an enabled site's origin is kept.

### L-04 — AI guard covers only enabled sites (accepted)

- **Evidence:** `guardStatus` (`src/background/guard.ts:73-90`) inspects tabs of registered sites only.
- **Failure mode:** a quiz attempt on a Moodle site the student never enabled does not pause AI study. Moodlens cannot see that site at all (no host permission, D-002), so it cannot judge it; widening access would break D-002.
- **Decision:** accepted. The privacy pages state that AI pauses while an assessment page is open on an enabled site; the prompt's ground rules also refuse help with active graded work.

### L-01 — Quiz DOM markers not verified against sanitized Moodle markup (open, from v0.7)

Unchanged. Needs the sanitized quiz fixtures listed in `docs/PRE_RELEASE_NOTES.md`. The guard fails closed.

## Control evidence

- **Permissions:** manifest unchanged since v0.7: `storage`, `sidePanel`, `scripting`, `alarms`; optional `notifications`; no static host access; optional `https://*/*` (`public/manifest.json`). Provider origins are requested at Continue from the side panel (`AiStudy.tsx`), checked again in the background before the request (`ai.ts`, `permissions.contains`), and revoked on Forget key and Clear all.
- **Consent before transfer:** `AI_PREPARE` builds and stores the exact prompt under a one-time nonce and sends nothing; `AI_SEND` accepts only the nonce, deletes the stored prompt before sending, expires it after 10 minutes and checks guard, provider, key, permission and a 6-per-minute rate limit (`src/background/ai.ts`). The consent screen shows provider, destination URL, purpose and the exact text (`promptPreview`).
- **Keys:** `chrome.storage.session` only, access level `TRUSTED_CONTEXTS` (`src/background/index.ts:22-23`); never returned by `AI_SETTINGS`, never in a URL or body (`buildProviderRequest`), not part of the backup allowlist. Shape check prevents header injection (`cleanKey`). Requests use `credentials: 'omit'`, `redirect: 'error'`, `referrerPolicy: 'no-referrer'` and a 90-second timeout.
- **Sender validation:** every AI message requires an extension-page sender; content-script senders are refused (`fromExtensionPage`, test "refuses keys and settings from content scripts").
- **Prompt injection:** excerpts are wrapped in `<source>` tags after marker neutralization; document names and questions lose `<>[]`; the system text marks excerpts as untrusted. Replies are parsed as one JSON object, control and bidi characters removed, citations limited to ids that were sent, uncited answers and cards dropped (`src/shared/ai/prompt.ts`). `tests/ai-injection.test.ts` runs a 10-entry corpus.
- **Model names:** strict pattern without `..`, URL-encoded into the Gemini path (`cleanModel`, `buildProviderRequest`).
- **PDF:** PDF.js and its worker are packaged, loaded on first use, size and page caps apply, font faces and XFA off (`src/sidepanel/pdf.ts`). Text stays in panel memory. MV3's default extension CSP blocks `eval`, so PDF.js runs without dynamic code.
- **DOM/XSS:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` in `src/`. AI output renders as React text.
- **Theme presets:** packaged static CSS with fixed class names; the content script keeps presets off while the guard is active and re-judges after DOM parse (`src/content/appearance.ts`); it accepts appearance messages only from this extension.
- **Logging:** no `console.*` calls in `src/`.
- **Store accuracy:** `PRIVACY.md` and `WHAT_WE_NEVER_DO.md` (EN/ID) describe the provider list, session-only keys, the consent screen, the permission prompt, provider-side terms and the assessment pause. `docs/releases/v0.7/STORE_LISTING.md` carries the AI section.

## Verification run

- `npx vitest run tests/ai-service.test.ts`: 20/20 passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm audit`: 0 vulnerabilities.
- Full `npm run check --silent`: lint, format, typecheck, test, build passed.
