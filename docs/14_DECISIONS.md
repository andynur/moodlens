# Decision Log (ADR-lite)

Each decision has an ID, status, context, decision and consequences. Agents must not contradict an **Accepted** decision without adding a new decision that supersedes it.

## D-001 — Product name

- **Status:** Accepted, final (owner decision, 2026-10-16). Supersedes the "MuLearn Agent" working name.
- **Decision:** Product name is **Moodlens**. Tagline: **"All in One Moodle AI Agent for Student"**. Package id `moodlens`.
- **Context:** "Moodle" is a registered trademark of Moodle Pty Ltd. "Moodlens" derives from it, and the tagline uses "Moodle" directly. The owner accepts this risk.
- **Consequences:**
  1. Before the v0.7 store listing, review the Moodle trademark policy (`docs/12_TECH_REFERENCES.md`). If the policy needs permission for the name, ask Moodle for permission or prepare a fallback name. Keep the fallback ready so a store rejection does not block the release.
  2. Always show the disclaimer: "Independent project. Not affiliated with or endorsed by Moodle Pty Ltd or any university." Use no Moodle or university logos.
  3. The tagline "AI Agent" is used in the UI, README and store listing from now on, for end-user appeal. The owner accepts the trademark and store-review risks. Feature descriptions (listing body, UI) must still describe only what actually ships; features that are not available yet are labeled "coming soon".

## D-002 — Multi-instance through optional host permissions

- **Status:** Accepted.
- **Context:** v0.1 hardcodes `solusi.sibermu.ac.id`. The product must serve students on any Moodle site.
- **Decision:** Declare `optional_host_permissions: ["https://*/*"]`. Request a single origin at runtime only after a user click on that site. Register content scripts dynamically with `chrome.scripting.registerContentScripts`. No `<all_urls>` and no static host permissions. HTTPS only.
- **Consequences:** Adds `scripting` permission. Store listing must justify the optional host permission. Every validator takes the site origin as input instead of a constant.

## D-003 — Read-only Moodle AJAX client using the student's session

- **Status:** Accepted with constraints; source/test security review completed 2026-10-19 (`docs/06_SECURITY_PRIVACY.md` §4). Live Network inspection remains an exit gate.
- **Context:** DOM selectors vary per theme. Moodle's own frontend calls `/lib/ajax/service.php` for timeline, calendar and course lists. These functions are consistent across sites. This supersedes the earlier rule that forbade session-based network requests.
- **Decision:** Allow same-origin read-only calls from the content script, under these rules:
  1. Function allowlist in one file (`src/content/moodle/ajax.ts`). Initial candidates: `core_course_get_enrolled_courses_by_timeline_classification`, `core_calendar_get_action_events_by_timesort`, `core_course_get_contents` (if exposed to AJAX), `core_completion_get_activities_completion_status`. Each must be verified per site; unsupported functions degrade to DOM.
  2. No function whose name implies write (`update`, `set`, `create`, `delete`, `submit`, `save`, `toggle`, `mark`, `process`).
  3. `sesskey` is read from the page DOM at call time, used once, never stored, never messaged, never logged.
  4. Calls happen only while the student has the LMS tab open, triggered by page visit or user refresh. No background polling with the LMS closed.
  5. Rate limit (for example at most 10 calls per minute per site) and response size caps.
  6. Responses are validated and reduced to normalized types before leaving the content script.
- **Consequences:** Deadlines become reliable. Security review prompt gains a dedicated section. Tests mock `service.php` responses from sanitized fixtures.

## D-004 — DOM parser stays as fallback

- **Status:** Accepted.
- **Decision:** Keep `src/content/moodle/adapter.ts` for course-page details and as fallback when AJAX is unavailable. UI shows the data source ("from Moodle data" vs "from page").

## D-005 — Local-first, no backend, no telemetry in v1

- **Status:** Accepted.
- **Decision:** No developer server, no analytics, no crash reporting in v1. Feedback through an opt-in form and GitHub Issues.

## D-006 — Moodlens XP is local and separate from Moodle

- **Status:** Accepted.
- **Decision:** XP, levels and streaks are Moodlens data, labeled clearly. XP is awarded for study actions (flashcard reviews, practice sessions, focus sessions, starting tasks early). XP is **never** awarded for toggling Moodle completion. Level Up! plugin display is a separate post-v1 feature.

## D-007 — AI cut line

- **Status:** Accepted.
- **Decision:** AI study (ML-007/008/009) targets v0.8. If PRD-004 gates are not met, v1.0 ships with AI disabled by build flag and AI moves to v1.1.

## D-008 — Downloads and agent are post-v1

- **Status:** Accepted.
- **Context:** Download extensions are a crowded market; the agent adds risk without core value for v1.
- **Decision:** ML-006 and ML-012 are post-v1.

## D-009 — Practice from closed quiz reviews

- **Status:** Accepted with constraints.
- **Decision:** Allow saving questions from the student's own review page only when the attempt is finished and Moodle shows the review. Store locally in IndexedDB. No sharing, sync or export of quiz-derived content; export of user-authored cards is allowed. The assessment guard (ML-022) disables this on attempt pages.

## D-010 — Toolchain

- **Status:** Accepted.
- **Decision:** Keep Vite (side panel) + esbuild (background/content). Resolve the vite/vitest type conflict in v0.2. Evaluate WXT only when Edge/Firefox builds start (post-v1).

## D-011 — Minimum Chrome version

- **Status:** Accepted.
- **Decision:** Keep `minimum_chrome_version: 116` (covers Side Panel API, dynamic content scripts and storage access levels).

## D-012 — License

- **Status:** Accepted.
- **Decision:** MIT. Simple, permissive and widely understood by student contributors. Copyright "Andy Nur and Moodlens contributors"; contributions are accepted under the same license (`CONTRIBUTING.md`).

## D-013 — Site enablement by address, without `tabs` or `activeTab`

- **Status:** Accepted (2026-10-18, v0.3).
- **Context:** Without `tabs`, `activeTab` or host access, Chrome hides the active tab URL, so the side panel cannot offer "Enable on this site" for a site it cannot see. Whether `activeTab` is granted when the action opens the side panel is unverified (`docs/04_MOODLE_ADAPTER.md` §1).
- **Decision:** The panel shows an address field ("Moodle site address", prefilled when Chrome exposes the tab URL) and an "Enable on this site" button. The click calls `chrome.permissions.request` for that one HTTPS origin; the background then registers the content script for `<origin>/course/view.php*` and runs `detect.ts` once on the active tab if it is on that origin. No new permission.
- **Consequences:** One extra step (typing or pasting the address) compared with PRD-007's one-click flow. Revisit with `activeTab` only after it is verified to work with `openPanelOnActionClick`. Site id = origin host (plus non-default port); data lives under `site:<id>:*`; storage `schemaVersion` 2.

## D-014 — One IndexedDB database for study data, keyed by site

- **Status:** Accepted (2026-10-19, v0.6).
- **Context:** PRD-010 keeps flashcards and review logs in IndexedDB per site. Object stores can only be created during a version upgrade, so one store set per site would need a schema upgrade on every site enable.
- **Decision:** One database `moodlens-study` with fixed stores (`decks`, `cards`, `reviewLogs`). Every record has `siteId` and a `bySite` index; site removal and clear-all delete by that index. The background owns the database and validates every record it reads. Per-site caps and a review-log retention setting (90, 365 or 730 days, default 365) bound storage. No IndexedDB library.
- **Consequences:** Site isolation is enforced in code (index queries), not by separate databases. Schema changes add upgrade steps; shipped steps never change. IndexedDB code is untested in CI until an IndexedDB test double is approved.

## D-015 — Moodle appearance through scoped classes and one packaged stylesheet

- **Status:** Accepted (2026-10-19, v0.5).
- **Context:** PRD-009 ML-018 asks for opt-in, fully reversible appearance changes on Moodle pages. Content scripts cannot read `chrome.storage.local` (`TRUSTED_CONTEXTS`), and stylesheets added by a registered content script cannot be removed from an open page.
- **Decision:** Per site, while at least one option is on, the background registers `moodlens-appearance-<site>` (`appearance.js` + `appearance.css`, `document_start`, `<origin>/*`). The script asks the background (`GET_APPEARANCE`, registered origins only) and toggles classes on `<html>`; every CSS rule is scoped to those classes. Changes reach open tabs by `tabs.sendMessage`; tabs opened before registration get `insertCSS` + `executeScript`. Site removal and clear-all reset open tabs before access is revoked. No new permission.
- **Consequences:** Reversal is a class toggle, so it is idempotent and tested. The stylesheet stays in open pages after all options are off but styles nothing. Theme presets (roadmap candidate) remain open and need a PRD-009 update.

