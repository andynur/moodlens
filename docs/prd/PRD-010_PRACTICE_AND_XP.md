# PRD-010 — Assessment Guard, Flashcards, Practice and Local XP

**Features:** ML-022, ML-019, ML-020, ML-021, ML-026. **Priority:** P0 (ML-022), P1 (ML-019–021), P2 (ML-026). **Release:** v0.6. **Decisions:** D-006, D-009.

## Job to be done

As an exam preparer, I practice and review my own mistakes with spaced repetition, and I stay motivated with streaks and goals, without any help during live assessments.

## Build order

1. ML-022 guard. 2. IndexedDB store. 3. ML-019 decks. 4. ML-020 review capture. 5. ML-021 XP. 6. ML-026 if time allows.

## Requirements

### Assessment guard (ML-022)

- Rules in `docs/04_MOODLE_ADAPTER.md` §4. Fail-closed.
- When active: panel shows a localized "Study help is paused during an active assessment" banner; Practice capture and AI are disabled.
- Guard state computed in the content script and validated in background.

### Flashcards (ML-019)

- Decks per course; cards with front, back, optional source link to a Moodle activity.
- Student-authored cards; import/export of user-authored cards as CSV/JSON.
- Spaced repetition scheduling (FSRS-style); daily review queue; ratings Again/Hard/Good/Easy.
- Data in IndexedDB per site.

### Practice from closed reviews (ML-020)

- On `/mod/quiz/review.php` with finished-attempt evidence, offer "Save questions I got wrong to a deck".
- Save question text and the correct answer **only as shown on the review page**. Strip images or store local references only.
- Quiz-derived cards are flagged; excluded from export and backup; never synced or shared (D-009).

### Local XP (ML-021)

- Events: card reviewed, review session completed, practice session completed, focus session completed, task opened at least 3 days before due.
- Never: Moodle completion toggles, page views alone, opening the panel.
- Daily cap to discourage farming.
- Levels, daily streak with one "freeze" per week, weekly goal set by the student.
- Clearly labeled "Moodlens XP — not your Moodle grade".

### Focus and notes (ML-026, P2)

- Pomodoro-style timer per course; awards focus XP.
- Plain-text notes per activity, local only.

## Acceptance criteria

1. Guard tests cover every path and state listed in the adapter spec; guard defaults to active on parse errors.
2. Review capture is unavailable on attempt pages and unfinished reviews (test).
3. No quiz-derived content in exports, backups, messages to providers or logs (test).
4. SRS intervals match reference implementation for a fixed rating sequence.
5. XP rules unit-tested, including daily cap and streak rollover across timezones.
6. All strings EN/ID; animations respect reduced motion.

## Out of scope

Sharing decks, leaderboards, Level Up! plugin display (post-v1).
