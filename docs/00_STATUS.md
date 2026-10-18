# Status — handoff file

Keep under 40 lines. Every agent updates it at the end of a task. Overwrite old entries; history lives in git and `CHANGELOG.md`.

**Current release:** v0.3 — Multi-instance (`docs/08_ROADMAP.md`, `docs/prd/PRD-007_MULTI_INSTANCE.md`).
**Last updated:** 2026-10-18.

## Last done

- v0.2 exit review: gate met locally (checks green, owner QA 1–8 passed); CI on latest `main` still pending push. v0.3 started at owner request.
- v0.3 core (D-002, D-013): manifest drops static `content_scripts`, adds `scripting` + `optional_host_permissions: ["https://*/*"]`.
- Site registry (`src/background/sites.ts`): enable by address (permission requested on click in the panel), register `<origin>/course/view.php*` script, detection once on the active tab, rename, remove (data + permission + script), reconcile on install/startup/permission change.
- `src/content/moodle/detect.ts` with fixture tests; bundled function verified self-contained for `executeScript`.
- `LMS_ORIGIN` removed; validators take the registry origin; background accepts snapshots only from registered origins.
- Storage `schemaVersion` 2 + migration (`src/background/migrate.ts`): v0.2 SiberMu snapshot becomes the first site; access must be re-granted ("Grant access" in panel).
- Side panel: enable card when no site, alerts for revoked access / not detected, Settings → Sites list; clear-all also revokes access.
- Tests: background (AC 1, 4, 5 unit, 6), migration (AC 7), detection, site origins. `npm run check` green.

## Next task

1. Owner live QA on SiberMu: reload unpacked `dist/`, grant access again, enable, open course, remove site (test plan item 9; PRD-007 AC 2, 3, 5).
2. Enable a second Moodle 4.x site (for example a public Moodle demo) and add a sanitized detection fixture (AC 8).
3. Onboarding screens EN/ID (3 screens, PRD-007), last open v0.3 roadmap item.

## Blockers / waiting on owner

- Push `main` so CI runs (v0.2 gate and the v0.3 work).

## Known failing checks

- None locally. Unverified by agent: everything in Chrome (permission prompt, `registerContentScripts`, `executeScript` detection, migration on a real v0.2 profile), side panel visuals, any non-SiberMu site.
