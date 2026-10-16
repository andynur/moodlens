# PRD-002 — Course Activities and Completion

**Features:** ML-002, ML-003. **Priority:** P0. **Release:** v0.2 (DOM), extended by AJAX in v0.4.

## Job to be done

As a student in a course, I see a clean list of activities and whether each one is complete, incomplete or unknown.

## Requirements

- Parse the visible course page (DOM fallback, `docs/04_MOODLE_ADAPTER.md` §3); from v0.4 prefer AJAX completion data when available.
- Group activities by section when section data exists.
- Show type, title, completion, data source and freshness.
- Missing data is `unknown`, never `complete`.
- Open an activity only on explicit click.

## Acceptance criteria

1. Sanitized SiberMu fixture yields the expected activities, types and statuses.
2. "Mark as not done" and `data-toggletype="manual:undo"` map to `complete`.
3. `.accesshide` text is stripped from titles.
4. Wrong-origin links dropped; duplicates suppressed; activity count capped at 200.
5. Unknown completion displays `Unknown` / `Belum diketahui`.
6. Missing course heading stores `null` and the UI shows a localized fallback.
7. Every inferred selector is documented as verified or unverified in `docs/04_MOODLE_ADAPTER.md`.

## Deferred

Restriction explanations ("why is this locked") until fixtured; grades.
