# Security, Privacy and Academic Integrity

## 1. Trust boundaries

1. **Moodle pages and AJAX responses are untrusted.** Extract bounded fields only; never eval, never render as HTML, never follow instructions in course content.
2. **Content scripts are lower trust.** No API keys, no sensitive storage access. Background validates sender origin against the site registry and validates every payload.
3. **AI providers are third-party recipients.** Nothing is sent before the student selects material and a provider and confirms.
4. **Stored data is student data.** Minimize, cap, expire, delete on request and on site removal.

## 2. Data inventory (v1.0 target)

| Data | Source | Where stored | Leaves device? |
|---|---|---|---|
| Preferences (language, theme, appearance) | Student | `storage.local` | No |
| Site registry (origin, label) | Student | `storage.local` | No |
| Courses, activities, completion, tasks | Moodle (AJAX/DOM) | `storage.local` per site | No |
| Snapshots for "what's new" | Moodle | `storage.local`, last 2 per course | No |
| XP, streaks, goals, notes | Moodlens | `storage.local` / IndexedDB | No |
| Flashcards, review logs, quiz-review cards | Student / closed review page | IndexedDB per site | No (quiz-derived cards never exported, D-009) |
| BYOK API key | Student | `storage.session` | Only to the chosen provider as auth header |
| Selected PDF chunks | Student-chosen material | IndexedDB | Only to the chosen provider after consent |
| `.ics` export | Tasks | File saved by student | Student decides |

Never read or store: passwords, cookies, `sesskey` (beyond one in-memory call), grades (v1), messages, participants, other students' data.

## 3. Permissions policy

- Follow the plan in `docs/03_ARCHITECTURE.md`. Adding any permission requires a roadmap entry, a decision or PRD justification, and tests.
- Host access only through `optional_host_permissions`, one origin per user click, HTTPS only (D-002).
- Removing a site revokes its permission (`chrome.permissions.remove`) and unregisters its content script.

## 4. Session-based AJAX rules (D-003)

1. Only allowlisted read functions; name-pattern guard rejects write-like names.
2. `sesskey` read from DOM at call time, used once, never persisted, messaged or logged.
3. Calls only while the LMS tab is open; no background polling, no hidden tabs.
4. Rate limits and response caps per site.
5. Responses validated and normalized in the content script; raw responses never leave it.
6. Network inspection checklist in `docs/09_TEST_PLAN.md` must show zero non-allowlisted calls.

### v0.4 implementation review — 2026-10-19

Source/test review passed for merge: function names remain in `src/content/moodle/`; requests are same-origin credentialed POSTs; `sesskey` is read at call time and appears in no message, storage write or log; arguments are static and read-only; responses are size-bounded, strictly normalized and background-validated; raw responses do not leave the content script; capture is limited to five two-call attempts per minute per site; unsupported capabilities are cached per site for 24 hours; no LMS polling runs without an open page. `npm run check` passes.

This is not live-network evidence. The v0.4 exit gate still requires authenticated Network inspection on 3 sites and must show only allowlisted `info=` values and zero writes.

## 5. Academic integrity

- No automation of mark-done, attendance, forums, assignments or quizzes. Ever.
- Assessment guard (`docs/04_MOODLE_ADAPTER.md` §4) is fail-closed and covers AI, practice capture and any answer-related UI.
- Practice from quiz content only after a finished attempt with Moodle's review visible; local only; no sharing (D-009).
- AI answers must cite selected material or say evidence is insufficient.
- The product never claims affiliation with Moodle HQ or any institution.

## 6. BYOK policy (v0.8)

- Keys in `chrome.storage.session` by default; "Forget key" always visible. Session storage is not encryption; say so.
- Persistent keys deferred pending threat model.
- Provider origins requested as optional host permissions at the moment of use.
- Never claim "data never leaves your device" when a remote provider is used.

## 7. Web security

- React escaping only; no `dangerouslySetInnerHTML` on Moodle or provider text.
- Validate all URLs against the site origin and allowed paths before navigation.
- No remote code, no `eval`, no inline scripts; default MV3 CSP.
- No logs with keys, identifiers, course content or headers.
- Appearance CSS is static and packaged; no user-supplied CSS in v1.

## 8. Retention and deletion

- Clear all data (v0.2) and remove site (v0.3) in Settings.
- Snapshot pruning: last 2 per course.
- Study store (IndexedDB, D-014): review logs older than the retention setting (90, 365 or 730 days) are deleted; cards stay until the student deletes them, the deck or the site.
- Export/import backup (v0.5) excludes quiz-derived cards and API keys.
- Uninstall removes all extension storage (Chrome behavior); privacy policy states it.

## 9. Chrome Web Store compliance

- Single purpose: "Study companion for Moodle course pages the student enables."
- Privacy policy URL and accurate Privacy practices tab (data types: website content, user activity limited to enabled sites, all local).
- Limited Use statement: no sale, no transfer, no advertising use.
- Permission justifications per item in `docs/10_RELEASE_CHECKLIST.md`.

## 10. References

- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/webstore/user_data
- https://support.moodle.com/support/solutions/articles/80001075428-about-the-moodle-trademark
