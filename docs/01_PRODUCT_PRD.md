# Product Requirements Document — Moodlens v1.0

**Status:** approved concept, pre-implementation of v0.2 (updated 2026-10-16). **Owner:** project team. **Product name:** Moodlens — "All in One Moodle AI Agent for Student" (`docs/14_DECISIONS.md` D-001). **Audience:** students of any Moodle 4.x site that the student enables; first verified site `https://solusi.sibermu.ac.id/`. **Code/docs language:** English. **UI languages:** English and Bahasa Indonesia.

## 1. Problem

Moodle is functional but tiring for students. Deadlines are spread across courses, course pages are long, new material is hard to notice, and study tools (practice, review, planning) live outside the LMS. Existing browser extensions solve one slice each (dark mode, one-click download, deadline list) and are often locked to a single university. The AI extensions on the market mostly answer live quiz questions, which damages trust with lecturers and institutions.

## 2. Vision and positioning

A free, local-first, open-source study companion that makes any Moodle site comfortable to learn in: one side panel for tasks, progress, personal dashboard, practice and (optionally) cited AI study help.

**Positioning statement:** *For students who use Moodle, Moodlens is the integrity-safe study companion that organizes deadlines, progress and practice in one bilingual side panel. Unlike quiz-answer bots or single-campus tweaks, it runs on any Moodle site the student enables, keeps data on the device, and never touches graded work.*

See `docs/15_COMPETITIVE_POSITIONING.md` for the competitor map.

## 3. Differentiators (must stay true in every release)

1. **Integrity-safe by design.** No answer generation on active assessments, no LMS writes. Lecturers can recommend it openly.
2. **Local-first and private.** No backend, no account, no telemetry in v1. Data stays in the browser unless the student sends selected material to an AI provider they chose.
3. **Works on any Moodle 4.x site** the student enables, without broad host access.
4. **All-in-one.** Tasks, dashboard, what's new, practice and XP in one place.
5. **Bilingual EN/ID** from day one; architecture ready for more locales.
6. **Open source and transparent.** Public repo, public "what we never do" page.

## 4. Personas and jobs

- **Busy student:** "Show me what is due this week across all my courses, without opening each one."
- **Returning student:** "Tell me what changed in my courses since my last visit."
- **Exam preparer:** "Help me practice and review my own mistakes, not answer a live quiz."
- **Motivation seeker:** "Give me streaks and goals so studying feels like progress."
- **Bilingual / accessibility-first user:** "Let me work in English or Indonesian, with keyboard support and comfortable reading."

## 5. v1.0 scope

| ID | Priority | Capability | Target |
|---|---|---|---|
| ML-001 | P0 | MV3 foundation, side panel, EN/ID, theme | v0.2 |
| ML-002 | P0 | Course page DOM parser (fallback source) | v0.2 |
| ML-003 | P0 | Completion status with `unknown` state | v0.2 |
| ML-023 | P0 | Clear local data; export/import backup | v0.2 / v0.5 |
| ML-013 | P0 | Multi-instance support (student-enabled sites) | v0.3 |
| ML-024 | P0 | Onboarding and site enablement UX | v0.3 |
| ML-014 | P0 | Read-only Moodle AJAX data client | v0.4 |
| ML-015 | P0 | Task and deadline tracker, `.ics` export | v0.4 |
| ML-005 | P1 | Attendance insight from verified data only | v0.4 |
| ML-011 | P1 | Opt-in local deadline notifications | v0.4 |
| ML-004 | P0 | Today dashboard | v0.5 |
| ML-016 | P1 | Dashboard personalization (pin, color, nickname, hide) | v0.5 |
| ML-017 | P1 | "What's new since last visit" | v0.5 |
| ML-018 | P1 | Moodle page appearance (dark mode, reading comfort) | v0.5 |
| ML-022 | P0 | Assessment guard (fail-closed) | v0.6 |
| ML-019 | P1 | Flashcards with spaced repetition | v0.6 |
| ML-020 | P1 | Practice from closed quiz reviews | v0.6 |
| ML-021 | P1 | Local XP, streaks and study goals | v0.6 |
| ML-026 | P2 | Focus timer and notes per activity | v0.6 (cut if late) |
| ML-025 | P0 | Chrome Web Store release package | v0.7 / v1.0 |
| ML-007 | P1 | Local PDF text extraction | v0.8 (cut line) |
| ML-008 | P1 | BYOK provider setup and consent | v0.8 (cut line) |
| ML-009 | P1 | Cited AI summary, Q&A, AI-generated practice | v0.8 (cut line) |

**Cut line:** ML-007/008/009 ship in v1.0 only if their gates in `docs/prd/PRD-004_AI_STUDY.md` pass. Otherwise v1.0 ships without AI and AI moves to v1.1 (D-007).

**Post-v1:** ML-006 resource download manager, ML-010 Level Up! XP display, ML-012 tool-based agent, ML-027 grade what-if calculator, Edge/Firefox builds, more locales.

## 6. Requirements

### Functional

- Run only on Moodle sites the student explicitly enables (`chrome.permissions.request` per origin, HTTPS only).
- Prefer structured read-only data from Moodle's own AJAX functions (D-003); fall back to visible DOM parsing.
- Never crawl courses in the background while the LMS is not open, and never open LMS tabs silently.
- Completion and deadline values come from Moodle data or are `unknown`. Never fabricate.
- Separate LMS data (from Moodle) from Moodlens data (XP, notes, flashcards) in UI and storage.
- All views localized EN/ID; language persists; English fallback.
- Every stored item is deletable by the student; per-site removal deletes that site's data.

### Non-functional

- MV3, strict TypeScript, no remote code, minimal permissions.
- Survives service worker restarts; shows data freshness ("last updated").
- Side panel usable at 320px; keyboard operable; no color-only meaning.
- Cold open of side panel under 300 ms with cached data on a mid-range laptop (target).
- No PII in logs or fixtures; all cross-context messages validated.

## 7. Key user journeys

1. **Enable a site:** student opens their Moodle, clicks the extension, sees "Enable Moodlens on `<origin>`?", grants permission, and the panel loads courses.
2. **Weekly tasks:** student opens Today, sees due items across courses sorted by time, exports them to calendar.
3. **Catch up:** student opens a course, sees a "New since last visit" badge listing added activities.
4. **Practice:** after a quiz closes and review is allowed, student saves mistakes as flashcards and reviews them daily for XP.
5. **AI study (optional):** student picks a PDF, sees exactly what is sent and to which provider, approves, and gets a cited summary.
6. **Leave:** student removes a site or clears all data in Settings; everything for that scope is gone.

## 8. Non-goals (permanent)

Auto mark-done, bypassing restrictions, scripted attendance, forum auto-posting, solving or submitting graded assessments, sharing question banks, reading other students' data, credential or cookie access, official affiliation claims, silent background crawling.

## 9. Success metrics (v1.0 targets, measured in beta by voluntary feedback, no telemetry)

- Works on at least 3 distinct Moodle 4.x sites in manual QA.
- Zero false `complete` statuses in fixture suite and beta reports.
- Zero LMS write requests (verified by network inspection checklist).
- EN/ID key parity 100% (enforced by test).
- Chrome Web Store approval without permission rejections.
- Beta testers rate "saves me time" ≥ 4/5 (feedback form).

## 10. Assumptions and risks

| Risk | Mitigation |
|---|---|
| Moodle themes differ; DOM selectors break | AJAX-first data (D-003), DOM fallback, fixture per variant |
| Some sites disable AJAX functions or use old Moodle | Feature detection; degrade to DOM; mark unsupported |
| `sesskey` misuse risk | Strict rules in `docs/06_SECURITY_PRIVACY.md` §4 |
| Store rejection over optional `https://*/*` host permission | Single-purpose statement, per-origin request at runtime, justification text |
| Trademark conflict: name derives from "Moodle" | Trademark review before v0.7, fallback name ready, disclaimer everywhere (D-001) |
| Practice feature misused for cheating | Assessment guard, local-only, no export of quiz content (D-009) |
| AI scope delays v1 | Cut line (D-007) |

## 11. Ship gates for v1.0

See `docs/10_RELEASE_CHECKLIST.md`. Feature-level contracts live in `docs/prd/`.
