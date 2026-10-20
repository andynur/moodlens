# Delivery Roadmap — v0.1 to v1.0 (Chrome Web Store)

Each feature release has an **exit gate**. Before v1.0, deferred live, legal and store evidence in `docs/PRE_RELEASE_NOTES.md` must also pass. Record slips and scope moves in this file and in `docs/14_DECISIONS.md` when they change architecture or release policy.

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
- [x] Onboarding screens EN/ID.

**Exit gate:** enable/disable works on SiberMu plus at least one other Moodle 4.x site (for example a public Moodle demo site); no static host permissions remain; permission request appears only on user click.

## v0.4 — Data layer and tasks

Goal: accurate deadlines without fragile scraping.

- [x] D-003 source/test security review signed off (2026-10-19); live Network inspection remains part of the exit gate.
- [x] Read-only AJAX client with function allowlist, strict response validation, per-site rate limit and 24-hour unsupported cache (ML-014).
- [x] Enrolled course list and timeline/calendar events normalized into bounded `Task` records.
- [x] Tasks view: overdue, today, this week, later, no date; site/course/type filters and title search (ML-015).
- [x] Local RFC 5545 `.ics` export of selected or filtered tasks; Google/Apple import QA pending.
- [x] Opt-in reminders via `alarms` + optional `notifications` (ML-011); browser-restart QA pending.
- [ ] **Blocked:** attendance insight needs a sanitized timeline/calendar fixture proving `mod_attendance` timestamps and states (ML-005).
- [x] DOM fallback when AJAX is unavailable; UI shows `AJAX` or `DOM` source.

**Exit gate:** deadlines match Moodle's own timeline block on 3 sites; network inspection shows only allowlisted read functions; zero write calls.

## v0.5 — Dashboard and personalization

- [x] Today dashboard with widgets: due soon, progress per course, what's new, streak (ML-004). Due soon, what's new, pinned, progress and streak widgets with show/hide/reorder done.
- [x] Pin, reorder, color, nickname, hide courses (ML-016).
- [x] Snapshot history and "what's new since last visit" diff (ML-017): per-course records, badge, list, local "Mark as seen".
- [x] Opt-in Moodle page appearance: dark mode, font size, line width, hide blocks from a fixed list (ML-018, D-015). Verified live on Edwiser RemUI (SiberMu, 2026-10-19); a second theme is still pending (PRD-009 AC 4).
- [x] Appearance theme presets `clean`, `sepia`, `contrast` from design tokens with CSS-only spacing; no DOM rewriting, no third-party brand assets, off on assessment-guarded pages (ML-018, D-020). Checked on a synthetic Boost-like page; live-theme check pending.
- [x] Export/import local backup JSON (ML-023 part 2).

**Exit gate:** dashboard usable at 320px; diff tests cover add/remove/rename; appearance injection reversible and scoped to enabled sites.

## v0.6 — Practice and motivation

- [~] Assessment guard first (ML-022): fail-closed detection of attempt pages and timed/locked states. Rules, validator, content-script reporting, background verdict (`src/background/guard.ts`) and the paused banner done; quiz attempt/review fixtures pending, so every DOM marker stays unverified.
- [x] IndexedDB store design and retention settings. D-014 design, `src/background/studyStore.ts`, retention rules, wiring into site removal, clear-all and backup import, and the Settings retention control (90 days / 1 year / 2 years, pruned on save and on browser start) done.
- [x] Flashcards: user-authored decks, FSRS-style scheduling, daily review (ML-019). Scheduler (PRD-010 AC 4), CSV/JSON import/export, background study service (`src/background/study.ts`) and the Study page with decks, card entry, review ratings and import/export done; store paths checked in Chrome, no automated IndexedDB coverage.
- [~] Save mistakes from closed quiz review pages into private decks (ML-020, D-009). Guarded capture, private card builder (PRD-010 AC 2), offer plumbing (`src/background/practice.ts`) and the Study page save button done; a sanitized review fixture is still missing, so the selectors stay unverified and the save path is untested against real Moodle markup.
- [x] Local XP, levels, streaks, weekly goals (ML-021, D-006). Rules (PRD-010 AC 5), storage (`src/background/xp.ts`, key `xp`, in the backup allowlist), awards for card reviews, finished review sessions and tasks opened early, the Study page XP card and the Today streak widget done.
- [x] P2: focus timer and per-activity notes (ML-026). Background-owned timer (15/25/50 min, `chrome.alarms`, 10 XP only after the full length, none when stopped or the site is gone) and plain-text notes per activity in the study IndexedDB (schema v2 `notes`), both on the course detail page; rendering, the v1 to v2 upgrade and the timer checked in Chrome (34/34).

**Exit gate:** guard tests pass for every known attempt URL and state; no quiz content leaves the device; XP rules documented and tested. Met in tests; the quiz DOM markers themselves still need a sanitized attempt/review fixture.

## v0.7 — Release package (done 2026-10-19)

- [x] Source/test security review complete: no open Critical/High; one Practice capture context/bounds finding fixed. Live quiz-fixture verification remains an owner QA dependency.
- [x] Trademark review for "Moodlens" and fallback name ready (D-001). Review found the name high risk without written permission; BelajarLens fallback package documented.
- [x] Privacy policy page, "what we never do" page and lecturer guide prepared in EN/ID. Publication is deferred to the pre-release checklist.
- [x] Store listing draft: EN/ID descriptions, single-purpose statement, privacy declarations, permission justifications, icons, promo tile and three synthetic-data screenshots per locale are ready.
- [x] Reproducible v0.7.0 ZIP generated after the security review; checksum and package evidence recorded.
- [x] Privacy-safe beta QA ledger, three-site evidence standard, P0/P1 triage rules and seven-day clock procedure are ready (`docs/releases/v0.7/BETA_QA_RUNBOOK.md`).
- [x] Store upload, trusted-tester configuration and live beta operations explicitly deferred to `docs/PRE_RELEASE_NOTES.md`; the opt-in GitHub beta feedback form is ready with no telemetry.
- [x] Three-site QA, tester cohort, bug triage and stability-clock requirements preserved in `docs/PRE_RELEASE_NOTES.md` for completion against the final feature candidate.

**Exit gate:** local v0.7 package, security review, listing assets and beta process documentation complete. External publication and beta acceptance are deferred by D-017 and remain mandatory before v1.0.

## v0.8 — AI study (BYOK, cut line)

- [x] Provider settings: OpenAI, Gemini; session key storage; forget key (ML-008). Optional Ollama deferred (D-018).
- [x] PDF.js packaged locally, text extraction with page metadata (ML-007).
- [x] Consent screen showing destination, content, purpose.
- [x] Cited summary, Q&A, AI-generated flashcards/practice from selected material (ML-009).
- [x] Prompt-injection corpus tests; guard integration.

**Exit gate:** all PRD-004 acceptance criteria pass. If not met by the planned date, disable AI behind a build flag (`MOODLENS_AI=off`) and continue to v0.9 (D-007). Gemini observed 2026-10-20 (agent, real key, synthetic PDF): Summary and Flashcards pass in EN and ID. OpenAI real-key run skipped by owner (no key, 2026-10-20). Open: the Chrome host-permission prompt on Continue, accepted by hand once (owner).

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
