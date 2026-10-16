# PRD-011 — Chrome Web Store Beta and Public Release

**Feature:** ML-025. **Priority:** P0. **Release:** v0.7 (closed beta), v1.0 (public). **Decision:** D-001.

## Outcome

Moodlens is approved on the Chrome Web Store, first for beta testers, then publicly, with honest privacy disclosures.

## Requirements

- Name "Moodlens" after trademark review (D-001); icons, screenshots, promo tile.
- Listing text EN (primary) and ID, following value pillars in `docs/15_COMPETITIVE_POSITIONING.md`.
- Privacy policy and "what we never do" pages in EN and ID, hosted publicly (GitHub Pages).
- Permission justifications from `docs/10_RELEASE_CHECKLIST.md`.
- Public GitHub repository with `LICENSE`, `CONTRIBUTING.md`, issue templates (bug, site compatibility).
- Beta feedback form (opt-in, no telemetry).
- Lecturer guide (one page) explaining integrity safeguards.
- Release script: build, verify manifest version, zip `dist/`.

## Acceptance criteria

1. Beta (unlisted or trusted testers) approved by store review.
2. At least 10 beta testers on at least 3 Moodle sites.
3. No open P0/P1 bugs for 7 days before going public.
4. `docs/10_RELEASE_CHECKLIST.md` fully checked for v1.0.
5. v1.0 tag, CHANGELOG entry and public listing live.
