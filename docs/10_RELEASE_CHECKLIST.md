# Release Checklist — Chrome Web Store

Use for v0.7 (closed beta, unlisted or trusted testers) and v1.0 (public). Items marked **(v1.0)** may stay open for beta.

## Product and legal

- [ ] Moodle trademark policy reviewed for the name "Moodlens" and the tagline; permission or fallback name ready (D-001).
- [ ] Listing body and screenshots describe only shipped features; unshipped AI features labeled "coming soon" (D-001).
- [ ] No university names or logos implying affiliation; "Independent project" disclaimer in UI and listing.
- [ ] Privacy policy page published (GitHub Pages or repo) in EN and ID.
- [ ] "What we never do" page published.
- [ ] Open-source license chosen and added (`LICENSE`).

## Store listing

- [ ] Single-purpose description: study companion for Moodle course pages the student enables.
- [ ] Short and long description in EN; ID listing translation.
- [ ] Icons 16/32/48/128 and store icon 128; promo tile 440×280.
- [ ] At least 3 screenshots 1280×800 (Today, Tasks, Practice), no real student data.
- [ ] Category: Education.
- [ ] Privacy practices tab matches `docs/06_SECURITY_PRIVACY.md` §2 data inventory.
- [ ] Limited Use certification checked truthfully.

## Permission justifications (paste into dashboard)

- [ ] `storage`: save preferences and study data locally.
- [ ] `sidePanel`: show the study companion next to the course.
- [ ] `scripting`: run the course reader only on Moodle sites the student enables.
- [ ] `alarms`: local deadline reminders.
- [ ] optional `notifications`: show reminders when the student turns them on.
- [ ] optional host `https://*/*`: requested for one Moodle site at a time after the student clicks "Enable".
- [ ] optional AI provider hosts (if AI ships): requested when the student chooses a provider.

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
