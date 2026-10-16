# Moodlens

[![CI](https://github.com/andynur/moodlens/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/andynur/moodlens/actions/workflows/ci.yml)
![Status: pre-release](https://img.shields.io/badge/status-pre--release%20v0.2-orange)
![Chrome MV3](https://img.shields.io/badge/Chrome-MV3%20%E2%89%A5116-4285F4)
![Languages: EN | ID](https://img.shields.io/badge/i18n-EN%20%7C%20ID-blue)

> **All in One Moodle AI Agent for Student.** A free, local-first, integrity-safe study companion for any Moodle site you enable. English and Bahasa Indonesia.

Moodlens is a Chrome side panel extension that reads your own Moodle course pages and organizes them for study. It does not write to Moodle, it has no backend, and it collects no telemetry.

> [!IMPORTANT]
> Moodlens is an independent project. It is **not affiliated with or endorsed by Moodle Pty Ltd, Moodle HQ or any university**. See [D-001](docs/14_DECISIONS.md).

## Contents

- [Project status](#project-status)
- [Features](#features)
- [What Moodlens never does](#what-moodlens-never-does)
- [Getting started](#getting-started)
- [Development](#development)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [Security and privacy](#security-and-privacy)
- [Documentation](#documentation)
- [License](#license)

## Project status

| | |
|---|---|
| Current release | **v0.2 — Stabilize foundation** (in progress) |
| Target | v1.0 on the Chrome Web Store |
| First verified site | `https://solusi.sibermu.ac.id/` |
| Live handoff | [`docs/00_STATUS.md`](docs/00_STATUS.md) |
| Roadmap | [`docs/08_ROADMAP.md`](docs/08_ROADMAP.md) |

Moodlens is pre-release software. Expect breaking changes to stored local data between versions.

## Features

### Available now

- Manifest V3 side panel in English and Bahasa Indonesia.
- Light, dark and system themes.
- Read-only course page parser for the pilot site, tested against sanitized fixtures.
- Activity list with completion state `complete`, `incomplete` or `unknown`, and safe links back to Moodle.
- **Settings > Clear all local data.**

### Planned for v1.0

- **Everything due, in one place:** tasks and deadlines across courses, reminders, `.ics` calendar export.
- **Your Moodle, your way:** Today dashboard, pinned and colored courses, "what's new since last visit", dark mode for Moodle pages.
- **Practice that sticks:** flashcards with spaced repetition, review of your own mistakes after a quiz closes, local XP, streaks and goals.
- **Optional AI study (bring your own key):** cited summaries and practice from material you choose.
- **Any Moodle 4.x site** you enable, one site at a time.

Full list with priorities: [`docs/02_FEATURE_BACKLOG.md`](docs/02_FEATURE_BACKLOG.md).

## What Moodlens never does

- Answer or help with live quizzes or graded work.
- Mark activities done, submit attendance, post to forums or submit anything.
- Read passwords or cookies, or send your data to a developer server. There is no server.
- Run on sites you have not enabled.

## Getting started

Moodlens is not yet on the Chrome Web Store. To try it, build it from source.

### Requirements

- Node.js 24 (the version CI uses) and npm
- Chrome or another Chromium browser, version 116 or later
- Your own account on a supported Moodle site

### Install

```bash
git clone https://github.com/andynur/moodlens.git
cd moodlens
npm ci
npm run build
```

### Load the extension

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `dist/` folder.
3. Log in to your own account on the pilot site and open a course page (`/course/view.php?id=...`).
4. Click the Moodlens toolbar icon to open the side panel.

After you change code, run `npm run build` again and click **Reload** on the extension card.

## Development

### Scripts

| Command | What it does |
|---|---|
| `npm run check` | Runs every gate: lint, format check, typecheck, tests, build. Run it before you open a pull request. |
| `npm run build` | Typechecks and builds the unpacked extension into `dist/`. |
| `npm run dev` | Serves a browser preview of the side panel UI only. Chrome extension APIs need the built extension. |
| `npm test` | Runs the Vitest suite once. |
| `npm run lint` | Runs ESLint. |
| `npm run format` | Formats the tree with Prettier. |
| `npm run typecheck` | Runs `tsc --noEmit`. |
| `npm run fixture:sanitize` | Removes personal data from a captured Moodle page before it becomes a test fixture. |
| `npm run icons` | Regenerates the placeholder icons. |

### Tech stack

Chrome Manifest V3, React 19, TypeScript 5.9, Vite 8, esbuild, Tailwind CSS 4, Vitest 5, ESLint and Prettier.

### Testing

Automated tests live in [`tests/`](tests/). Moodle parser tests run against sanitized HTML fixtures in [`tests/fixtures/`](tests/fixtures/). To add a fixture from a real site, follow [`tests/fixtures/README.md`](tests/fixtures/README.md). Never commit unsanitized captures.

Manual QA steps are in [`docs/09_TEST_PLAN.md`](docs/09_TEST_PLAN.md).

## Project structure

```text
src/
  background/      Service worker: sender validation, storage, migrations, alarms
  content/moodle/  The only place for Moodle selectors, AJAX function names and guard rules
  sidepanel/       React UI and explicit user controls; no Moodle logic
  shared/          Types, runtime guards, messages, i18n, XP and SRS logic
public/            manifest.json and icons
scripts/           Build, check, icon and fixture tooling
tests/             Vitest suites and sanitized fixtures
docs/              Product, architecture, security and release docs
prompts/           Task prompts for coding agents
```

## Contributing

Contributions are welcome. Before you start:

1. Read [`AGENTS.md`](AGENTS.md). Its hard rules apply to human and AI contributors.
2. Check [`docs/00_STATUS.md`](docs/00_STATUS.md) and [`docs/08_ROADMAP.md`](docs/08_ROADMAP.md). Work only on the current release.
3. Find the feature ID in [`docs/02_FEATURE_BACKLOG.md`](docs/02_FEATURE_BACKLOG.md) and read its PRD in [`docs/prd/`](docs/prd/).

Pull request checklist:

- `npm run check` passes.
- Code, comments, tests, docs and commit messages are in English.
- Every new UI string exists in both `en` and `id` ([`docs/07_I18N.md`](docs/07_I18N.md)).
- No new permissions, dependencies or frameworks without a PRD reason.
- No writes to Moodle of any kind.
- No secrets, cookies, `sesskey`, student identifiers or course text in code, logs, fixtures or commits.
- A line under **Unreleased** in [`CHANGELOG.md`](CHANGELOG.md).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `build:`).

To support a new Moodle site, open an issue first. Include the Moodle version and theme, but no personal data or course content.

## Security and privacy

Core principles:

1. Read-only toward Moodle. Moodle stays the system of record.
2. Unknown data stays `unknown`. Moodlens never invents deadlines, completion or XP.
3. Integrity first. An assessment guard blocks help during live assessments and fails closed.
4. Local-first. No backend, no telemetry. Data stays in your browser's extension storage.
5. Minimal permissions. Host access is requested at runtime for one site at a time.
6. English and Indonesian parity for every string.

The manifest requests only `storage` and `sidePanel`. Details: [`docs/06_SECURITY_PRIVACY.md`](docs/06_SECURITY_PRIVACY.md).

**Reporting a vulnerability:** do not open a public issue. Report it privately to the maintainer through GitHub's **Security** tab on this repository.

## Documentation

| File | Purpose |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Binding rules and context routing for contributors and coding agents |
| [`docs/00_STATUS.md`](docs/00_STATUS.md) | Current release, next task, blockers |
| [`docs/01_PRODUCT_PRD.md`](docs/01_PRODUCT_PRD.md) | Product vision, v1.0 scope, metrics |
| [`docs/02_FEATURE_BACKLOG.md`](docs/02_FEATURE_BACKLOG.md) | Feature IDs, priorities, status |
| [`docs/03_ARCHITECTURE.md`](docs/03_ARCHITECTURE.md) | Runtime, permissions, storage, data types |
| [`docs/04_MOODLE_ADAPTER.md`](docs/04_MOODLE_ADAPTER.md) | Detection, AJAX, DOM parser, assessment guard |
| [`docs/05_BYOK_AGENT_DESIGN.md`](docs/05_BYOK_AGENT_DESIGN.md) | AI providers, RAG, agent tool boundaries |
| [`docs/06_SECURITY_PRIVACY.md`](docs/06_SECURITY_PRIVACY.md) | Data inventory, permissions, integrity, store compliance |
| [`docs/07_I18N.md`](docs/07_I18N.md) | EN/ID contract and glossary |
| [`docs/08_ROADMAP.md`](docs/08_ROADMAP.md) | Release train v0.1 to v1.0 with exit gates |
| [`docs/09_TEST_PLAN.md`](docs/09_TEST_PLAN.md) | Automated and manual QA |
| [`docs/10_RELEASE_CHECKLIST.md`](docs/10_RELEASE_CHECKLIST.md) | Chrome Web Store checklist |
| [`docs/11_SOURCE_TRACEABILITY.md`](docs/11_SOURCE_TRACEABILITY.md) | Original plan vs current design |
| [`docs/12_TECH_REFERENCES.md`](docs/12_TECH_REFERENCES.md) | Official references |
| [`docs/13_VALIDATION_STATUS.md`](docs/13_VALIDATION_STATUS.md) | What was actually run and verified |
| [`docs/14_DECISIONS.md`](docs/14_DECISIONS.md) | Decision log (binding) |
| [`docs/15_COMPETITIVE_POSITIONING.md`](docs/15_COMPETITIVE_POSITIONING.md) | Competitors and differentiators |
| [`docs/prd/`](docs/prd/) | Feature PRDs |
| [`prompts/`](prompts/) | Task prompts for coding agents |
| [`CHANGELOG.md`](CHANGELOG.md) | Release notes |

## License

No license has been chosen yet, so no open source license applies to this code. The maintainer plans to pick MIT or Apache-2.0 before v1.0. Until then, ask before you reuse the code.

Moodle is a registered trademark of Moodle Pty Ltd. Moodlens uses the name only to describe compatibility.
