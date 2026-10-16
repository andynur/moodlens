# Security Policy

Moodlens runs inside the browser of students who are logged in to their Moodle site. We take reports about data exposure, permission misuse and integrity bypasses seriously.

## Supported versions

Moodlens is pre-release. Only the latest commit on `main` receives security fixes. After v1.0, this table will list supported releases.

| Version | Supported |
|---|---|
| `main` | Yes |
| Older commits | No |

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for a security problem.**

Report it privately through GitHub: open the repository's **Security** tab and select **Report a vulnerability**. If that option is not available, open a public issue that asks for a private contact, without any details of the problem.

Please include:

- What the problem is and what an attacker can do with it.
- Steps to reproduce, with the Moodlens commit and the Chrome version.
- The Moodle version, if it matters.

Do not include real credentials, cookies, `sesskey` values, student data or course content. Use a test account or redact the values.

## What to expect

- We confirm receipt within 7 days.
- We share an assessment and a fix plan as soon as we can.
- We credit you in the release notes, unless you ask us not to.

Please give us reasonable time to release a fix before you disclose the problem publicly.

## Scope

In scope:

- Leaks of Moodle data, cookies, `sesskey` or local storage to any other party.
- Moodlens running on a site the user did not enable, or with permissions it did not request.
- Any path that writes to Moodle.
- Bypasses of the assessment guard during live quizzes or graded work.
- Execution of instructions found in Moodle pages, PDFs or AI output.
- Cross-site scripting in the side panel.

Out of scope:

- Vulnerabilities in Moodle itself. Report those to the [Moodle security team](https://moodle.org/security/).
- Problems that need a compromised browser or operating system.
- Behavior of third-party AI providers that the user chose to configure.

## Design references

- [`docs/06_SECURITY_PRIVACY.md`](docs/06_SECURITY_PRIVACY.md): data inventory, permissions and store policy.
- [`docs/03_ARCHITECTURE.md`](docs/03_ARCHITECTURE.md): runtime, storage and message boundaries.
- [`docs/04_MOODLE_ADAPTER.md`](docs/04_MOODLE_ADAPTER.md): Moodle access rules and the assessment guard.
