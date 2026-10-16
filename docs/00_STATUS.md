# Status — handoff file

Keep under 40 lines. Every agent updates it at the end of a task. Overwrite old entries; history lives in git and `CHANGELOG.md`.

**Current release:** v0.2 — Stabilize foundation (`docs/08_ROADMAP.md`).
**Last updated:** 2026-10-16.

## Last done

- Docs restructured for v1.0 roadmap; product name Moodlens fixed (D-001).
- `npm run check` summary runner, `npm run fixture:sanitize` (tested), `.claude/settings.json` allowlist.
- 4 SiberMu fixtures in `tests/fixtures/sibermu-2026-10/`; findings in `docs/04_MOODLE_ADAPTER.md` (locked activities lack links, no due dates on course page, Level Up! present).
- Dashboard fixture `dashboard.html`: timeline is AJAX-loaded (supports D-003); Completion Progress block gives cross-course progress.
- `my-courses.html` fixture (`/my/courses.php`); sanitizer keeps UI headings on `/my/` pages.

## Next task

Follow `prompts/FIRST_RUN_PROMPT.md`: git init and CI, then fix the 2 typecheck errors, then the parser and i18n bugs.

## Blockers / waiting on owner

- One SiberMu capture that contains **completed** activities (current fixtures have none). Steps: `tests/fixtures/README.md`.
- LICENSE choice (MIT or Apache-2.0 recommended).

## Known failing checks

- `npm run typecheck`: 2 errors (`vite.config.ts` TS2769, `src/shared/validation.ts` TS2345). Details: `docs/13_VALIDATION_STATUS.md`.
