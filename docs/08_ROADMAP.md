# Delivery Roadmap — v0.1 to v1.0 (Chrome Web Store)

Each release has an **exit gate**. Do not start the next release's P0 work until the current gate passes, except for parallel discovery tasks. Record slips and scope moves in this file and in `docs/14_DECISIONS.md` when they change architecture.

Status legend: `[x]` done, `[ ]` open, `[~]` in progress.

## v0.1 — Scaffold (done 2026-10-16)

- [x] MV3 manifest, React side panel, background worker, content script.
- [x] EN/ID dictionary, persisted language and theme.
- [x] Read-only course parser against synthetic fixtures; validated messaging.
- [x] Documentation set.

## v0.2 — Stabilize foundation

Goal: trustworthy, green baseline on the pilot site.

- [x] `npm run check` summary runner (`scripts/check.mjs`).
- [x] `git init`, first commit, `.github/workflows/ci.yml` running `npm ci && npm run check`.
- [x] Machine-enforced rules as tests: manifest permission snapshot, forbidden permissions, no `dangerouslySetInnerHTML`, i18n parity.
- [x] `npm run fixture:sanitize` (`scripts/sanitize-fixture.ts` + `scripts/sanitize-core.ts`, tested); see `tests/fixtures/README.md`.
- [x] Choose and add `LICENSE` (MIT, D-012).
- [x] Fix `vite.config.ts` type conflict (vitest bundles its own vite) — upgrade vitest or split `vitest.config.ts`.
- [x] Fix `src/shared/validation.ts` narrowing error in `isCourseSnapshot`.
- [x] Fix completion regex: `mark as not done` must not map to `incomplete`.
- [x] Remove hardcoded `'Untitled course'` from stored data; localize in UI.
- [x] Separate storage-load error message from `noNavigation`.
- [x] Enforce EN/ID key parity with `satisfies` and a test.
- [x] Single version source (`package.json` → manifest and UI at build time).
- [x] Add ESLint + Prettier.
- [x] Dependency upgrade pass (React, Tailwind, vitest, `@types/chrome`) with lockfile.
- [x] Placeholder icons (16/32/48/128).
- [x] Sanitized SiberMu fixtures (`tests/fixtures/sibermu-2026-10/`, 4 courses); observations in `docs/04_MOODLE_ADAPTER.md`.
- [x] Parser on fixtures: strip `.accesshide` suffix, list restricted activities without links, map "To do" dropdown, support page/folder/book/feedback as `unknown` or new types.
- [x] One more capture with **completed** activities ("Done" / `manual:undo`) to verify the `complete` mapping.
- [x] Clear local data control (ML-023 part 1).

**Exit gate:** CI green; unpacked extension loads with no errors; parser fixture tests pass on real sanitized SiberMu HTML; manual QA items 1–8 in `docs/09_TEST_PLAN.md` pass.

Exit review 2026-10-18: met locally (all checks green, owner QA 1–8 passed); CI on the latest `main` pending push. v0.3 started at the owner's request.

## v0.3 — Multi-instance

Goal: works on any Moodle site the student enables.

- [x] `optional_host_permissions: ["https://*/*"]`; remove static `content_scripts`.
- [~] Site enablement flow: detect Moodle on current tab, request origin permission, register content script with `chrome.scripting.registerContentScripts`.
- [~] Moodle detection heuristics (body classes, `M.cfg`-free DOM markers, version hints) with fixtures.
- [x] Site registry in storage; per-site data namespace; remove-site action deletes data and revokes permission.
- [x] Replace `LMS_ORIGIN` constant with per-site validation everywhere.
- [ ] Onboarding screens EN/ID.

**Exit gate:** enable/disable works on SiberMu plus at least one other Moodle 4.x site (for example a public Moodle demo site); no static host permissions remain; permission request appears only on user click.

## v0.4 — Data layer and tasks

Goal: accurate deadlines without fragile scraping.

- [ ] D-003 security review signed off before merge.
- [~] Read-only AJAX client with function allowlist, response validation, rate limit (ML-014). Guarded client core and unit tests done; Moodle response validators, normalization and capture integration pending.
- [ ] Enrolled course list and timeline/calendar events normalized into `Task` records.
- [ ] Tasks view: overdue, today, this week, later; filters by course and type (ML-015).
- [ ] `.ics` export of selected tasks.
- [ ] Opt-in reminders via `alarms` + optional `notifications` (ML-011).
- [ ] Attendance insight only if evidence shows attendance events in timeline/calendar (ML-005); else stays Blocked.
- [ ] DOM fallback when AJAX unavailable; UI shows data source.

**Exit gate:** deadlines match Moodle's own timeline block on 3 sites; network inspection shows only allowlisted read functions; zero write calls.

## v0.5 — Dashboard and personalization

- [ ] Today dashboard with widgets: due soon, progress per course, what's new, streak (ML-004).
- [ ] Pin, reorder, color, nickname, hide courses (ML-016).
- [ ] Snapshot history and "what's new since last visit" diff (ML-017).
- [ ] Opt-in Moodle page appearance: dark mode, font size, line width (ML-018).
- [ ] Candidate (needs PRD-009 update first): appearance theme presets that restyle Moodle with design tokens (color, type, spacing, cards) and CSS-only layout tweaks; no DOM rewriting, no third-party brand assets, off on assessment-guarded pages (ML-018).
- [ ] Export/import local backup JSON (ML-023 part 2).

**Exit gate:** dashboard usable at 320px; diff tests cover add/remove/rename; appearance injection reversible and scoped to enabled sites.

## v0.6 — Practice and motivation

- [ ] Assessment guard first (ML-022): fail-closed detection of attempt pages and timed/locked states.
- [ ] IndexedDB store design and retention settings.
- [ ] Flashcards: user-authored decks, FSRS-style scheduling, daily review (ML-019).
- [ ] Save mistakes from closed quiz review pages into private decks (ML-020, D-009).
- [ ] Local XP, levels, streaks, weekly goals (ML-021, D-006).
- [ ] P2: focus timer and per-activity notes (ML-026).

**Exit gate:** guard tests pass for every known attempt URL and state; no quiz content leaves the device; XP rules documented and tested.

## v0.7 — Closed beta on Chrome Web Store

- [ ] Trademark review for "Moodlens" and fallback name ready (D-001).
- [ ] Privacy policy page, "what we never do" page, public GitHub repo.
- [ ] Store listing draft: description EN/ID, screenshots, icons, single-purpose statement, permission justifications.
- [ ] Publish as **unlisted** or trusted-testers; feedback form (no telemetry).
- [ ] Beta QA on at least 3 Moodle sites; bug triage.

**Exit gate:** store review approved; at least 10 beta testers; no P0/P1 bugs open for 7 days.

## v0.8 — AI study (BYOK, cut line)

- [ ] Provider settings: OpenAI, Gemini, optional Ollama; session key storage; forget key (ML-008).
- [ ] PDF.js packaged locally, text extraction with page metadata (ML-007).
- [ ] Consent screen showing destination, content, purpose.
- [ ] Cited summary, Q&A, AI-generated flashcards/practice from selected material (ML-009).
- [ ] Prompt-injection corpus tests; guard integration.

**Exit gate:** all PRD-004 acceptance criteria pass. If not met by the planned date, disable AI behind a build flag and continue to v0.9 (D-007).

## v0.9 — Release candidate

- [ ] Run `prompts/SECURITY_REVIEW_PROMPT.md`; fix all Critical/High.
- [ ] Accessibility pass (keyboard, screen reader labels, contrast).
- [ ] Performance pass (panel open time, storage size caps).
- [ ] i18n review by a native Indonesian speaker.
- [ ] Docs, README, CHANGELOG, store listing final.

**Exit gate:** `docs/10_RELEASE_CHECKLIST.md` fully checked.

## v1.0 — Public release

- [ ] Switch listing to public.
- [ ] Tag `v1.0.0`; release notes.
- [ ] Support channel (GitHub Issues) and issue templates.

## Post-v1 candidates

Resource download manager (ML-006), Level Up! XP read-only (ML-010), study agent (ML-012), grade what-if (ML-027), Edge/Firefox builds (consider WXT), more locales, institution-friendly guide for lecturers.

## Done means (every task)

Acceptance criteria pass; typecheck, tests and build run; no permission or data surprises; EN/ID parity; docs and CHANGELOG updated; uncertain Moodle behavior marked unverified.
