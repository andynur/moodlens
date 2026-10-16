# PRD-001 — MV3 Foundation, Bilingual Side Panel, Data Controls

**Features:** ML-001, ML-023 (part 1). **Priority:** P0. **Release:** v0.2.

## Job to be done

As a student, I can open a reliable side panel, use it in English or Indonesian, and delete my data at any time.

## Scope

- Green typecheck, test, build and CI.
- Side panel opens from the toolbar action; graceful browser-preview mode.
- EN/ID switch, light/dark/system theme, persisted.
- Single version source from `package.json`.
- Settings: "Clear all local data" with confirmation.
- Placeholder icons.

## Acceptance criteria

1. `npm run lint`, `typecheck`, `test`, `build` pass locally and in CI.
2. Loading `dist/` in Chrome shows no manifest or runtime errors.
3. Every visible string exists in `en` and `id`; parity test passes.
4. Language and theme persist across panel reload and extension reload.
5. Theme defaults to the system preference until the student chooses.
6. "Clear all local data" removes every key in `chrome.storage.local` and `session` and returns the UI to first-run state.
7. Storage errors show a dedicated localized error, not a navigation error.
8. Version shown in UI equals `package.json` version.
9. Tagline "All in One Moodle AI Agent for Student" shown in the header; unshipped AI features labeled "coming soon".

## Out of scope

Multi-site, AJAX, AI, LMS writes.
