# Test Plan

## Automated checks (every PR, enforced in CI from v0.2)

```bash
npm run check       # lint, format, typecheck, test, build in parallel (CI runs the same)
```

Tests run in the `node` environment by default. A test file that needs the DOM starts with `// @vitest-environment jsdom`.

## Unit and fixture test matrix

| Area | Cases | Release |
|---|---|---|
| URL policy | valid course/activity URL per site; wrong host, HTTP, lookalike domain, extra query params | v0.2, per-site in v0.3 |
| DOM parser | heading, missing heading, 5+ module types, duplicates, wrong-origin links, >200 activities, `.accesshide` stripping | v0.2 |
| Completion | complete, incomplete, unknown, "Mark as not done", `data-toggletype`, localized labels | v0.2 |
| i18n | key parity `en` = `id`; no empty strings | v0.2 |
| Messages | invalid shapes, oversize arrays, unknown types, sender from non-registered origin | v0.2 / v0.3 |
| Detection | Moodle fixtures high confidence; non-Moodle pages false | v0.3 |
| Site registry | add, remove (data deleted), schema migration | v0.3 |
| AJAX client | allowlist only, write-name guard, `sesskey` not in payloads/storage, error fallback, rate limit, response validation | v0.4 |
| Tasks | timestamp mapping, overdue logic, timezone handling, `.ics` output validity | v0.4 |
| Snapshot diff | added, removed, renamed, unchanged | v0.5 |
| Appearance | inject/remove idempotent | v0.5 |
| Guard | every attempt path, timer markers, unfinished review, finished review allowed | v0.6 |
| SRS / XP | scheduling intervals, streak rollover across midnight/timezone, no XP for completion toggles | v0.6 |
| AI | consent required before request, citations present or "insufficient evidence", prompt-injection corpus, guard integration | v0.8 |

Fixtures: `tests/fixtures/<variant>/`. Synthetic or sanitized only.

## Manual QA (Chrome, own account)

1. Load unpacked `dist/`; no errors in `chrome://extensions`.
2. Open a course page; panel opens from the toolbar action.
3. Compare listed activities and statuses with the page; note every `unknown`.
4. Switch EN/ID and theme; reload panel; settings persist.
5. Open an activity by explicit click; navigation stays on the site origin.
6. Navigate away; panel shows last-updated time.
7. Non-course pages cause no errors and no requests.
8. DevTools Network: no external requests; no keys, PII or full DOM dumps in console.
9. (v0.3) Enable a second Moodle site; remove it; its data and permission are gone.
10. (v0.4) Network tab: only `service.php` calls with allowlisted `info=` names; zero write functions. Tasks match Moodle's timeline block.
11. (v0.5) Appearance on/off restores original page.
12. (v0.6) Start a practice quiz attempt on a test course: all Moodlens practice/AI UI disabled.
12a. (v0.6) Course detail: start a 15-minute focus session, close and reopen the panel (timer continues), let it finish (+10 XP, no XP after Stop); add, edit and empty-save an activity note; remove the site and confirm its notes are gone.
13. (v0.8) No provider request before consent; forget key works.

## Multi-site matrix (v0.4+)

At least: SiberMu, one public Moodle demo site, one other campus site where the tester has an account. Record Moodle version and theme, not personal data.

## Accessibility and layout (v0.9)

Keyboard-only run, screen reader labels, contrast check, 320px and 400px widths, long Indonesian strings.

## Test data rules

Fictional names and ids only. Never commit real student data, course content, credentials, `sesskey` or tokens.
