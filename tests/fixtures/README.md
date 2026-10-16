# Test fixtures

Only synthetic or sanitized data. Never commit real names, emails, student ids, `sesskey`, tokens, grades, comments or course text.

## Layout

```text
tests/fixtures/<site-variant>/
  README.md             Moodle version, theme, language, capture date (no personal data)
  course.html           sanitized course page
  ajax-<function>.json  sanitized AJAX response (v0.4+)
```

`<site-variant>` example: `sibermu-2026-10`.

## Capture and sanitize

1. Save the course page from your own account (Chrome: Cmd/Ctrl+S, "Webpage, HTML Only") to a folder **outside** this repo.
2. Run:
   ```bash
   npm run fixture:sanitize -- <saved.html> tests/fixtures/<site-variant>/course.html
   ```
   Exit code 0 = clean. Exit code 2 = warnings printed; fix by hand before committing.
3. The script keeps `#page-header` and `#region-main` (or `#page-content` / `body` as fallback). It removes scripts, user menu, avatars, profile links, images and descriptions. It redacts `sesskey`, emails and long numbers. It renames the course, sections and activities to `Sample Course`, `Section N`, `Activity N`, including inside `aria-label`.
4. Review the output manually (search for your name, NIM, lecturer names, email domain).
5. Add `README.md` for the variant from the template below.
6. Delete the raw saved file.

## Variant README template

```markdown
# <site-variant>
- Moodle version: <from footer or "unknown">
- Theme: <Boost / Classic / custom name / unknown>
- Site language when captured: <en / id>
- Course format: <topics / weeks / other>
- Captured: <YYYY-MM-DD>
- Activity types present: <resource, quiz, assign, attendance, forum, url, page, ...>
- Completion types present: <manual / automatic / none>
- Notes: <anything unusual, no personal data>
```
