# PRD-009 — Today Dashboard, Personalization, What's New, Appearance

**Features:** ML-004, ML-016, ML-017, ML-018, ML-023 (part 2). **Priority:** P0 (ML-004), P1 (others). **Release:** v0.5.

## Job to be done

As a student, I open one screen and immediately know what to do today, what changed, and how I am progressing; and I can make Moodle comfortable to read.

## Requirements

### Today dashboard (ML-004)

- Widgets: Due soon (next 7 days), New since last visit, Course progress, Streak and XP (from v0.6), Quick links to pinned courses.
- Widgets can be shown, hidden and reordered; layout stored locally.
- Empty states explain how to get data (enable a site, open a course).

### Personalization (ML-016)

- Per course: pin, nickname, color tag, hide.
- Hidden courses are excluded from Today and Tasks but kept in data.
- Course colors use an accessible palette (contrast checked in both themes).

### What's new (ML-017)

- Keep the last 2 snapshots per course.
- Diff by activity identity: added, removed, renamed, completion changed.
- Badge per course and a "New since last visit" list; "Mark as seen" is local only (no Moodle write).

### Appearance (ML-018)

- Per-site opt-in: dark mode for Moodle pages, larger font, comfortable line width, reduced clutter (hide blocks the student chooses from a fixed list).
- One packaged stylesheet; inject/remove cleanly.
- Never hide Moodle notices about deadlines, restrictions or academic integrity.
- Theme presets (owner decision 2026-10-20): one optional preset per site from a fixed list — `clean` (neutral surfaces, rounded cards), `sepia` (warm, serif reading) and `contrast` (black on white, underlined links, strong focus ring). Each preset is a set of tokens (`--ml-bg`, `--ml-surface`, `--ml-ink`, `--ml-ink-2`, `--ml-line`, `--ml-accent`, `--ml-on-accent`, `--ml-radius`, `--ml-font`, `--ml-leading`) in the packaged stylesheet; shared rules restyle page background, text, headings, links, primary buttons, cards/blocks and activity rows and add CSS-only spacing. No DOM rewriting, no `display: none`, no third-party brand assets, no rules for alerts or notices, no student-supplied CSS.
- Presets are off on assessment pages: the appearance script judges the address at `document_start` and the page again once the DOM is ready (the ML-022 guard); while the guard is active the preset class is not set. Dark mode, larger text, line width and hidden blocks are unchanged by the guard.

### Backup (ML-023 part 2)

- Export local data to JSON (excludes API keys and quiz-derived cards).
- Import with schema validation and preview.

## Acceptance criteria

1. Today renders under 300 ms from cached data (target) and works at 320px.
2. Personalization persists and never alters Moodle data.
3. Diff tests: add, remove, rename, completion change, unchanged.
4. Appearance toggle is idempotent and fully reversible; tested on 2 themes.
5. Backup round-trip restores the same state; invalid files are rejected with a localized error.
6. All strings EN/ID.
7. Theme presets: choosing and clearing a preset is idempotent and restores the root element exactly; an unknown preset is rejected; the preset is never applied while the assessment guard is active; preset text and link colors reach WCAG AA (4.5:1) on their surfaces.
