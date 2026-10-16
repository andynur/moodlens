# Status — handoff file

Keep under 40 lines. Every agent updates it at the end of a task. Overwrite old entries; history lives in git and `CHANGELOG.md`.

**Current release:** v0.2 — Stabilize foundation (`docs/08_ROADMAP.md`).
**Last updated:** 2026-10-16.

## Last done

- `prompts/FIRST_RUN_PROMPT.md` steps 1–7 done. Step 7 added: clear all local data (ML-023 part 1), placeholder icons, ESLint + Prettier gates, dependency upgrade pass (React 19, Tailwind 4, Vite 8, Vitest 5, TS 5.9), System theme default (PRD-001 AC 5).
- `npm run check` green locally (lint, format, typecheck, test, build); `npm ci` clean, 0 audit findings. CI green on GitHub (run 38904507368, commit `29c1a80`).
- Breaking for local dev data: stored snapshots without `restricted` fail validation; revisit the course page to refresh.

## Next task

Owner runs manual QA 1–8 (`docs/09_TEST_PLAN.md`) with unpacked `dist/`, including Settings > Clear all local data and the Tailwind 4 visual check (light, dark, system). Then v0.2 exit review.

## Blockers / waiting on owner

- One SiberMu capture that contains **completed** activities (current fixtures have none). Steps: `tests/fixtures/README.md`.
- LICENSE choice (MIT or Apache-2.0 recommended).

## Known failing checks

- None locally. Unverified: loading `dist/` in Chrome, live Moodle behavior, side panel visuals after the Tailwind 4 migration (no UI render tests).
