# Release Checklist — Chrome Web Store

Use for the first official public release. The v0.7 development milestone closed with a locally verified package; its unfinished live, legal and store operations are consolidated in `docs/PRE_RELEASE_NOTES.md` and remain required before v1.0 (D-017).

## Product and legal

- [x] Moodle trademark policy reviewed for the name "Moodlens" and the tagline; permission or fallback name ready (D-001). High risk without written permission; the BelajarLens fallback package and activation steps are in `docs/releases/v0.7/TRADEMARK_REVIEW.md`.
- [x] Listing body describes only shipped features, including optional BYOK AI study with its data flow; the `MOODLENS_AI=off` fallback copy is kept (`docs/releases/v0.7/STORE_LISTING.md`, finalized for v0.9 on 2026-10-20). Owner still decides whether to list providers not run with a real key.
- [x] No university names or logos implying affiliation; the bilingual listing and always-visible UI copy use the independent-project disclaimer.
- [~] Privacy policy page prepared in EN and ID (`PRIVACY.md`); publication waits for the local commits to be pushed to the already-public repository.
- [~] "What we never do" page prepared in EN and ID (`WHAT_WE_NEVER_DO.md`); publication waits for push.
- [x] Open-source license chosen and added (`LICENSE`, MIT).

## Store listing

- [x] Single-purpose description: local-first study companion for Moodle course sites the student enables.
- [x] Short and long description in EN; ID listing translation (`docs/releases/v0.7/STORE_LISTING.md`).
- [x] Icons 16/32/48/128 and store icon 128; locale-neutral promo tile 440×280. Dimensions and rendered appearance verified.
- [x] Five screenshots 1280×800 (Today, Tasks, Practice, AI answer, AI consent) in both EN and ID, rendered from synthetic data, regenerated for v0.9 and visually verified (`store-assets/`).
- [x] Category: Education.
- [x] Privacy practices answers drafted against the shipped data paths and `docs/06_SECURITY_PRIVACY.md` §2 inventory.
- [~] Limited Use statement added to `PRIVACY.md` and dashboard certification copy drafted; the owner must check it in the Developer Dashboard after final ZIP comparison.

## Permission justifications (paste into dashboard)

- [x] `storage`: save preferences and study data locally.
- [x] `sidePanel`: show the study companion next to the course.
- [x] `scripting`: run packaged code only on Moodle sites the student enables.
- [x] `alarms`: local deadline reminders and focus-session completion; no polling.
- [x] optional `notifications`: show reminders when the student turns them on.
- [x] optional host `https://*/*`: requested for one Moodle site at a time after the student clicks "Enable".
- [x] optional AI provider hosts: covered by the optional `https://*/*` entry; requested for one provider origin when the student presses Continue on the consent screen, removed on Forget key and Clear all.

## Engineering

- [~] Local full gate green, lockfile updated and committed, and `npm audit` reports 0 vulnerabilities; CI on the release tag waits for push/tag.
- [x] Version `0.9.0` in `package.json`, built manifest and UI footer match (v0.9 release candidate). `package-lock.json` root version still reads 0.7.0: run `npm install --package-lock-only` once (owner).
- [x] `dist/` inspected: 12 files plus 2 directory entries; no source maps, secrets, test fixtures, store-preview harness or remote code.
- [x] Final `dist/` loaded in a clean Chrome 154 profile: service worker `0.7.0`, no Moodlens runtime errors, EN/ID onboarding and initial dashboard fit 320px without overflow (`docs/releases/v0.7/RELEASE_EVIDENCE.md`).
- [x] Security review (`prompts/SECURITY_REVIEW_PROMPT.md`) with no open Critical/High (`docs/releases/v0.7/SECURITY_REVIEW.md`; v0.9 incl. AI: `docs/releases/v0.9/SECURITY_REVIEW.md`).
- [ ] Manual QA in `docs/09_TEST_PLAN.md` on 3 sites.
- [x] Beta QA evidence ledger, anonymous ten-tester cohort, P0/P1 definitions and seven-day reset rule prepared (`docs/releases/v0.7/BETA_QA_RUNBOOK.md`).
- [x] Accessibility and 320px layout pass: axe 0 violations, keyboard walk, AA token contrast test, no overflow at 320 px (`docs/releases/v0.9/ACCESSIBILITY.md`). Manual screen reader session still recommended.
- [~] EN/ID parity test green; agent Indonesian pre-review done (`docs/releases/v0.9/I18N_REVIEW.md`); native speaker review open (owner).
- [x] AI study ships behind the `MOODLENS_AI` build flag (D-007); the default build includes it and the listing describes it. Performance pass: `docs/releases/v0.9/PERFORMANCE.md`.

## Packaging and publishing

- [x] `npm run release:zip` runs the full gate, validates the manifest and creates a verified ZIP with `manifest.json` at its root.
- [x] Post-security-review candidate recorded with source commit, contents, size and SHA-256 (`docs/releases/v0.7/RELEASE_EVIDENCE.md`).
- [ ] Upload, set visibility (unlisted for beta, public for v1.0).
- [~] Release notes are in `CHANGELOG.md`; final `v0.7.0` tag waits for the post-security-review ZIP and owner publication decision.
- [x] GitHub Issues templates for bug report, beta feedback and site compatibility report.
