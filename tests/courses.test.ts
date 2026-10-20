import { describe, expect, it } from 'vitest';
import {
  addSnapshot,
  COURSE_RECORDS_BUDGET,
  applySnapshot,
  cleanPrefs,
  isCoursePrefsMap,
  isCourseRecords,
  MAX_COURSES_PER_SITE,
  moveCourse,
  hiddenCourseKeys,
  orderCourses,
  pendingChanges,
  withLastSnapshot,
  type CourseRecords
} from '../src/shared/courses';
import { dueSoon, normalizeLayout, isDashboardLayout, moveWidget, toggleWidget } from '../src/shared/dashboard';
import type { MoodleTask } from '../src/shared/types';
import type { CompletionStatus, CourseSnapshot, MoodleActivity } from '../src/shared/types';

const ORIGIN = 'https://moodle.example.edu';

function activity(
  id: string,
  title: string,
  completion: CompletionStatus = 'incomplete',
  courseId = '7'
): MoodleActivity {
  return {
    id,
    courseId,
    title,
    type: 'page',
    url: `${ORIGIN}/mod/page/view.php?id=${id}`,
    restricted: false,
    completion
  };
}
function snapshot(day: number, activities: MoodleActivity[], courseId = '7'): CourseSnapshot {
  return {
    courseId,
    courseName: 'Course',
    sourceUrl: `${ORIGIN}/course/view.php?id=${courseId}`,
    capturedAt: `2026-10-${String(day).padStart(2, '0')}T00:00:00.000Z`,
    activities
  };
}
const first = snapshot(1, [activity('1', 'Intro')]);

describe('course records (ML-017 storage)', () => {
  it('first capture has nothing new', () => {
    const record = applySnapshot(undefined, first);
    expect(record).toEqual({ history: [first], seen: true });
    expect(pendingChanges(record)).toEqual([]);
  });
  it('an unchanged recapture replaces the current state and keeps the comparison base', () => {
    const changed = applySnapshot(
      applySnapshot(undefined, first),
      snapshot(2, [activity('1', 'Intro'), activity('2', 'Quiz')])
    );
    const refreshed = applySnapshot(changed, snapshot(3, [activity('1', 'Intro'), activity('2', 'Quiz')]));
    expect(refreshed.history.map((item) => item.capturedAt.slice(8, 10))).toEqual(['01', '03']);
    expect(pendingChanges(refreshed)).toEqual([{ kind: 'added', activityId: '2', title: 'Quiz' }]);
  });
  it('a real change resets seen, and mark as seen hides it', () => {
    const record = applySnapshot(applySnapshot(undefined, first), snapshot(2, [activity('1', 'Intro', 'complete')]));
    expect(record.seen).toBe(false);
    expect(pendingChanges({ ...record, seen: true })).toEqual([]);
  });
  it('ignores a capture that is not newer', () => {
    const record = applySnapshot(undefined, snapshot(2, [activity('1', 'Intro')]));
    expect(applySnapshot(record, snapshot(1, []))).toBe(record);
  });
  it('caps courses per site by most recent capture', () => {
    let records: CourseRecords = {};
    for (let index = 0; index <= MAX_COURSES_PER_SITE; index++) {
      records = addSnapshot(records, {
        ...snapshot(1, [], String(index)),
        capturedAt: new Date(index * 1000).toISOString()
      });
    }
    expect(Object.keys(records)).toHaveLength(MAX_COURSES_PER_SITE);
    expect(records['0']).toBeUndefined();
  });
  it('keeps one site under the storage budget, dropping the oldest courses first', () => {
    const long = (n: number) =>
      Array.from({ length: 200 }, (_, i) => activity(String(i), `${'Week topic and reading list '.repeat(10)}${n}`));
    let records: CourseRecords = {};
    for (let index = 0; index < 30; index++) {
      records = addSnapshot(records, {
        ...snapshot(1, long(index), String(index)),
        capturedAt: new Date(index * 1000).toISOString()
      });
    }
    expect(JSON.stringify(records).length).toBeLessThanOrEqual(COURSE_RECORDS_BUDGET);
    expect(records['29']).toBeDefined();
    expect(records['0']).toBeUndefined();
    expect(Object.keys(records).length).toBeGreaterThan(1);
  });
  it('adds the last viewed course when it has no record', () => {
    expect(withLastSnapshot({}, first)).toEqual({ '7': { history: [first], seen: true } });
    expect(withLastSnapshot({}, null)).toEqual({});
  });
  it('validates stored records against the site origin', () => {
    const records = { '7': { history: [first], seen: true } };
    expect(isCourseRecords(records, ORIGIN)).toBe(true);
    expect(isCourseRecords(records, 'https://other.example.edu')).toBe(false);
    expect(isCourseRecords({ '8': { history: [first], seen: true } }, ORIGIN)).toBe(false);
    expect(isCourseRecords({ '7': { history: [first, first], seen: true } }, ORIGIN)).toBe(false);
    expect(isCourseRecords({ '7': { history: [], seen: true } }, ORIGIN)).toBe(false);
  });
});

describe('course personalization (ML-016)', () => {
  it('cleans prefs and rejects malformed input', () => {
    expect(cleanPrefs({ pinned: true, hidden: false, nickname: '  Calc  I ', color: 'rose' })).toEqual({
      pinned: true,
      nickname: 'Calc I',
      color: 'rose'
    });
    expect(cleanPrefs({ nickname: '' })).toEqual({});
    expect(cleanPrefs({ color: 'red' })).toBeNull();
    expect(cleanPrefs({ pinned: 'yes' })).toBeNull();
    expect(cleanPrefs({ nickname: 'x'.repeat(61) })).toBeNull();
    expect(cleanPrefs({ grade: 100 })).toBeNull();
    expect(isCoursePrefsMap({ '7': { pinned: true } })).toBe(true);
    expect(isCoursePrefsMap({ '7': { pinned: false } })).toBe(false);
  });
  it('collects hidden course keys across sites', () => {
    const keys = hiddenCourseKeys({
      a: { '1': { hidden: true }, '2': { pinned: true } },
      b: { '1': { hidden: true } }
    });
    expect([...keys].sort()).toEqual(['a/1', 'b/1']);
  });
  it('orders pinned first, then manual position, then most recent capture', () => {
    const records = addSnapshot(
      addSnapshot(addSnapshot({}, snapshot(1, [], '1')), snapshot(2, [], '2')),
      snapshot(3, [], '3')
    );
    expect(orderCourses(records, {})).toEqual(['3', '2', '1']);
    expect(orderCourses(records, { '1': { pinned: true } })).toEqual(['1', '3', '2']);
    expect(orderCourses(records, { '2': { position: 0 } })).toEqual(['2', '3', '1']);
  });
  it('moves a course inside its group and never across the pinned boundary', () => {
    const records = addSnapshot(
      addSnapshot(addSnapshot({}, snapshot(1, [], '1')), snapshot(2, [], '2')),
      snapshot(3, [], '3')
    );
    const moved = moveCourse(records, {}, '1', 'up');
    expect(orderCourses(records, moved)).toEqual(['3', '1', '2']);
    const pinned = { '3': { pinned: true as const } };
    expect(moveCourse(records, pinned, '2', 'up')).toBe(pinned);
    expect(moveCourse(records, {}, '3', 'up')).toEqual({});
    expect(moveCourse(records, {}, '99', 'up')).toEqual({});
  });
});

describe('dashboard layout (ML-004)', () => {
  it('normalizes stored layouts', () => {
    expect(normalizeLayout(null)).toEqual({
      order: ['dueSoon', 'whatsNew', 'pinned', 'progress', 'streak'],
      hidden: []
    });
    // A layout saved before the streak widget existed stays valid and gains it at the end.
    expect(normalizeLayout({ order: ['progress', 'bogus', 'progress'], hidden: ['pinned', 'x'] })).toEqual({
      order: ['progress', 'dueSoon', 'whatsNew', 'pinned', 'streak'],
      hidden: ['pinned']
    });
    expect(isDashboardLayout({ order: ['progress'], hidden: [] })).toBe(true);
    expect(isDashboardLayout({ order: ['progress', 'progress'], hidden: [] })).toBe(false);
    expect(isDashboardLayout({ order: ['streak'], hidden: [] })).toBe(true);
    expect(isDashboardLayout({ order: ['focus'], hidden: [] })).toBe(false);
  });
  it('moves and toggles widgets', () => {
    const layout = normalizeLayout(null);
    expect(moveWidget(layout, 'progress', 'up').order).toEqual(['dueSoon', 'whatsNew', 'progress', 'pinned', 'streak']);
    expect(moveWidget(layout, 'dueSoon', 'up')).toBe(layout);
    expect(toggleWidget(toggleWidget(layout, 'pinned'), 'pinned')).toEqual(layout);
  });
});

describe('due soon widget (ML-004)', () => {
  const now = new Date('2026-10-19T12:00:00.000Z');
  function task(courseId: string, dueAt: string | undefined, status: MoodleTask['status'] = 'open'): MoodleTask {
    return {
      siteId: 's',
      courseId,
      kind: 'assign',
      title: `T${courseId}`,
      dueAt,
      url: `${ORIGIN}/mod/assign/view.php?id=1`,
      status,
      source: 'ajax'
    };
  }
  it('keeps open tasks due in the next 7 days, soonest first, without hidden courses', () => {
    const tasks = [
      task('3', '2026-10-24T00:00:00.000Z'),
      task('1', '2026-10-20T00:00:00.000Z'),
      task('2', '2026-10-21T00:00:00.000Z', 'done'),
      task('4', '2026-10-18T00:00:00.000Z'),
      task('5', '2026-10-27T00:00:00.000Z'),
      task('6', undefined),
      task('7', '2026-10-22T00:00:00.000Z')
    ];
    expect(dueSoon(tasks, new Set(['s/7']), now).map((item) => item.courseId)).toEqual(['1', '3']);
  });
});
