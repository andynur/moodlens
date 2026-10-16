# First-run prompt (v0.2)

Follow `AGENTS.md`. Read `docs/00_STATUS.md`, the v0.2 section of `docs/08_ROADMAP.md`, `docs/prd/PRD-001_FOUNDATION.md` and `docs/prd/PRD-002_COURSE_INSIGHTS.md`. Read other docs only through the routing table.

Goal: reach the v0.2 exit gate. No AJAX, multi-site, AI or Moodle writes.

Do in order, one commit each:

1. `git init`; commit the current tree; add `.github/workflows/ci.yml` running `npm ci && npm run check`.
2. Fix `vite.config.ts` TS2769 (vitest bundles another vite major: upgrade vitest or move test config to `vitest.config.ts`) and `src/shared/validation.ts` TS2345 (keep `courseId` narrowed inside `every()`).
3. Parser fixes with tests: "Mark as not done" / `data-toggletype="manual:undo"` → `complete`; strip `.accesshide`; store `null` instead of `'Untitled course'`.
4. Dedicated storage error key instead of `noNavigation`.
5. Split i18n into `en.ts` / `id.ts` with `satisfies` and a parity test.
6. Guard tests: manifest permissions snapshot; no `dangerouslySetInnerHTML`; no forbidden permissions.
7. Continue the remaining v0.2 roadmap items.

After each step: `npm run check`, then the AGENTS.md end-of-task steps.
