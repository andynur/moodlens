# Moodlens

> **All in One Moodle AI Agent for Student.** A free, local-first, integrity-safe study companion for any Moodle site you enable. English and Bahasa Indonesia.

**Status:** v0.1 scaffold; v0.2 (stabilize) in progress. See `docs/08_ROADMAP.md`. **Target:** v1.0 on the Chrome Web Store. **Stack:** Chrome Manifest V3, React, TypeScript, Vite, esbuild, Tailwind CSS. **First verified site:** `https://solusi.sibermu.ac.id/`.

Moodlens is an independent project. It is **not affiliated with Moodle HQ or any university**. It is not endorsed by Moodle Pty Ltd. Name decision: `docs/14_DECISIONS.md` D-001.

## What it will do (v1.0)

- **Everything due, in one place:** tasks and deadlines across courses, reminders, `.ics` calendar export.
- **Your Moodle, your way:** Today dashboard, pinned and colored courses, "what's new since last visit", dark mode for Moodle pages.
- **Practice that sticks:** flashcards with spaced repetition, review your own mistakes after a quiz closes, local XP, streaks and goals.
- **Optional AI study (BYOK):** cited summaries and practice from material you choose (behind a release cut line).
- **Works on any Moodle 4.x site** you enable, one site at a time.

## What it never does

- Answer or help with live quizzes or graded work.
- Mark activities done, submit attendance, post to forums or submit anything.
- Read passwords or cookies, or send your data to a developer server. There is no server.
- Run on sites you have not enabled.

## What works today (v0.1)

- MV3 side panel with EN/ID and light/dark theme.
- Read-only parser for the pilot site's course page (provisional, not yet tested on live HTML).
- Activity list with completion `complete` / `incomplete` / `unknown`, and safe links.

Known issues: typecheck and `npm run build` fail; see `docs/13_VALIDATION_STATUS.md`.

## Quick start (development)

```bash
npm install
npm run build
```

1. Open `chrome://extensions`, enable **Developer mode**.
2. Click **Load unpacked** and select `dist/`.
3. Log in to your own account on the pilot site and open `/course/view.php?id=...`.
4. Click the extension icon to open the side panel.

`npm run dev` serves a browser preview of the UI only; Chrome APIs need the built extension.

## Validation

```bash
npm run check   # lint (when configured), typecheck, test, build — short summary output
```

## Documentation map

| File | Purpose |
|---|---|
| `AGENTS.md` | Binding rules and context routing for all agents (loaded by `CLAUDE.md`, `GEMINI.md`, Cursor, Copilot) |
| `docs/00_STATUS.md` | Handoff file: current release, next task, blockers |
| `prompts/MASTER_PROMPT.md` | Master implementation prompt and current assignment |
| `prompts/FIRST_RUN_PROMPT.md` | First agent task (v0.2) |
| `prompts/FEATURE_TASK_TEMPLATE.md` | Template for each feature task |
| `prompts/SECURITY_REVIEW_PROMPT.md` | Pre-release security audit |
| `docs/01_PRODUCT_PRD.md` | Product vision, v1.0 scope, metrics |
| `docs/02_FEATURE_BACKLOG.md` | Feature IDs, priorities, status |
| `docs/03_ARCHITECTURE.md` | Runtime, permissions, storage, data types |
| `docs/04_MOODLE_ADAPTER.md` | Detection, AJAX, DOM parser, assessment guard |
| `docs/05_BYOK_AGENT_DESIGN.md` | AI providers, RAG, agent tool boundaries |
| `docs/06_SECURITY_PRIVACY.md` | Data inventory, permissions, integrity, store compliance |
| `docs/07_I18N.md` | EN/ID contract and glossary |
| `docs/08_ROADMAP.md` | Release train v0.1 → v1.0 with exit gates |
| `docs/09_TEST_PLAN.md` | Automated and manual QA |
| `docs/10_RELEASE_CHECKLIST.md` | Chrome Web Store checklist |
| `docs/11_SOURCE_TRACEABILITY.md` | Original plan vs current design |
| `docs/12_TECH_REFERENCES.md` | Official references |
| `docs/13_VALIDATION_STATUS.md` | What was actually run and verified |
| `docs/14_DECISIONS.md` | Decision log (binding) |
| `docs/15_COMPETITIVE_POSITIONING.md` | Competitors and differentiators |
| `docs/prd/` | Feature PRDs 001–011 |

## Principles

1. Read-only toward Moodle. The LMS stays the system of record.
2. Unknown data is `unknown`; never invent deadlines, completion or XP.
3. Integrity first: no help during live assessments.
4. Local-first: no backend, no telemetry.
5. Minimal permissions, one site at a time.
6. EN/ID parity for every string.

## Next task

Give `prompts/FIRST_RUN_PROMPT.md` to your coding agent to reach the v0.2 exit gate.
# moodlens
