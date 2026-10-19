# v0.7 Closed-Beta QA Runbook

Use this file to prove the v0.7 exit gate without collecting personal data. A blank field is not a pass. Record only site aliases, Moodle/theme versions, generic observations and public issue links. Never record tester names, email addresses, student IDs, credentials, private course URLs/content, cookies, `sesskey` values, raw HTML or unsanitized Network exports.

## Candidate identity

- Version: `0.7.0`
- Expected ZIP SHA-256: `254cfb226e6d18f7f4b393519a5c97485a84a60f0743cdb2b46146267aebc46e`
- Release evidence: `docs/releases/v0.7/RELEASE_EVIDENCE.md`
- Visibility target: Private / trusted testers; do not invite testers until store review approves the matching artifact.

If the ZIP checksum changes, stop testing, document why, regenerate release evidence and restart every result that could be affected.

## Evidence rules

A Moodle site counts only when an authorized tester runs the store-installed candidate while authenticated and completes all applicable steps below. Reachability, source tests, fixture tests, local preview, an unpacked synthetic harness and a guest page do not count as beta-site acceptance.

For each site record:

- Test date and anonymous tester ID (`T01`–`T10`).
- Site alias (`S1`–`S3` or higher), Moodle version, theme and Chrome/OS version.
- Candidate version and verified ZIP checksum/reviewed store version.
- Result for every applicable manual test in `docs/09_TEST_PLAN.md` items 1–12a.
- Task comparison result and Network result: only allowlisted same-origin `service.php` reads, zero Moodle writes and no external requests.
- Site removal result: permission and all site-scoped Moodlens data removed.
- Public sanitized issue links, or the private security-report reference when disclosure would be unsafe.

## Three-site matrix

| Site | Moodle / theme | Authorized test | Full run | Network checked | Result | Evidence |
|---|---|---:|---:|---:|---|---|
| S1 — SiberMu | Moodle 4.x / Edwiser RemUI | Pending owner confirmation | No | No | Not counted | An authenticated session and earlier narrow appearance/AJAX observations exist; the complete v0.7 run has not been observed. |
| S2 — Mount Orange demo | Moodle 5.3 / public demo theme | Public guest page only | No | No | Not counted | Site reachability observed 2026-10-19 at `https://school.moodledemo.net/`; authenticated extension QA still required. |
| S3 — authorized campus site | Pending | No | No | No | Not counted | Owner/tester must provide authorized access and record sanitized evidence. |

## Tester cohort

One person may exercise more than one site, but the exit gate needs at least ten distinct opted-in testers and at least three accepted sites. Keep the identity-to-ID mapping outside this public repository.

| Tester | Store install confirmed | Site alias | EN/ID | Core run complete | Feedback/issue | Result |
|---|---:|---|---|---:|---|---|
| T01 | No | — | — | No | — | Pending |
| T02 | No | — | — | No | — | Pending |
| T03 | No | — | — | No | — | Pending |
| T04 | No | — | — | No | — | Pending |
| T05 | No | — | — | No | — | Pending |
| T06 | No | — | — | No | — | Pending |
| T07 | No | — | — | No | — | Pending |
| T08 | No | — | — | No | — | Pending |
| T09 | No | — | — | No | — | Pending |
| T10 | No | — | — | No | — | Pending |

## Bug triage

- **P0 — stop distribution:** any Moodle write; credential/session-key exposure; quiz or assessment-guard bypass; quiz-derived data exported, backed up or sent externally; unexpected external network transfer; cross-site data disclosure; clear/remove-site destroys unrelated data.
- **P1 — block exit gate:** setup or site removal fails on a supported site; core Today/Tasks data is materially wrong; the panel repeatedly crashes; reminder, backup/restore or private Practice corrupts data; a permission or privacy disclosure materially disagrees with the shipped build.
- **P2:** important workflow defect with a safe workaround and no privacy, integrity or data-loss impact.
- **P3:** cosmetic, copy or low-impact compatibility issue.

P0 and security reports stay private under `SECURITY.md`. Public GitHub issues must use synthetic descriptions and the privacy checkboxes in the issue forms. The maintainer assigns priority after reproduction; tester wording alone does not establish severity.

## Seven-day clock

The clock can start only after all of these are true:

1. Chrome Web Store review approved the checksum-matched candidate.
2. Ten testers have installed it and the three-site matrix has three accepted sites.
3. Every reported bug has been triaged; no P0/P1 remains open.
4. The start timestamp and current candidate identity are recorded below.

Any P0/P1 discovery, candidate change affecting runtime behavior, or unreviewed replacement ZIP resets the clock to zero after the fix is reviewed and retested. P2/P3 issues do not reset it unless reclassified.

| Candidate | Clock start (UTC) | Last P0/P1 check (UTC) | Seven full days reached | Evidence |
|---|---|---|---:|---|
| 0.7.0 / `254cfb22…bc46e` | Not started | 2026-10-19: public repository had no open issues, but the candidate is unpublished | No | Store approval, tester and site gates are pending. |

## Exit sign-off

Do not mark `docs/08_ROADMAP.md` complete or create the final `v0.7.0` tag until every table above contains affirmative, reviewable evidence and the seven-day timestamp has elapsed. Sign-off must name the exact store item/version and uploaded checksum; it must not rely on local tests alone.

