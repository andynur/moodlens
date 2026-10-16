# Changelog

## Unreleased

### Fixed

- Typecheck: vitest upgraded to 3.2 so it shares vite 6 with the build; `courseId` narrowing in `isCourseSnapshot`.
- Parser: `manual:undo` and "Mark as not done" map to `complete`, "To do" to `incomplete`; `.accesshide` suffixes removed from titles; missing course heading stored as `null` and localized in the UI.
- Side panel shows a dedicated storage-load error instead of the navigation error.

### Added

- Placeholder icons 16/32/48/128 (`npm run icons`, `scripts/make-icons.mjs`, no new dependency) wired into the manifest and action; guard test checks files and sizes.
- Settings: "Clear all local data" with an inline confirmation; background clears `chrome.storage.local` and `session` only for trusted extension pages (ML-023 part 1).
- Parser lists activities without a link as restricted (`url: null`, `restricted: true`) and supports folder, book and feedback types.
- CI workflow (`.github/workflows/ci.yml`) running `npm ci && npm run check`.
- Guard tests: manifest permission snapshot, forbidden permissions, no raw HTML rendering; i18n parity test; SiberMu fixture parser tests.

### Changed

- i18n split into `src/shared/i18n/en.ts` and `id.ts` (`satisfies Record<TranslationKey, string>`).
- `package.json` is the single version source for the manifest and side panel footer.

### Tooling

- ESLint 10 (flat config, typescript-eslint, react-hooks) and Prettier 3 (`npm run lint`, `format`, `format:check`); `npm run check` now runs lint and format gates. Tree reformatted once with Prettier.
- `npm run check` summary runner, `npm run fixture:sanitize` with tests, `.claude/settings.json` permission allowlist.

### Fixtures

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
