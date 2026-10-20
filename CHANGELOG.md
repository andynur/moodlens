# Changelog

## Unreleased

### Security (v0.9 release candidate)

- v0.9 security review (`docs/releases/v0.9/SECURITY_REVIEW.md`): no Critical/High/Medium. Fixed: provider replies are capped while streaming instead of read whole; Forget key also gives back provider host access (enabled Moodle sites keep theirs).

### Performance (v0.9)

- Performance pass (`docs/releases/v0.9/PERFORMANCE.md`): side panel shows Today in a median 154 ms; PDF.js stays lazy. Course records of one site now also have a 1,000,000-character budget, so a large site cannot fill the 10 MB `chrome.storage.local` quota.

### Release candidate docs (v0.9)

- Version 0.9.0. README status, store listing (v1.0 visibility, fallback name corrected to BelajarLens) and release checklist updated; store and README images regenerated.

### Localization (v0.9)

- Indonesian pre-review (`docs/releases/v0.9/I18N_REVIEW.md`): flashcard review is "ulas" instead of "ulangan" (which reads as a class test), quiz review page is "tinjauan" as in Moodle, one term "penilaian" for assessment, "perlu diulas" instead of "jatuh tempo", consent "Alamat tujuan". Removed the internal "(D-009)" from a student-facing hint, five unused keys and the "Local development build" footer (now "Free and open source (MIT)"). Glossary extended in `docs/07_I18N.md`.

### Accessibility (v0.9)

- Accessibility pass (`docs/releases/v0.9/ACCESSIBILITY.md`): tertiary text tokens darkened to AA in light and dark, AI study heading level fixed, consent text box keyboard-scrollable, AI notices and results announced to screen readers, deck select named. axe reports 0 violations on every side panel screen in EN/ID/dark; no overflow at 320 px. New `tests/sidepanel-contrast.test.ts`.

### Changed

- App icon now uses the graduation cap from the side panel header (gold spark kept) instead of the magnifying glass; toolbar, store icon, logo and header share one `BrandMark`.

### Added (v0.8 AI study, BYOK)

- Optional AI study with the student's own OpenAI or Gemini key (ML-007/008/009, D-018): key kept only in Chrome session storage with an always visible Forget key; local PDF text extraction with PDF.js bundled in the package, with scanned-page and unreadable-page warnings; keyword retrieval with page metadata; a consent screen with provider, destination, purpose, exact text and a token estimate before every request; page-cited summaries, answers and forum idea outlines, or "insufficient evidence"; generated flashcards and practice questions the student checks before saving to a deck. Paused while the assessment guard is active. EN/ID strings, updated privacy policy. `MOODLENS_AI=off` builds without AI (D-007). Prompt-injection corpus and consent tests added. Optional Ollama deferred.
- More BYOK providers over OpenAI-compatible fixed endpoints: DeepSeek, Qwen (Model Studio international), Kimi (Moonshot global), Command Code and SumoPod; no manifest change (D-019).

### Added (appearance)

- Moodle theme presets per site: Clean, Sepia reading and High contrast (ML-018, D-020). Token-based CSS only, AA contrast tested, nothing hidden, Moodle notices untouched, and the preset stays off on quiz, exam and other assessment pages. EN/ID.

### Added (store and README assets)

- `npm run store:assets` (`scripts/capture-store-assets.mjs`) renders every store and README image from `store-preview.html` in headless Chrome with synthetic data: five 1280×800 screenshots per locale (Today, Tasks, Practice, AI answer, AI consent), 1400×560 marquee and 1280×640 README hero in EN and ID, the 440×280 promo tile, and a vector `store-assets/logo.svg`. README shows the hero and a screenshot gallery.

### Changed (side panel UX)

- Indonesian copy now addresses the student as "kamu" everywhere (UI, store listing, `PRIVACY.md`, `WHAT_WE_NEVER_DO.md`, store images), matching the AI study strings; rule added to `docs/07_I18N.md`.

- Today shows a three-step get-started guide instead of five empty widgets until a site is enabled; Due soon lists overdue tasks as a count that opens Tasks, shows deadlines within 24 hours in the error tone, and names the course from task data when no course page was captured yet. Study puts today's review above the XP card and no longer repeats the privacy line. The header drops the truncated tagline after onboarding, Indonesian navigation uses short labels (Kuliah, Setelan) that fit at 360px, and the "never" onboarding screen marks points with a cross instead of a check. EN/ID.

### Fixed (v0.8)

- Study page no longer goes blank when the background refuses or malforms the overview reply; it shows the empty state.

- Sites card: the "access to this site is off" sentence wraps instead of being clipped as a one-line badge at narrow widths.
- Gemini default model is now `gemini-flash-latest`: the pinned `gemini-2.5-flash` answered 404 "no longer available to new users" against a real key, so every Gemini request failed with the default settings.

### Changed (release planning)

- Store listing draft refreshed for the v0.8 AI study scope (EN/ID copy, provider-host justification, privacy-practice answers for the user-approved transfer to the chosen AI provider), with `MOODLENS_AI=off` fallback lines.
- Closed v0.7 as a locally verified development/package milestone and moved its unfinished trademark, publication, live-site QA, tester and stability requirements into `docs/PRE_RELEASE_NOTES.md`. They remain mandatory before the first official public release while v0.8 AI development proceeds (D-017).

### Release preparation (v0.7)

- Completed the v0.7 source/test security review with no open Critical/High findings. Practice capture replies are now bound to the exact offered review URL and text limits are enforced at the message boundary.
- Reviewed the official Moodle trademark guidelines. “Moodlens” is high risk without written permission; documented the permission path and a ready BelajarLens fallback package without changing the active product name.
- Added bilingual privacy and “what we never do” pages plus a bilingual lecturer guide describing the read-only, assessment-guard and local-data boundaries.
- Drafted the Chrome Web Store listing in English and Indonesian with a single-purpose statement, accurate v0.7 feature boundaries, permission justifications, privacy-practices answers and Limited Use disclosure.
- Added final extension/store icons, a locale-neutral 440×280 promo tile and visually verified 1280×800 Today, Tasks and Practice screenshots in English and Indonesian, all from synthetic data. Renamed the pre-AI Study navigation label from “Study AI” to “Study” / “Belajar”.
- Added opt-in beta feedback and site-compatibility issue forms with public-data warnings, and refreshed the README for the v0.7 feature and permission set.
- Set the beta package version to `0.7.0` and added `npm run release:zip`, which runs the full gate, validates permissions and manifest version, rejects unsafe ZIP entries and prints a SHA-256 checksum.
- Recorded the post-security-review v0.7.0 candidate checksum and package contents, with store upload and live beta gates explicitly left to the owner.
- Added a privacy-safe beta QA runbook covering proof for three Moodle sites, an anonymous ten-tester cohort, P0/P1 triage and the auditable seven-day stability clock.
- Smoke-tested the final unpacked build in a clean Chrome 154 profile: its service worker loaded without Moodlens errors, and the complete bilingual onboarding plus initial dashboard had no 320px overflow.

### Fixed (v0.6)

- Today now shows the Moodle site label when more than one site is enabled, so matching course names remain distinguishable in Due soon, What's new, Pinned and Course progress. Activity notes now use the full activity-row width at 320px instead of sharing a narrow row with the completion label.
- Course detail crashed the whole side panel when the background answered a focus request with `{ ok: false }` (no `session`), which happens for untrusted senders and on any background error. The focus card now validates the reply with `isFocusSession` and only shows "Focus session done" on an `ok` reply. Found by the ML-026 Chrome run.

### Fixed (v0.4)

- Timeline capture asked for `limitnum: 500`, which Moodle rejects ("Limit must be between 1 and 50 (inclusive)"); the error marked the capability unsupported for 24 hours and forced DOM fallback. The request now uses the documented maximum of 50 (`TIMELINE_LIMIT`), verified against a live Moodle 4.x site.

### Fixed

- Background message tasks ran with the previous task's result as their first argument, because the serializing queue passed it on. A task that takes optional parameters (the study overview, the guard verdict, clear-all) could therefore get a stray value; tasks are now always called with no arguments.

### Changed (UI)

- Side panel redesigned on `DESIGN.md` (D-016) with an owned UI kit in `src/sidepanel/ui.tsx` and semantic light/dark tokens in `styles.css`; no new dependency. Sticky header with an EN/ID toggle, icon chips per card, grouped task and course lists, colored review ratings, detection badges, segmented theme picker and onboarding progress dots. User-chosen course colors are unchanged.

### Fixed (UI)

- Theme switches no longer fade controls from the old palette (transitions are paused while the `dark` class changes).
- The Tasks page no longer crashes in the browser preview, where `window.chrome` exists without extension APIs.

### Changed (tooling)

- `npm run check` runs gates in parallel with lint, format and typecheck caches, accepts gate names (`npm run check -- test lint`) and shows per-gate time; tests default to the `node` environment and DOM tests opt in to jsdom.

### Added (v0.6, practice and motivation)

- Focus timer and activity notes on the course detail page (ML-026): 15/25/50-minute sessions kept by the background with an alarm, 10 Moodlens XP only after the full length, none when stopped; plain-text notes per activity in the study IndexedDB (schema v2 `notes`), deleted with the site and left out of backups. EN/ID.
- Local XP, levels, streaks and weekly goals (ML-021, D-006): the background stores the XP state (`xp`, in the backup allowlist) and awards points for each card review, for finishing the daily review queue and for opening a task at least 3 days before its deadline, inside the 150 XP daily cap. The Study page shows level progress, today's XP, the streak and a weekly goal control; Today gains a streak widget. Everything is labeled "Moodlens XP — not your Moodle grade".
- Save mistakes from closed quiz reviews (ML-020, D-009): a finished review page reports only how many wrong questions it holds; the panel offers to save them into a deck of that site, and the question text is read from the page at that moment, never stored in between. Cards keep the course module id as their source link, never the attempt id, and the guard is evaluated again before the page answers. Review selectors remain unverified.
- Flashcards in the side panel (ML-019): a background study service is the only way to the study store, and the Study page lists decks with card and due counts, creates and deletes decks, adds cards by hand, imports JSON/CSV and exports student-authored cards only (D-009). Review shows one card at a time with the interval each of the four ratings would give, and the queue is due cards first, then at most 20 new cards per site per day. Review is hidden while the assessment guard is active.
- Review-log retention control (D-014): Settings offers 90 days, 1 year or 2 years (default 1 year); saving prunes older review logs of every site at once, the browser prunes again on start, and the choice is part of the backup allowlist.
- Assessment guard wiring (ML-022): the content script evaluates every page of an enabled site and reports only the verdict; the background keeps reports in session storage, judges a tab without a matching report by its address alone, and answers the side panel with one fail-closed state. The panel shows a localized "Study help is paused" banner naming each reason, and task capture is skipped while the guard is active. DOM markers stay unverified until a quiz fixture exists.

### Added (v0.6 groundwork, practice and motivation)

- Quiz review mistake capture (ML-020): guarded parser for finished review pages and private `quiz-review` cards that never export (D-009); selectors unverified.
- Assessment guard rules (ML-022): fail-closed evaluation of quiz attempt/review, timer, Safe Exam Browser, assignment editing, lesson and H5P states, plus a background-side validator. Not wired yet; DOM markers unverified.
- Local XP rules (ML-021): points per study event, daily cap, time-zone-aware streak with weekly freeze, levels and weekly goal. Pure logic, not wired.
- Flashcard scheduler (ML-019): FSRS-5 day-based scheduling matching ts-fsrs 4.7.1 reference values, daily review queue, retention setting; card import/export as CSV/JSON that never includes quiz-derived cards (D-009). Pure logic, not wired; no new dependency.
- IndexedDB study store design (D-014): one `moodlens-study` database with decks, cards and review logs keyed by site, per-site caps, review-log retention and validated reads. Not wired yet; IndexedDB paths checked by hand in Chrome, no automated coverage.

### Added (v0.4, data layer and tasks)

- Guarded same-origin Moodle AJAX data layer (ML-014): typed read allowlist, write-name rejection, call-time-only `sesskey`, per-site rolling rate limit, timeout/size caps, strict response normalization, 24-hour unsupported-capability cache and DOM fallback.
- Task records from Moodle timeline/calendar data, grouped Tasks view with site/course/type filters and title search, safe Moodle navigation, source/last-updated disclosure and EN/ID strings (ML-015).
- Local RFC 5545 `.ics` export for selected or filtered tasks, with deterministic UIDs, escaping and UTF-8 line folding.
- Opt-in deadline reminders using `alarms` and optional `notifications`; lead times of 1 hour, 3 hours or 1 day; startup recreation and removal cleanup (ML-011).
- Attendance items are normalized only from explicit `mod_attendance` events with real timestamps; attendance insight remains blocked pending a sanitized timeline fixture (ML-005).
- `npm run fixture:sanitize` accepts saved AJAX event responses (`.json`): allowlisted fields only, renamed events/courses, URL query stripped to `id`, and an attendance evidence summary for ML-005.

### Changed (v0.3, multi-instance)

- Manifest: no static content script or hardcoded host; adds `scripting` and `optional_host_permissions: ["https://*/*"]` (D-002). Fresh installs have zero host access.
- Site registry: enable a Moodle site by address (D-013), Moodle detection (`src/content/moodle/detect.ts`), per-site data namespace `site:<id>:*`, rename and remove (remove deletes data, permission and content script). Content scripts are reconciled on install, browser start and permission changes.
- All URL validators take the site origin; `LMS_ORIGIN` removed. Messages are accepted only from registered origins.
- Storage `schemaVersion` 2: v0.2 SiberMu snapshot migrates to the first site; host access must be granted again.
- "Clear all local data" also revokes every site permission and content script.

### Added (v0.5, dashboard and personalization)

- What's new (ML-017): `src/shared/diff.ts` diffs course snapshots by activity id; background keeps per-course records (`site:<id>:snapshots`, last 2 different states, max 50 courses per site); course badge, "New since last visit" list and local "Mark as seen".
- Personalization (ML-016): pin, hide, nickname, color tag and manual order per course (`site:<id>:courses`), via validated `SET_COURSE_PREFS` / `MOVE_COURSE` messages. Moodle is never changed.
- Today dashboard (ML-004, partial): Due soon (open tasks in the next 7 days, from v0.4 task data), What's new, Pinned courses and Course progress widgets; show, hide and reorder stored locally (`dashboard`). Streak widget waits for v0.6 XP.
- Moodle page appearance (ML-018, D-015): per-site opt-in dark mode, larger text, comfortable line width and hiding blocks from a fixed list; one packaged stylesheet scoped to `<html>` classes, registered at `document_start` only while an option is on; open tabs update at once and reset on site removal. Block selectors unverified.
- Courses page lists every stored course with a detail view; hidden courses in a collapsed section.
- Backup (ML-023 part 2): allowlist-based JSON export (settings, sites, snapshots, course prefs, appearance; tasks and reminders are re-captured, not exported); import with strict validation, preview and confirmation; revokes origins not in the backup and never grants access.
- Background runs message tasks one at a time so read-modify-write of per-site keys cannot race.
- Tasks view leaves out tasks and course filter entries of hidden courses (PRD-009); data stays stored.
- First-run onboarding (PRD-007): 3 screens EN/ID (what Moodlens does, what it never does, how to enable a site); skippable, stored as `onboarded`, shown again after "Clear all local data"; users with enabled sites skip it.
- Study data cleanup (D-014): removing a site deletes its IndexedDB decks, cards and review logs first; clear-all deletes the study database; backup import drops study data of sites the backup does not list. IndexedDB paths checked by hand in Chrome on 2026-10-19.

### Fixed

- Parser: when an activity has no readable completion badge, read the course index drawer icon (`[data-for="cm_completion"]`, verified live on SiberMu).
- Content script: DOM-change recapture now has a 3 s maximum wait, so pages with constant mutations no longer keep a stale first snapshot; recapture on back/forward-cache restore and when the tab becomes visible.
- Typecheck: vitest upgraded to 3.2 so it shares vite 6 with the build; `courseId` narrowing in `isCourseSnapshot`.
- Parser: `manual:undo` and "Mark as not done" map to `complete`, "To do" to `incomplete`; `.accesshide` suffixes removed from titles; missing course heading stored as `null` and localized in the UI.
- Side panel shows a dedicated storage-load error instead of the navigation error.

### Added

- Side panel: activity list scrolls inside its own area (at most one viewport tall), so long courses no longer stretch the whole panel.
- Roadmap v0.5: candidate item for Moodle appearance theme presets (ML-018), pending a PRD-009 update.
- MIT `LICENSE` (D-012), `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), GitHub issue forms and pull request template.
- Theme option "System" (default): follows `prefers-color-scheme` until the student picks light or dark; clearing data returns to it (PRD-001 AC 5).
- Placeholder icons 16/32/48/128 (`npm run icons`, `scripts/make-icons.mjs`, no new dependency) wired into the manifest and action; guard test checks files and sizes.
- Settings: "Clear all local data" with an inline confirmation; background clears `chrome.storage.local` and `session` only for trusted extension pages (ML-023 part 1).
- Parser lists activities without a link as restricted (`url: null`, `restricted: true`) and supports folder, book and feedback types.
- CI workflow (`.github/workflows/ci.yml`) running `npm ci && npm run check`.
- Guard tests: manifest permission snapshot, forbidden permissions, no raw HTML rendering; i18n parity test; SiberMu fixture parser tests.

### Changed

- Dependency upgrade pass: React 19, lucide-react 1, Tailwind 4 (`@tailwindcss/vite`, CSS config, class-based `dark` variant; `tailwind.config.js`, PostCSS and autoprefixer removed), Vite 8, Vitest 5, `@vitejs/plugin-react` 6, `@types/chrome` 0.3, `@types/node` 24 (matches CI), jsdom 30, esbuild 0.28, TypeScript 5.9 (TS 6/7 deferred: typescript-eslint supports < 6.1).
- i18n split into `src/shared/i18n/en.ts` and `id.ts` (`satisfies Record<TranslationKey, string>`).
- `package.json` is the single version source for the manifest and side panel footer.
- Manifest description: "Free, local-first and independent study companion" replaces the EN/ID wording; disclaimer kept.
- README rewritten for public contributors: badges, status table, requirements, install, scripts, project structure, contributing checklist, vulnerability reporting, license status.

### Tooling

- Node.js pinned: `.nvmrc` (24), `engines.node >=24.15` (jsdom 30 requirement); CI reads `.nvmrc`. npm is the only package manager; other lockfiles are gitignored.
- ESLint 10 (flat config, typescript-eslint, react-hooks) and Prettier 3 (`npm run lint`, `format`, `format:check`); `npm run check` now runs lint and format gates. Tree reformatted once with Prettier.
- `npm run check` summary runner, `npm run fixture:sanitize` with tests, `.claude/settings.json` permission allowlist.

### Fixtures

- Added sanitized SiberMu `core_calendar_get_action_events_by_timesort` response (observed empty) with a normalizer test.
- Added sanitized `course-5.html` with completed activities; fixture test checks 3 `complete` mappings.
- Added 4 sanitized SiberMu course fixtures plus dashboard (`/my/`) and My courses (`/my/courses.php`) fixtures, and recorded markup observations in `docs/04_MOODLE_ADAPTER.md`.
- Sanitizer collects names from the whole page and replaces them in one pass; handles instructor header, bulk-edit labels, restriction notes, whitespace variants, dashboard cards, Completion Progress, announcement blocks and phone numbers; keeps UI headings on `/my/` pages.

### Docs

- Agent harness: short `AGENTS.md` with context routing, `docs/00_STATUS.md` handoff file, `GEMINI.md`, `npm run check` summary runner (`scripts/check.mjs`), slimmer prompts.

- Product direction changed to a multi-site, integrity-safe study companion with a release train from v0.2 to v1.0 on the Chrome Web Store.
- Product name fixed as **Moodlens**, tagline "All in One Moodle AI Agent for Student" (D-001). Name updated in manifest, package.json, i18n and side panel title.
- Added `docs/14_DECISIONS.md` (D-001 to D-011) and `docs/15_COMPETITIVE_POSITIONING.md`.
- Added PRD-007 (multi-instance), PRD-008 (tasks and deadlines), PRD-009 (dashboard and personalization), PRD-010 (practice and XP), PRD-011 (store release).
- PRD-003 renamed to `PRD-003_RESOURCE_MANAGER.md` and moved to post-v1; attendance moved to PRD-008.
- Rewrote PRD, backlog, roadmap, architecture, adapter spec, security/privacy, i18n, test plan, release checklist, references and validation status.
- Updated `AGENTS.md` and all prompts for the v0.2 assignment.

## 0.1.0 — 2026-10-16

- Created local-first MV3 starter and documentation set.
- Added read-only course parser skeleton, side panel, EN/ID and theme controls.
- Added future scope and safety boundaries for BYOK, RAG and AI agent.
