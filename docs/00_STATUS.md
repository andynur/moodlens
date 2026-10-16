# Status — handoff file

Keep under 40 lines. Every agent updates it at the end of a task. Overwrite old entries; history lives in git and `CHANGELOG.md`.

**Current release:** v0.2 — Stabilize foundation (`docs/08_ROADMAP.md`).
**Last updated:** 2026-10-16.

## Last done

- `prompts/FIRST_RUN_PROMPT.md` steps 1–6 committed: tree + CI workflow, typecheck fixes (vitest 3.2), parser fixes, storage error key, i18n split with parity test, guard tests.
- Step 7 partial: single version source (`package.json`), parser lists restricted activities (`url: null`) and folder/book/feedback types.
- `npm run check` green locally (lint skipped: not configured). CI not yet observed on GitHub (not pushed).
- Breaking for local dev data: stored snapshots without `restricted` fail validation; revisit the course page to refresh.

## Next task

Remaining v0.2 roadmap items, one per change: ESLint + Prettier and dependency upgrade pass; placeholder icons; clear local data control (ML-023 part 1). Then push and confirm CI green, then manual QA 1–8 (`docs/09_TEST_PLAN.md`) with unpacked `dist/`.

## Blockers / waiting on owner

- One SiberMu capture that contains **completed** activities (current fixtures have none). Steps: `tests/fixtures/README.md`.
- LICENSE choice (MIT or Apache-2.0 recommended).
- Push to `origin` to run CI (not done by agent).

## Known failing checks

- None locally. Unverified: loading `dist/` in Chrome, live Moodle behavior, CI run.
