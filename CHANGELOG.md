# Changelog

## Unreleased

### Tooling

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
