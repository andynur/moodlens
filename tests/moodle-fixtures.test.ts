import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCourse } from '../src/content/moodle/adapter';
import { isCourseSnapshot } from '../src/shared/validation';

// Sanitized SiberMu captures from 2026-10-16 (course-1..4) and 2026-10-18 (course-5, has completed
// activities); see tests/fixtures/sibermu-2026-10/README.md.
const DIR = join(process.cwd(), 'tests/fixtures/sibermu-2026-10');
const COURSES = ['course-1.html', 'course-2.html', 'course-3.html', 'course-4.html'];

function load(name: string): Document {
  return new DOMParser().parseFromString(readFileSync(join(DIR, name), 'utf8'), 'text/html');
}

describe('SiberMu course fixtures', () => {
  for (const name of COURSES) {
    it(`${name} yields a valid snapshot without type suffixes`, () => {
      const snapshot = parseCourse(load(name), 'https://solusi.sibermu.ac.id/course/view.php?id=1');
      expect(snapshot).not.toBeNull();
      expect(isCourseSnapshot(snapshot, 'https://solusi.sibermu.ac.id')).toBe(true);
      expect(snapshot!.activities.length).toBeGreaterThan(0);
      const suffix = / (?:File|Forum|Assignment|Quiz|URL|Attendance|Page)$/;
      expect(snapshot!.activities.filter((a) => suffix.test(a.title))).toEqual([]);
      // Fixtures contain no completed activity, so nothing may map to complete.
      expect(snapshot!.activities.some((a) => a.completion === 'complete')).toBe(false);
    });
  }
  it('lists locked activities as restricted without links', () => {
    const all = COURSES.flatMap(
      (name) => parseCourse(load(name), 'https://solusi.sibermu.ac.id/course/view.php?id=1')!.activities
    );
    const restricted = all.filter((a) => a.restricted);
    expect(restricted.length).toBeGreaterThan(0);
    expect(restricted.every((a) => a.url === null)).toBe(true);
    expect(all.filter((a) => !a.restricted).every((a) => a.url !== null)).toBe(true);
  });
  it('course-5.html maps automatic Done badges to complete', () => {
    const snapshot = parseCourse(load('course-5.html'), 'https://solusi.sibermu.ac.id/course/view.php?id=1');
    expect(isCourseSnapshot(snapshot, 'https://solusi.sibermu.ac.id')).toBe(true);
    const complete = snapshot!.activities.filter((a) => a.completion === 'complete');
    // 3 automatic "Done" dropdowns (url, resource x2). The one manual:undo button sits on a label,
    // which is skipped by design. Matches the live panel count on 2026-10-18.
    expect(complete.length).toBe(3);
    expect(snapshot!.activities.filter((a) => a.completion === 'incomplete').length).toBeGreaterThan(0);
  });
  it('maps manual and automatic completion controls to incomplete', () => {
    const all = COURSES.flatMap(
      (name) => parseCourse(load(name), 'https://solusi.sibermu.ac.id/course/view.php?id=1')!.activities
    );
    expect(all.filter((a) => a.completion === 'incomplete').length).toBeGreaterThan(0);
  });
});
