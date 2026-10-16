# Validation Status

Update this file after every release gate check. State what ran, where, and the result.

## 2026-10-16 — local macOS, Node v24.11.0, npm 11.6.1

| Command | Result |
|---|---|
| `npm install` | OK, 354 packages. Deprecation warning for `whatwg-encoding`. |
| `npm run typecheck` | **Fail**, 2 errors. |
| `npm run test` | OK, 7/7 tests in `tests/moodle-adapter.test.ts`. |
| `npm run build` | **Fail**, because typecheck fails first. |
| `npx vite build` + `node scripts/build-extension.mjs` (manual) | OK. `dist/` contains `manifest.json`, `background.js`, `content.js`, `sidepanel.html`, `assets/`. |

Typecheck errors:

1. `vite.config.ts(5,13): error TS2769` — `vitest@2.1.9` bundles `vite@5.4.21`, the project uses `vite@6.4.4`; plugin types conflict.
2. `src/shared/validation.ts(61,65): error TS2345` — `s.courseId` loses narrowing inside the `every()` callback.

Not verified:

- Loading `dist/` in Chrome.
- Any behavior on a live, authenticated Moodle site.
- No git repository yet; no CI.

These items are tracked in `docs/08_ROADMAP.md` v0.2.
