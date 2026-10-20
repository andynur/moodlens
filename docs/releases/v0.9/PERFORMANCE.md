# v0.9 Performance Pass

Date: 2026-10-20
Scope: side panel open time, package size, and storage size caps. Measured on the owner's Mac (Apple silicon) with Chrome 154 headless; numbers on a low-end laptop will be higher.

## Panel open time

- Method: real `dist/` loaded unpacked over CDP, real side panel, synthetic site with 50 tasks, 3 courses and a course snapshot, Indonesian locale. Ten reloads; time from navigation start until the Today cards are in the DOM (scratchpad harness, not in the repo).
- Result: median **154 ms**, p90 154 ms; DOMContentLoaded 11 ms; JS heap 16.7 MB after ten reloads.
- PDF.js (430 KB) and its worker (1.26 MB) are a separate chunk loaded by `import()` only when the student picks a PDF (`src/sidepanel/pdf.ts`); `sidepanel.html` loads only the side panel bundle and stylesheet.
- Budget for later releases: Today visible within 500 ms on this machine. No change needed now.

## Package size

| File | Bytes | Gzip |
|---|---:|---:|
| `assets/sidepanel-*.js` (React, UI, strings) | 374,536 | 114,834 |
| `assets/sidepanel-*.css` | 28,322 | 6,269 |
| `assets/pdf-*.js` (lazy) | 430,261 | 128,162 |
| `assets/pdf.worker.min-*.mjs` (lazy) | 1,264,342 | 376,488 |
| `background.js` | 146,223 | 37,719 |
| `content.js` | 30,219 | 8,334 |
| `appearance.js` + `.css` | 9,755 | 3,514 |
| Total `dist/` | 2,287,994 | |

`background.js`, `content.js` and `appearance.js` are built unminified on purpose (`scripts/build-extension.mjs`), so Chrome Web Store reviewers can read them; minified they would be about 40 % smaller, which does not change load time noticeably for a local file.

## Storage caps

`chrome.storage.local` has a 10 MB quota without `unlimitedStorage`, which Moodlens does not request.

| Data | Cap | Where |
|---|---|---|
| Sites | 20 | `MAX_SITES`, `src/shared/sites.ts` |
| Course records | 50 courses per site, 2 snapshots per course, 200 activities per snapshot, **and now 1,000,000 serialized characters per site** | `src/shared/courses.ts`, `src/shared/validation.ts` |
| Tasks | 500 tasks, 200 courses per site dataset; replaced on each capture | `src/shared/validation.ts` |
| Decks / cards / review logs (IndexedDB) | 200 / 10,000 / 50,000 per site; logs pruned by retention (90/365/730 days) | `STUDY_LIMITS`, `src/shared/cards.ts` |
| Notes (IndexedDB) | 2,000 per site, 5,000 characters each | `src/shared/focus.ts` |
| PDF for AI | 30 MB, 400 pages, 1.5 M characters; panel memory only | `src/shared/ai/documents.ts` |

**Fixed:** before this pass, one site's course records had a count cap only. At the limits (50 courses × 2 snapshots × 200 activities with long titles) they could reach about 10 MB, the whole quota, after which every later write (tasks, settings, XP) would fail. `addSnapshot` now also drops the least recently captured courses once the site's records pass 1,000,000 serialized characters; the course just captured always stays (`tests/courses.test.ts`).

**Accepted:** the theoretical sum over 20 sites can still pass 10 MB. Measured usage with the synthetic site above is 13 KB; a real student with a few sites stays far below. A write that exceeds the quota fails inside the message handler and returns `{ ok: false }`, keeping the previous data.
