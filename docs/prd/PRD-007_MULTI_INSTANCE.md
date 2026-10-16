# PRD-007 — Multi-Instance Support and Onboarding

**Features:** ML-013, ML-024. **Priority:** P0. **Release:** v0.3. **Decision:** D-002.

## Job to be done

As a student at any university that uses Moodle, I can turn Moodlens on for my campus site in one click, and turn it off just as easily.

## Requirements

- Manifest: remove static `content_scripts` and the hardcoded host; add `scripting` and `optional_host_permissions: ["https://*/*"]`.
- First-run onboarding (3 short screens, EN/ID): what Moodlens does, what it never does, how to enable a site.
- "Enable on this site" in the side panel when the active tab is HTTPS and not yet enabled.
- After permission grant: run detection (`docs/04_MOODLE_ADAPTER.md` §1); register content script for `<origin>/*`.
- Site registry: id, origin, label (editable), enabledAt, versionHint.
- Settings → Sites: list, rename, remove. Remove = unregister script + `chrome.permissions.remove` + delete site data.
- All validators take the site origin from the registry; no global `LMS_ORIGIN`.
- Storage schema version + migration from v0.2 single-site data (SiberMu becomes the first site if the user had data).
- Re-register content scripts on browser start (`runtime.onStartup`) from the registry.

## Acceptance criteria

1. Fresh install has zero host permissions.
2. Enabling a site shows Chrome's permission prompt for that single origin only.
3. Non-Moodle page: panel says it is not detected and offers to revoke.
4. Two sites enabled at once keep separate data.
5. Removing a site deletes its data and permission; verified in `chrome://extensions` site access.
6. Messages from an origin not in the registry are rejected (test).
7. Migration test from v0.2 storage passes.
8. Works on SiberMu and one other Moodle 4.x site.

## Out of scope

HTTP sites, Moodle 3.x support guarantees (best effort), Moodle mobile app.
