# PRD-008 — Tasks, Deadlines, Attendance Insight and Reminders

**Features:** ML-014, ML-015, ML-005, ML-011. **Priority:** P0 (ML-014, ML-015), P1 (ML-005, ML-011). **Release:** v0.4. **Decision:** D-003.

## Job to be done

As a busy student, I see everything due across my courses, sorted by time, and I can get reminders or put deadlines in my calendar.

## Requirements

### Data (ML-014)

- Read-only AJAX client per `docs/04_MOODLE_ADAPTER.md` §2 and `docs/06_SECURITY_PRIVACY.md` §4.
- Fetch on: student opens an enabled site page (at most once per 15 minutes per site) or presses Refresh.
- Normalize into `Task` (`docs/03_ARCHITECTURE.md`). Keep `source`.
- DOM fallback from the timeline/calendar block if AJAX is unsupported.

### Tasks view (ML-015)

- Groups: Overdue, Today, This week, Later, No date.
- Filter by site, course, type. Search by title.
- Each item: title, course, due time (relative + absolute), status, open-in-Moodle button.
- Last updated time and data source per site.
- Export selected or all tasks to `.ics` (RFC 5545), generated locally and saved by the student.

### Attendance (ML-005)

- Show attendance items only when they appear in Moodle data with real timestamps.
- States: open, closed, unknown. Never derive windows by assumption.
- Stays Blocked until a fixture proves the data source.

### Reminders (ML-011)

- Off by default. Turning on requests optional `notifications`.
- Student chooses lead times (for example 1 day, 3 hours).
- `alarms` scheduled from stored tasks; recreated on startup; cleared when the task is done or removed.
- Notification text contains title and course only.

## Acceptance criteria

1. Tasks match Moodle's own timeline block on 3 test sites (manual QA).
2. Network inspection shows only allowlisted function names; zero write functions.
3. `sesskey` never appears in storage, messages or logs (test with spy on storage and messaging).
4. Unsupported AJAX falls back to DOM and the UI shows the source.
5. Overdue logic and timezone display are correct across a DST/timezone test set.
6. `.ics` file imports into Google Calendar and Apple Calendar without errors.
7. Reminders fire at the chosen lead time after a browser restart.
8. All strings EN/ID.

## Out of scope

Background fetching when no LMS tab is open, grade data, submission status beyond what timeline exposes.
