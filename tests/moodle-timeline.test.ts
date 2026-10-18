import { describe, expect, it } from 'vitest';
import { parseDashboardCourses, parseTimelineTasks } from '../src/content/moodle/timeline';

const origin = 'https://learn.example.edu';
const siteId = 'learn.example.edu';
const doc = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('Moodle DOM task fallback', () => {
  it('normalizes dashboard course cards with explicit progress', () => {
    const courses = parseDashboardCourses(
      doc(`<div class="dashboard-card" data-course-id="12"><a class="coursename"><span class="multiline">Applied Ethics</span></a>
        <div role="progressbar" aria-valuenow="67"></div><p>untrusted summary</p></div>`),
      siteId
    );
    expect(courses).toEqual([{ siteId, id: '12', name: 'Applied Ethics', visible: true, progress: 67 }]);
  });

  it('requires machine-readable timestamps and safe same-origin task links', () => {
    const tasks = parseTimelineTasks(
      doc(`<div data-region="event-list-item" data-event-id="8" data-course-id="12" data-overdue="true">
        <h4 data-region="event-name">Attendance session</h4>
        <a href="${origin}/mod/attendance/view.php?id=44&sesskey=drop">Open</a>
        <time datetime="2027-01-15T08:00:00Z">Tomorrow</time></div>
        <div data-region="event-list-item" data-event-id="9" data-course-id="12">
          <h4>No timestamp</h4><a href="${origin}/mod/quiz/view.php?id=45">Open</a></div>
        <div data-region="event-list-item" data-event-id="10" data-course-id="12">
          <h4>Evil</h4><a href="https://evil.example/mod/quiz/view.php?id=45">Open</a>
          <time datetime="2027-01-15T08:00:00Z"></time></div>`),
      siteId,
      origin
    );
    expect(tasks).toEqual([
      {
        siteId,
        courseId: '12',
        kind: 'attendance',
        title: 'Attendance session',
        dueAt: '2027-01-15T08:00:00.000Z',
        url: `${origin}/mod/attendance/view.php?id=44`,
        status: 'overdue',
        source: 'dom'
      }
    ]);
  });
});
