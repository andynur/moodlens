# sibermu-2026-10

- Site: `https://solusi.sibermu.ac.id` (first verified site)
- Moodle version: unknown (body class `edw-m405` hints Moodle 4.x)
- Theme: probably Edwiser RemUI (inferred from `edw-` classes and header markup)
- Site language when captured: en (`lang-en`); some custom restriction text is Indonesian
- Course format: topics
- Captured: 2026-10-16, from a student account via DevTools "Copy outerHTML"
- Sanitized with `npm run fixture:sanitize`; manual audit: 0 collected names, emails or `sesskey` left

| File | Sections | `li.activity` | Notes |
|---|---|---|---|
| `course-1.html` | 40 | 17 | small course; manual completion; attendance, page |
| `course-2.html` | 44 | 114 | many quizzes and labels; no manual completion |
| `course-3.html` | 44 | 125 | folder, feedback; many restricted activities |
| `course-4.html` | 42 | 126 | most resources; 27 manual completion buttons |
| `dashboard.html` | — | — | `/my/` page: My Overview (4 courses), Timeline (empty, AJAX-loaded), Completion Progress (283 cells); announcement blocks removed |
| `my-courses.html` | — | — | `/my/courses.php` page: My Overview only (card view, 4 courses, `data-totalcoursecount="20"`) |

- Activity types present: resource, url, assign, quiz, forum, attendance, label, page, folder, book, feedback
- Completion types present: automatic ("To do" dropdown), manual ("Mark as done"). **No completed items.**
- Restricted activities: present, without activity links.
- Course names, section names, activity names and people are replaced with `Sample Course`, `Section N`, `Activity N`, `Person`. Real module ids and URLs are kept.

- `course-5.html` (2026-10-18): course with completed activities; 3 automatic "Done" dropdowns and 1 `manual:undo` on a label. Saved as "HTML only", so the JS-rendered course index drawer is not included.
