# Contributing to Moodlens

Thank you for helping. Moodlens is a student tool, so safety, privacy and academic integrity come before features. Please read this guide before you open an issue or a pull request.

By taking part, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ground rules

[`AGENTS.md`](AGENTS.md) holds the binding rules for every contributor, human or AI. The most important ones:

- **No writes to Moodle, ever.** No mark-done, attendance, forum posts, submissions, quiz answers or restriction bypass.
- **No help during live assessments.** The assessment guard must fail closed.
- **No personal data in the repository.** No secrets, cookies, `sesskey`, student identifiers or course text in code, logs, fixtures, issues or commits.
- **No backend and no telemetry.** No external call without explicit user action, consent and a visible destination.
- **Minimal permissions.** Never add `<all_urls>`, static host permissions, `cookies`, `tabs` or `webRequest`.

Pull requests that break these rules are closed, even when the code is good.

## Before you start

1. Check [`docs/00_STATUS.md`](docs/00_STATUS.md) for the current release and the next task.
2. Check [`docs/08_ROADMAP.md`](docs/08_ROADMAP.md). Work only on items in the current release.
3. Find the feature ID in [`docs/02_FEATURE_BACKLOG.md`](docs/02_FEATURE_BACKLOG.md) and read its PRD in [`docs/prd/`](docs/prd/).
4. For anything larger than a small fix, open an issue first so we can agree on scope.
5. Read [`docs/14_DECISIONS.md`](docs/14_DECISIONS.md). Accepted decisions are binding. To change one, propose it in an issue.

## Development setup

Requirements: Node.js 24, npm, and Chrome 116 or later.

```bash
git clone https://github.com/andynur/moodlens.git
cd moodlens
npm ci
npm run build
```

Load `dist/` with **Load unpacked** on `chrome://extensions`. The [README](README.md#development) lists every npm script.

## Making changes

- Keep each pull request to one task.
- Put code in the right layer:
  - `src/content/moodle/` is the only place for Moodle selectors, AJAX function names and guard rules.
  - `src/background/` validates senders, and owns storage, migrations and alarms.
  - `src/sidepanel/` renders the UI and handles explicit user controls. No Moodle logic.
  - `src/shared/` holds types, runtime guards, messages, i18n, XP and SRS logic.
- Write code, comments, tests and docs in English.
- Add every UI string in both `en` and `id`. See [`docs/07_I18N.md`](docs/07_I18N.md).
- Do not add permissions, dependencies or frameworks without a PRD reason.
- Treat Moodle pages, AJAX responses, PDFs and AI output as untrusted data.
- Mark Moodle selectors and functions as verified or unverified. Do not claim behavior you did not observe.

## Tests and fixtures

Add or update tests in [`tests/`](tests/) for every behavior change. Parser tests run against sanitized HTML in [`tests/fixtures/`](tests/fixtures/).

To add a fixture from a real Moodle page, follow [`tests/fixtures/README.md`](tests/fixtures/README.md) and run `npm run fixture:sanitize`. Review the output by hand before you commit it. Never commit a raw capture.

Run all gates before you push:

```bash
npm run check
```

CI runs the same command on every pull request.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(sidepanel): add course color picker
fix(moodle): map "Mark as not done" to complete
docs: update test plan for v0.3
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `chore`.

## Pull request checklist

- [ ] `npm run check` passes.
- [ ] Tests cover the change.
- [ ] Every new UI string exists in `en` and `id`.
- [ ] No new permissions, dependencies or frameworks without a PRD reason.
- [ ] No personal data, secrets or course content anywhere in the diff.
- [ ] A line under **Unreleased** in [`CHANGELOG.md`](CHANGELOG.md).
- [ ] Docs updated where behavior changed.

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/andynur/moodlens/issues/new/choose). Remove names, student IDs, course names and URLs with IDs from screenshots and logs before you post them.

Report security problems privately. See [`SECURITY.md`](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
