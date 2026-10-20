# Pre-release Notes

These items are intentionally deferred while product features are completed. They are not evidence that the corresponding behavior has passed. Resolve and record every applicable item before the first official public release.

## Product and legal

- Decide the public product name: retain **Moodlens** only with written Moodle trademark permission, or activate the documented **BelajarLens** fallback (`docs/releases/v0.7/TRADEMARK_REVIEW.md`).
- Push the prepared bilingual privacy policy, "What we never do" page and lecturer guide to the public repository.
- Update the store listing and screenshots for the final shipped feature set, including accurate AI availability and data-flow disclosures.

## Store and distribution

- Run CI from the final release tag and retain the result.
- Build a fresh release ZIP from the final source, compare its manifest and permissions, record its SHA-256 checksum, and upload that exact file.
- Complete Chrome Web Store privacy-practice and Limited Use certifications, choose the intended visibility, submit for review, and record approval.
- Publish final release notes and create the final version tag only after the uploaded artifact is fixed.

## Live compatibility and safety evidence

- Run the full manual test plan on at least three authorized Moodle sites; compare deadlines with Moodle and triage every finding.
- Inspect live network traffic for allowlisted read-only `service.php` calls and zero LMS writes.
- Verify optional host and notification permission prompts, reminder delivery after a Chrome restart, and ICS import in Google Calendar and Apple Calendar.
- Capture sanitized Moodle fixtures for an attendance event and for finished quiz attempt/review pages; verify the assessment guard and Practice selectors against them.
- Recheck the appearance controls on a second Moodle theme and complete all remaining rendered 320 px screens.

## Release acceptance

- Accessibility pass and EN/ID native-speaker review: done in v0.9 (owner, a native speaker, accepted the Indonesian text on 2026-10-20). A manual screen reader session is still recommended.
- Moved from the v0.8 exit gate (owner decision 2026-10-20): accept the Chrome host-permission prompt on Continue once by hand; run OpenAI and at least one OpenAI-compatible provider with a real key; decide whether to list providers not run with a real key.
- Recruit at least ten opt-in testers, keep only privacy-safe evidence, and resolve all P0/P1 findings.
- Start the stability clock only after the final candidate and tester/site prerequisites are in place; require seven consecutive days with no open P0/P1 issue before public release.
