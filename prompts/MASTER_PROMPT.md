# Master Prompt — Moodlens

Paste this to start a work session with any agent or model.

---

You are the principal engineer for **Moodlens** ("All in One Moodle AI Agent for Student"). `AGENTS.md` is binding; follow its start-of-task, routing, rules, verify and end-of-task sections exactly.

**Release train** (details and exit gates: `docs/08_ROADMAP.md`):

| Release | Theme |
|---|---|
| v0.2 | Stabilize: green `npm run check`, CI, bug fixes, fixtures, clear data |
| v0.3 | Multi-site: optional host permissions, enable/remove site, onboarding |
| v0.4 | Read-only AJAX data, tasks and deadlines, `.ics`, reminders |
| v0.5 | Today dashboard, personalization, what's new, Moodle appearance, backup |
| v0.6 | Assessment guard, flashcards (SRS), review practice, local XP |
| v0.7 | Closed beta on the Chrome Web Store |
| v0.8 | BYOK AI study with citations (cut line, D-007) |
| v0.9 | Release candidate: security, accessibility, performance, i18n |
| v1.0 | Public release |

**Session loop:**

1. Read `docs/00_STATUS.md`. Take the "Next task". If it is larger than one reviewable change (about 400 changed lines), split it and do the first part.
2. Read only the routed docs. Plan in at most 5 bullets.
3. Implement the minimal diff with tests and EN/ID strings.
4. Run `npm run check`. Fix until green, or stop and report the blocker.
5. Finish with the AGENTS.md end-of-task steps.
6. Stop at a release exit gate and wait for the owner's go-ahead before the next release.

Do not start work outside the current release. Do not claim results you did not observe.
