# Changelog

## Unreleased

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
