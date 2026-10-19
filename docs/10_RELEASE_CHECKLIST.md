# Release Checklist — Chrome Web Store

Use for v0.7 (closed beta, unlisted or trusted testers) and v1.0 (public). Items marked **(v1.0)** may stay open for beta.

## Product and legal

- [x] Moodle trademark policy reviewed for the name "Moodlens" and the tagline; permission or fallback name ready (D-001). High risk without written permission; the BelajarLens fallback package and activation steps are in `docs/releases/v0.7/TRADEMARK_REVIEW.md`.
- [x] Listing body describes only shipped features; unshipped AI is labeled “not included in this beta” (`docs/releases/v0.7/STORE_LISTING.md`). Screenshot verification remains with the asset item below (D-001).
- [x] No university names or logos implying affiliation; the bilingual listing and always-visible UI copy use the independent-project disclaimer.
- [~] Privacy policy page prepared in EN and ID (`PRIVACY.md`); publication waits for the local commits to be pushed to the already-public repository.
- [~] "What we never do" page prepared in EN and ID (`WHAT_WE_NEVER_DO.md`); publication waits for push.
- [x] Open-source license chosen and added (`LICENSE`, MIT).

## Store listing

- [x] Single-purpose description: local-first study companion for Moodle course sites the student enables.
- [x] Short and long description in EN; ID listing translation (`docs/releases/v0.7/STORE_LISTING.md`).
- [ ] Icons 16/32/48/128 and store icon 128; promo tile 440×280.
- [ ] At least 3 screenshots 1280×800 (Today, Tasks, Practice), no real student data.
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
- [x] optional AI provider hosts: not declared because AI does not ship in v0.7.

## Engineering

- [ ] CI green on the release tag; lockfile committed; `npm audit` reviewed.
- [ ] Version in `package.json`, manifest and UI match.
- [ ] `dist/` inspected: no source maps with secrets, no test fixtures, no remote code.
- [ ] Security review (`prompts/SECURITY_REVIEW_PROMPT.md`) with no open Critical/High.
- [ ] Manual QA in `docs/09_TEST_PLAN.md` on 3 sites.
- [ ] Accessibility and 320px layout pass. **(v1.0)**
- [ ] EN/ID parity test green; native speaker review. **(v1.0)**
- [ ] AI features either pass PRD-004 gates or are disabled by build flag (D-007).

## Packaging and publishing

- [ ] `npm run build` then zip the contents of `dist/` (manifest at zip root).
- [ ] Upload, set visibility (unlisted for beta, public for v1.0).
- [ ] Release notes in `CHANGELOG.md`; git tag `vX.Y.Z`.
- [ ] GitHub Issues templates for bug report and site compatibility report. **(v1.0)**
