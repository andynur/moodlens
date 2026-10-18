# Moodle Adapter Specification (DOM, AJAX, detection, guard)

All Moodle-specific knowledge lives in `src/content/moodle/`. UI and background code must never use raw selectors or Moodle function names.

## Verified vs unverified

| Item | Status |
|---|---|
| SiberMu origin and course path `/course/view.php?id=` | **Verified** (fixtures `sibermu-2026-10`, 4 courses) |
| Course page markup on SiberMu | **Verified** from fixtures; see "SiberMu observations" below |
| AJAX function availability per site | **Unverified**; must be feature-detected |
| Level Up! XP plugin (`block_xp`) on SiberMu | **Present** in raw captures (block outside `#region-main`, removed from fixtures); student-visible data **unverified** |
| `mod_attendance` on SiberMu | **Present** (`modtype_attendance`, 16 per course in 3 of 4 courses) |
| Attendance events in calendar/timeline | **Unverified** |
| Activity due dates on course page | **Absent** on SiberMu (`[data-region="activity-dates"]` = 0); deadlines need AJAX/timeline (D-003) |

## SiberMu observations (fixtures `tests/fixtures/sibermu-2026-10/`, captured 2026-10-16)

- Body: `#page-course-view-topics`, classes `format-topics pagelayout-course lang-en uses-drawers edw-m405`. The `edw-` prefix and `.instructor-info` / `.dashboard-bar-wrapper` header suggest the Edwiser RemUI theme (inference, not confirmed).
- Activities: `li.activity.modtype_<name>` with `data-for="cmitem"`, inner `.activity-item[data-activityname]`. Name in `.activityname > .instancename` with an `.accesshide` type suffix (" File", " Forum"). The parser strips the suffix (since 2026-10-16).
- Module types seen: resource, url, assign, quiz, forum, attendance, label, page, folder, book, feedback.
- **Locked activities have no `/mod/…/view.php` link** (93 of 321 non-label activities across 4 courses). The current parser drops them; v0.2 should list them as restricted.
- Restriction notes: `.availabilityinfo` ("Not available unless: …", partly custom Indonesian text "Anda harus menyelesaikan …").
- Completion, automatic: `.completion-dropdown` button with text "To do" (120 seen). Completion, manual: `button[data-action="toggle-manual-completion"][data-toggletype="manual:mark-done"]` with text "Mark as done" (38 seen).
- **No completed activity exists in the fixtures** (no "Done" or `manual:undo`). A capture with completed items is still needed to verify the `complete` mapping.
- Section titles: `.sectionname` / `[data-for="section_title"]` inside `li.section.course-section` with `data-number`, `data-id`; header `.course-section-header`.
- Bulk-edit labels `label[for^="cmCheckbox"]` / `label[for^="sectionCheckbox"]` exist in the DOM even for students.
- Dashboard `/my/` (`dashboard.html`, `#page-my-index`, `pagelayout-mydashboard`): blocks in `#region-main` are `myoverview`, `timeline`, `completion_progress`, `edwiseradvancedblock`; side blocks `myprofile`, `course_list`, `online_users`.
  - **Timeline is loaded by AJAX after page load.** Captured HTML has an empty, hidden `[data-region="event-list-content"]`, and `[data-region="event-list-container"]` has `data-days-limit="7"` and `data-midnight`. The site frontend therefore calls the timeline AJAX function, which is strong evidence that `core_calendar_get_action_events_by_timesort` is available to students (still verify in v0.4). DOM fallback from the timeline block is **not reliable**.
  - My Overview cards: `.dashboard-card[data-region="course-content"][data-course-id]`, course name in `.coursename .multiline`, progress bar with `aria-valuenow`, plus text "0 out of N activities completed".
  - **Completion Progress block** (third-party plugin `block_completion_progress`) is installed: one `.barContainer` per course, cells `.progressBarCell.<state>` (seen: `futureNotCompleted`; plugin also uses completed/notCompleted/submittedNotComplete/failed), details in `.progressEventInfo` with status text such as "Not completed". It is a cross-course progress source without AJAX (candidate for v0.4/v0.5).
  - Level Up! XP block is **not** on the dashboard; it appears on course pages only.
- My courses `/my/courses.php` (`my-courses.html`, `#page-my-index.page-mycourses`, `pagelayout-mycourses`): only the `myoverview` block. Same card markup as the dashboard. `[data-region="courses-view"]` carries `data-display="card"`, `data-grouping="all"`, `data-sort="fullname"`, `data-paging="12"` and `data-totalcoursecount="20"` while only 4 cards render (why 20 is **unverified**: maybe hidden or past enrolments). Moodle renders these cards from `core_course_get_enrolled_courses_by_timeline_classification` in standard 4.x (not confirmed on SiberMu); the DOM is a usable fallback for course list and progress.
- Parser result on fixtures (2026-10-16): 17/17, 95/95, 92/94, 115/115 non-label activities; 91 restricted (no link). The 2 misses in course-3 are folders displayed inline (`.noname-grid`, no link, no `.instancename`). Completion: 148 `incomplete`, 171 `unknown`, 0 `complete`. Activities with a link to an unlisted module are still dropped (`isActivityUrl` allowlist).

Update this table whenever a fixture or live QA confirms or rejects an item. Record site variant, Moodle version, theme and date, never personal data.

## 1. Moodle detection (v0.3) — `detect.ts`

Detection runs only on an origin the student has granted. Flow: the student clicks "Enable on this site" in the side panel, the extension calls `chrome.permissions.request` for that origin, then runs `detect.ts` once with `chrome.scripting.executeScript`. If the page is not Moodle, the panel says so and offers to revoke the permission. Whether `activeTab` can be used for a pre-permission check while `openPanelOnActionClick` is on is unverified; test it in v0.3 before relying on it.

Candidate signals (combine at least two):

- `body` id or class starting with `page-` and classes like `pagelayout-*`, `course-<id>`.
- Presence of `/theme/` or `/lib/javascript.php` or `/theme/yui_combo.php` script URLs.
- Logout link containing `/login/logout.php?sesskey=`.
- `meta[name="keywords"]` containing `moodle` (weak signal).

Return `{ isMoodle: boolean, confidence: 'high' | 'low' | 'none', versionHint?: string }`. Low confidence shows a warning; the student can still enable. `none` shows "not detected" with a remove action.

Implemented 2026-10-18 (`detect.ts`, D-013). Scoring: 2+ strong signals = high, 1 strong or 2 weak = low, else none. Strong: `body#page-*` + `pagelayout-*`; `path-*` + `context-<n>` classes; Moodle asset URLs (`/lib/javascript.php/`, `/lib/requirejs.php/`, `/theme/yui_combo.php`, `/theme/styles.php/`, `/theme/image.php/`); logout link selector. Weak: `#region-main`, keywords meta. `versionHint: '4.x'` from `uses-drawers`.

| Signal | Status |
|---|---|
| Body layout and context classes | **Verified** on SiberMu fixtures (course, dashboard, my courses) |
| `/theme/image.php/` asset URL | **Verified** on SiberMu dashboard fixture |
| Other asset URLs, logout link, keywords meta | **Unverified** (stripped from sanitized fixtures) |
| `uses-drawers` = Moodle 4.x | **Inference**; unverified on non-Boost themes |
| Any second Moodle 4.x site | **Unverified**; needed for the v0.3 exit gate |

## 2. Read-only AJAX client (v0.4) — `ajax.ts` (D-003)

Endpoint: `POST <origin>/lib/ajax/service.php?sesskey=<sesskey>&info=<methodname>`, body is a JSON array of `{ index, methodname, args }`. Requests are same-origin from the content script; the browser attaches the student's session cookie. The extension never reads the cookie.

Allowlist (candidates; verify each per site and Moodle version):

| Function | Purpose | Fallback |
|---|---|---|
| `core_course_get_enrolled_courses_by_timeline_classification` | Enrolled courses, progress | Dashboard DOM / course list page |
| `core_calendar_get_action_events_by_timesort` | Upcoming and overdue actions with timestamps | Timeline block DOM |
| `core_calendar_get_action_events_by_course` | Per-course actions | Same |
| `core_course_get_contents` | Sections and modules (often not AJAX-enabled) | Course page DOM parser |
| `core_completion_get_activities_completion_status` | Completion per activity (may not be AJAX-enabled) | DOM completion parser |

Rules:

1. Function names are a typed constant union; unknown names fail to compile.
2. A guard rejects any name matching `/(update|set|create|delete|submit|save|toggle|mark|process|add|remove)/i`.
3. `sesskey` source: logout link or `input[name="sesskey"]` in the current DOM, read at call time. Never stored, messaged or logged.
4. Error response with `exception` or `errorcode` marks the function unsupported for this site for 24 hours; fall back to DOM.
5. Rate limit per site; response size cap; timeout 10 s.
6. Validate response shape, then map to `Course`, `Task`, `CompletionRecord` (see `docs/03_ARCHITECTURE.md`). Drop unknown fields.

## 3. DOM parser — `adapter.ts`

Policy:

1. Parse only course pages of enabled sites while the student is viewing them.
2. Ignore profile, messages, gradebook, private files, participants.
3. Course name from visible heading; if missing, store `null` and let UI show a localized fallback.
4. Recognize known module paths; unknown modules become type `unknown` with a safe URL, not silently dropped (decision needed in v0.2 fixture work).
5. Completion `complete` / `incomplete` only on clear evidence; else `unknown`.
6. Dedupe by module path + numeric id.
7. Throttle MutationObserver; cap activities at 200.

Candidate selectors (Moodle 4.x conventions, unverified):

```text
Course heading:     .page-header-headings h1, #page-header h1, h1
Activities:         li.activity, .activity-item
Activity link:      a[href*="/mod/"][href*="/view.php"]
Activity name:      .instancename (strip .accesshide), .activityname
Completion region:  [data-region="activity-information"], [data-region="completion-info"], .activity-completion
Manual toggle:      button[data-action="toggle-manual-completion"] with data-toggletype
                    ("manual:mark-done" = currently incomplete, "manual:undo" = currently complete)
```

Known pitfalls to test:

- Text "Mark as not done" means the activity **is** complete; it contains "not done".
- `.accesshide` spans append the module type to the link text (for example "Reading File").
- Localized Moodle strings differ per site language pack; prefer attributes over text.

## 4. Assessment guard (v0.6) — `guard.ts`

Fail-closed: if unsure, treat the page as an active assessment.

Block AI, practice capture and answer-related UI when any is true:

- Path matches `/mod/quiz/(attempt|startattempt|processattempt|summary)\.php`.
- Path is `/mod/quiz/review.php` but the review page shows the attempt is not finished, or required markers are missing.
- Page contains a running timer region or Safe Exam Browser markers.
- `/mod/assign/view.php` with an open editing form (`action=editsubmission`).
- Any `/mod/lesson/` or `/mod/h5pactivity/` attempt state (until fixtured).

Allow practice capture only on `/mod/quiz/review.php` with finished-state evidence (D-009).

## 5. Appearance (v0.5) — `appearance.ts`

Opt-in per site. Inject a single `<style id="moodlens-appearance">` element; remove it on disable. CSS only, no DOM rewriting of Moodle controls.

## Sanitized fixture process

1. Open an enrolled course in your own account.
2. Save a minimal excerpt: one section, at least five activity types, manual and automatic completion.
3. Remove names, emails, IDs, `sesskey`, tokens, comments, grades; replace with synthetic labels.
4. Save as `tests/fixtures/<site-variant>/course.html` (and `ajax-<function>.json` for AJAX responses).
5. Add a `README.md` per variant: Moodle version, theme, language, capture date.
6. Write tests for complete, incomplete, unknown, missing heading, restricted activity, malformed link.

## Rejected behaviors

Numeric DOM ids as selectors, crawling all courses, forcing completion, bypassing restrictions, assuming `mod/resource/view.php` is a direct file link, any non-allowlisted AJAX function.

## Open questions

- Moodle version and theme of SiberMu.
- Which allowlisted functions are AJAX-enabled on SiberMu and on demo sites.
- How attendance (mod_attendance) sessions appear for students.
- Whether quiz review is enabled after close on typical courses.
