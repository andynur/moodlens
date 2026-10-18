# Status — handoff file

Keep under 40 lines. Every agent updates it at the end of a task. Overwrite old entries; history lives in git and `CHANGELOG.md`.

**Current release:** v0.2 — Stabilize foundation (`docs/08_ROADMAP.md`).
**Last updated:** 2026-10-18.

## Last done

- `prompts/FIRST_RUN_PROMPT.md` steps 1–7 done. Step 7 added: clear all local data (ML-023 part 1), placeholder icons, ESLint + Prettier gates, dependency upgrade pass (React 19, Tailwind 4, Vite 8, Vitest 5, TS 5.9), System theme default (PRD-001 AC 5).
- `npm run check` green locally (lint, format, typecheck, test, build); `npm ci` clean, 0 audit findings. CI green on GitHub (run 38904507368, commit `29c1a80`).
- MIT `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue and PR templates added; README rewritten for contributors.
- Node pinned to 24.15+ (`.nvmrc`, `engines`); npm kept as sole package manager, stray `bun.lock` removed.
- Owner reported manual QA 1–8 passed on SiberMu with unpacked `dist/` (2026-10-18). Live course with 100 activities showed all `unknown`; fixtures show SiberMu renders completion markup on few activities, so likely correct, but unconfirmed.
- Manifest description updated by owner (126 chars, disclaimer kept).
- Breaking for local dev data: stored snapshots without `restricted` fail validation; revisit the course page to refresh.

## Next task

Owner captures one SiberMu course with **completed** activities (`tests/fixtures/README.md`); agent adds the fixture and a `complete` mapping test, then v0.2 exit review and start v0.3 (`docs/08_ROADMAP.md`).

## Blockers / waiting on owner

- One SiberMu capture that contains **completed** activities (current fixtures have none). Steps: `tests/fixtures/README.md`.

## Known failing checks

- None locally. Unverified by agent: live Moodle behavior and side panel visuals (owner-reported QA only; no UI render tests); `complete` mapping on live SiberMu.
