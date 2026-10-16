# Traceability: Original Plans vs Current Design

The project started from a user-supplied PRD ("SiberMu Learning Companion") and a developer prompt. Those originals are referenced as `references/original/`, but that folder is **not present in this repository**. Add them there if they should be preserved.

## Preserved from the original plan

- Chrome MV3 side panel with React, Tailwind, Vite, TypeScript.
- Student focus on Moodle activity types: resource, quiz, attendance, forum, assignment.
- Progress and XP aspiration, material downloads, BYOK AI (OpenAI/Gemini/local) for summaries and practice.

## Changed by design review (see `docs/14_DECISIONS.md`)

| Original idea | Current design | Decision |
|---|---|---|
| "Moodle Mu Agent", then "MuLearn Agent" | Final name "Moodlens", tagline "All in One Moodle AI Agent for Student" | D-001 |
| Single site `solusi.sibermu.ac.id` | Any Moodle site the student enables; SiberMu is the first verified site | D-002 |
| DOM scraping only | Read-only AJAX first, DOM fallback | D-003, D-004 |
| Prerequisite Unlocker / auto-complete | Read-only explanation; no LMS writes | permanent non-goal |
| Hardcoded 7-day attendance window | Attendance only from verified Moodle data | PRD-008 |
| XP from Level Up! plugin | Local Moodlens XP for study actions; plugin display post-v1 | D-006 |
| API key in `chrome.storage.local` | Session-scoped BYOK with forget control | `docs/06_SECURITY_PRIVACY.md` §6 |
| Download manager early | Post-v1 (crowded market) | D-008 |
| AI as a core phase | AI behind a v1 cut line | D-007 |

## Open assumptions

No authenticated course HTML has been fixtured yet. All site-specific selectors and AJAX availability are provisional until recorded in `docs/04_MOODLE_ADAPTER.md`.
