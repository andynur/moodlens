import { describe, expect, it } from 'vitest';
import { parseCourse, parseCompletion } from '../src/content/moodle/adapter';
import { isActivityUrl, isCourseSnapshot, isCourseUrl } from '../src/shared/validation';

const URL = 'https://solusi.sibermu.ac.id/course/view.php?id=42';
function html(content: string): Document {
  return new DOMParser().parseFromString(content, 'text/html');
}

describe('URL policies', () => {
  it('allows only exact course host, scheme, and path', () => {
    expect(isCourseUrl(URL)).toBe(true);
    expect(isCourseUrl('http://solusi.sibermu.ac.id/course/view.php?id=42')).toBe(false);
    expect(isCourseUrl('https://solusi.sibermu.ac.id.evil.test/course/view.php?id=42')).toBe(false);
    expect(isCourseUrl('https://solusi.sibermu.ac.id/mod/quiz/attempt.php?attempt=42')).toBe(false);
  });
  it('requires known activity paths and module IDs', () => {
    expect(isActivityUrl('https://solusi.sibermu.ac.id/mod/quiz/view.php?id=7')).toBe(true);
    expect(isActivityUrl('https://evil.test/mod/quiz/view.php?id=7')).toBe(false);
    expect(isActivityUrl('https://solusi.sibermu.ac.id/mod/quiz/view.php?id=7&sesskey=secret')).toBe(false);
    expect(isActivityUrl('https://solusi.sibermu.ac.id/mod/quiz/attempt.php?id=7')).toBe(false);
  });
});

describe('Moodle course adapter', () => {
  it('extracts distinct activities and only explicit completion', () => {
    const doc = html(`<h1>Intro to Databases</h1>
      <li class="activity"><div class="activity-item">
        <a href="https://solusi.sibermu.ac.id/mod/resource/view.php?id=11">Module One</a>
        <div data-region="completion-info">Completed</div>
      </div></li>
      <li class="activity"><a href="https://solusi.sibermu.ac.id/mod/quiz/view.php?id=12">Review quiz</a><div class="activity-completion">Mark as done</div></li>
      <li class="activity"><a href="https://solusi.sibermu.ac.id/mod/attendance/view.php?id=13">Attendance</a></li>
      <li class="activity"><a href="https://evil.test/mod/forum/view.php?id=14">Bad link</a></li>`);
    const snapshot = parseCourse(doc, URL, new Date('2026-10-16T00:00:00Z'));
    expect(snapshot?.courseName).toBe('Intro to Databases');
    expect(snapshot?.activities.map((a) => a.type)).toEqual(['resource', 'quiz', 'attendance']);
    expect(snapshot?.activities.map((a) => a.completion)).toEqual(['complete', 'incomplete', 'unknown']);
    expect(isCourseSnapshot(snapshot)).toBe(true);
  });
  it('drops incidental or sensitive query strings in stored URLs', () => {
    const doc = html(
      '<h1>Course</h1><li class="activity"><a href="https://solusi.sibermu.ac.id/mod/resource/view.php?id=11&sesskey=secret">Reading</a></li>'
    );
    const result = parseCourse(doc, URL + '&custom=something');
    expect(result?.sourceUrl).toBe(URL);
    expect(result?.activities[0]?.url).toBe('https://solusi.sibermu.ac.id/mod/resource/view.php?id=11');
  });
  it('does not create a snapshot for unrelated pages', () => {
    expect(parseCourse(html('<h1>Page</h1>'), 'https://solusi.sibermu.ac.id/my/')).toBeNull();
  });
  it('treats completion unrelated labels as unknown', () => {
    const doc = html('<li class="activity"><div class="activity-completion">More details</div></li>');
    expect(parseCompletion(doc.querySelector('li')!)).toBe('unknown');
  });
  it('stores null when the course has no heading', () => {
    const snapshot = parseCourse(html('<p>No course heading</p>'), URL);
    expect(snapshot?.courseName).toBeNull();
    expect(isCourseSnapshot(snapshot)).toBe(true);
  });
  it('maps "Mark as not done" text to complete', () => {
    const doc = html(
      '<li class="activity"><div class="activity-completion"><button>Mark as not done</button></div></li>'
    );
    expect(parseCompletion(doc.querySelector('li')!)).toBe('complete');
  });
  it('prefers the manual toggle type over text', () => {
    const toggle = (type: string, text: string) =>
      html(`<li class="activity"><div class="activity-completion"><div data-region="completion-info">
      <button data-action="toggle-manual-completion" data-toggletype="${type}" aria-label="Mark Done reading as not done">${text}</button></div></div></li>`);
    expect(parseCompletion(toggle('manual:undo', 'Done').querySelector('li')!)).toBe('complete');
    expect(parseCompletion(toggle('manual:mark-done', 'Mark as done').querySelector('li')!)).toBe('incomplete');
  });
  it('maps the automatic "To do" dropdown to incomplete', () => {
    const doc = html(
      '<li class="activity"><div class="activity-completion"><button class="completion-dropdown">To do</button></div></li>'
    );
    expect(parseCompletion(doc.querySelector('li')!)).toBe('incomplete');
  });
  it('lists activities without a link as restricted and never navigable', () => {
    const doc = html(`<h1>Course</h1>
      <li class="activity modtype_quiz" data-id="21"><span class="instancename">Final quiz <span class="accesshide"> Quiz</span></span>
        <div class="availabilityinfo isrestricted">Not available unless: …</div></li>
      <li class="activity modtype_label" data-id="22"><span class="instancename">Label</span></li>
      <li class="activity modtype_folder" data-id="23"><a href="https://solusi.sibermu.ac.id/mod/folder/view.php?id=23">Slides</a></li>`);
    const snapshot = parseCourse(doc, URL);
    expect(snapshot?.activities).toMatchObject([
      { id: '21', title: 'Final quiz', type: 'quiz', url: null, restricted: true },
      { id: '23', type: 'folder', url: 'https://solusi.sibermu.ac.id/mod/folder/view.php?id=23', restricted: false }
    ]);
    expect(isCourseSnapshot(snapshot)).toBe(true);
  });
  it('rejects a stored activity with no URL that is not restricted', () => {
    const doc = html(
      '<h1>Course</h1><li class="activity modtype_quiz" data-id="21"><span class="instancename">Quiz</span></li>'
    );
    const snapshot = parseCourse(doc, URL)!;
    expect(isCourseSnapshot({ ...snapshot, activities: [{ ...snapshot.activities[0], restricted: false }] })).toBe(
      false
    );
  });
  it('strips .accesshide type suffixes from titles', () => {
    const doc =
      html(`<h1>Course</h1><li class="activity"><a href="https://solusi.sibermu.ac.id/mod/resource/view.php?id=11">
      <span class="instancename">Reading <span class="accesshide"> File</span></span></a></li>`);
    expect(parseCourse(doc, URL)?.activities[0]?.title).toBe('Reading');
  });
});
