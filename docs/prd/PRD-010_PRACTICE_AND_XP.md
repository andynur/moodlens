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
- Scheduler (`src/shared/srs.ts`): FSRS-5 default weights, day-based scheduling (no learning steps, no fuzz), requested retention 0.7–0.97 (default 0.9). Reference: ts-fsrs 4.7.1 with `enable_short_term: false, enable_fuzz: false`. Queue: due cards by due day, then up to 20 new cards.
- Import/export (`src/shared/cards.ts`): JSON `{ format: "moodlens-cards", version: 1 }` or CSV `deck,front,back,source`. Exports only student-authored cards, without scheduling. Imports are size-limited, https-only sources, and always start fresh as student cards. CSV cells that start with `= + - @` get a leading quote against spreadsheet formulas.

### Practice from closed reviews (ML-020)

- On `/mod/quiz/review.php` with finished-attempt evidence, offer "Save questions I got wrong to a deck".
- Save question text and the correct answer **only as shown on the review page**. Strip images or store local references only.
- Quiz-derived cards are flagged; excluded from export and backup; never synced or shared (D-009).
- Capture logic: `src/content/moodle/quiz-review.ts` (rules in `docs/04_MOODLE_ADAPTER.md` §4) and `newQuizReviewCard` in `src/shared/cards.ts`; tests in `tests/quiz-review.test.ts` (AC 2).

### Local XP (ML-021)

- Events: card reviewed, review session completed, practice session completed, focus session completed, task opened at least 3 days before due.
- Never: Moodle completion toggles, page views alone, opening the panel.
- Daily cap to discourage farming.
- Levels, daily streak with one "freeze" per week, weekly goal set by the student.
- Clearly labeled "Moodlens XP — not your Moodle grade".

#### XP rules (implemented in `src/shared/xp.ts`, tested in `tests/xp.test.ts`)

| Event | XP |
|---|---|
| Card reviewed | 2 |
| Review session completed | 10 |
| Practice session completed | 15 |
| Focus session completed | 10 |
| Task opened ≥ 3 days before due (once per task) | 10 |

- Daily cap: 150 XP per local day; the last event is cut to the remainder. A capped event still counts for the streak.
- Days follow the student's IANA time zone; weeks start Monday.
- Streak: +1 per consecutive local day with a study event. One missed day is bridged by the weekly freeze (one per week of the missed day); two or more missed days reset it to 1.
- Levels: total XP to reach level n is `50 × n × (n − 1)` (100, 300, 600, 1000, …).
- Weekly goal: whole number 0–5000 set by the student; 0 means no goal. Daily totals kept for 14 days.

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
