# v0.9 Accessibility Pass

Date: 2026-10-20
Target: WCAG 2.2 AA for the side panel (keyboard, names and roles, contrast, reflow at 320 px). Automated tools catch only part of WCAG; a pass with a real screen reader (VoiceOver or NVDA) by a person is still open.

## Method

- Real `dist/` loaded unpacked in headless Chrome 154 over CDP, opened in the real side panel, synthetic site and data only (scratchpad harness, not in the repo).
- Screens: onboarding, empty Today, Today, Tasks, Courses, course detail, Study (empty and with a deck), Settings. Each in EN, ID and dark (EN).
- Per screen: axe-core 4.10.2 (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`), a check that every focusable element has an accessible name, no positive `tabindex`, `lang` matches the locale, and a Tab walk through every focusable element checking that each shows a focus indicator.
- AI study screens (answer, consent) and the Practice review were audited the same way in `store-preview.html`, which renders the real components with synthetic data and a synthetic PDF.
- Reflow: the same screens at 320 px wide, checking that no element extends past the viewport.

## Findings and fixes

| # | Finding | Fix |
|---|---|---|
| A-01 | Tertiary text (`--color-ink-3` `#787671`) was 4.16:1 on the page surface, below 4.5:1 (footer, hints, "last updated" lines; 2–3 nodes per screen in light mode). | Light `ink-3` is now `#6b6964` (≥ 4.54:1 on surface and every soft tint). |
| A-02 | Dark `ink-3` (`#8c8981`) was 4.33:1 on `well` and 4.23:1 on `accent-soft`; found by the new token test, not by axe. | Dark `ink-3` is now `#95928a` (≥ 4.75:1). |
| A-03 | Study page skipped a heading level: the AI study card title was `h3` directly under the `h1`. | The AI study card title is `h2`, a sibling of "Flashcards". |
| A-04 | The consent screen's exact-text box scrolls but could not be reached by keyboard, so keyboard users could not read all of what they agree to send. | The box is focusable (`tabIndex=0`) and named after its label. |
| A-05 | Screen readers were not told when a PDF had scanned or unreadable pages, when the answer was "insufficient evidence", or when an answer or cards arrived. | Those notices are `role="status"`; a hidden status line says "Answer ready." / "Jawaban siap." or "Generated cards" when a result arrives. |
| A-06 | The deck select next to "Save selected to deck" had no name. | `aria-label` "Deck for the selected cards" / "Dek untuk kartu yang dipilih". |

## Result after fixes

- axe: 0 violations on all 27 side panel runs (9 screens × EN/ID/dark) and on the six preview runs (AI answer, consent, Practice × EN/ID).
- Every focusable element has a name; no positive `tabindex`; `lang` is `en` or `id` to match the locale.
- Tab walk: every focused element shows the 2 px focus ring.
- 320 px: no element wider than the viewport on any of the 27 runs.
- Motion: `prefers-reduced-motion` turns transitions off (`src/sidepanel/styles.css`).
- Regression test: `tests/sidepanel-contrast.test.ts` checks every text/background token pair at 4.5:1 in light and dark.

## Open

- Manual screen reader session (VoiceOver on macOS or NVDA on Windows) through onboarding, Tasks, a review and the AI consent flow. Owner or tester task.
- Moodle pages themselves are out of scope; theme presets have their own contrast tests (`tests/appearance.test.ts`).
