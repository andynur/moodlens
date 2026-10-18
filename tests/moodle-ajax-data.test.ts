import { describe, expect, it } from 'vitest';
import { normalizeCourseResponse, normalizeTaskResponse, normalizeTaskUrl } from '../src/content/moodle/ajax-data';

const origin = 'https://learn.example.edu';

describe('Moodle AJAX response normalization', () => {
  it('keeps only bounded course fields', () => {
    expect(
      normalizeCourseResponse(
        {
          courses: [
            {
              id: 12,
              fullname: 'Ignored fallback',
              fullnamedisplay: 'Applied Ethics',
              shortname: 'ETH-12',
              visible: 1,
              hasprogress: true,
              progress: 42.4,
              summary: 'raw course content must not escape'
            }
          ],
          nextoffset: 1
        },
        'learn.example.edu'
      )
    ).toEqual([
      {
        siteId: 'learn.example.edu',
        id: '12',
        name: 'Applied Ethics',
        shortName: 'ETH-12',
        visible: true,
        progress: 42
      }
    ]);
  });

  it('rejects malformed, duplicate, or oversized course data', () => {
    expect(normalizeCourseResponse({ courses: [{ id: 1, fullname: '', visible: true }] }, 'site')).toBeNull();
    expect(
      normalizeCourseResponse(
        {
          courses: [
            { id: 1, fullname: 'A', visible: true },
            { id: '1', fullname: 'B', visible: true }
          ]
        },
        'site'
      )
    ).toBeNull();
    expect(normalizeCourseResponse({ courses: Array.from({ length: 201 }) }, 'site')).toBeNull();
  });

  it('normalizes action events without leaking descriptions or edit URLs', () => {
    expect(
      normalizeTaskResponse(
        {
          events: [
            {
              id: 90,
              name: 'Submit reflection',
              description: '<p>untrusted</p>',
              course: { id: 12, fullname: 'Applied Ethics' },
              instance: 45,
              modulename: 'assign',
              timesort: 1_800_000_000,
              visible: 1,
              overdue: false,
              isactionevent: true,
              editurl: `${origin}/course/mod.php?update=45&sesskey=secret`,
              action: { url: `${origin}/mod/assign/view.php?id=45&forceview=1`, actionable: true }
            }
          ]
        },
        'learn.example.edu',
        origin
      )
    ).toEqual([
      {
        siteId: 'learn.example.edu',
        courseId: '12',
        activityId: '45',
        kind: 'assign',
        title: 'Submit reflection',
        dueAt: '2027-01-15T08:00:00.000Z',
        url: `${origin}/mod/assign/view.php?id=45`,
        status: 'open',
        source: 'ajax'
      }
    ]);
  });

  it('maps attendance only from explicit module evidence and preserves Moodle overdue state', () => {
    const tasks = normalizeTaskResponse(
      {
        events: [
          {
            id: 91,
            name: 'Attendance session',
            course: { id: 12 },
            instance: 46,
            modulename: 'attendance',
            timesort: 1_800_000_000,
            visible: true,
            overdue: true,
            isactionevent: true,
            url: `${origin}/mod/attendance/view.php?id=46`
          }
        ]
      },
      'learn.example.edu',
      origin
    );
    expect(tasks?.[0]).toMatchObject({ kind: 'attendance', status: 'overdue', dueAt: expect.any(String) });
  });

  it('rejects malformed event fields and cross-origin or write URLs', () => {
    const event = {
      id: 1,
      name: 'Event',
      course: { id: 2 },
      timesort: 1_800_000_000,
      visible: true,
      overdue: false,
      url: `${origin}/mod/quiz/view.php?id=3`
    };
    expect(normalizeTaskResponse({ events: [{ ...event, timesort: 'tomorrow' }] }, 'site', origin)).toBeNull();
    expect(
      normalizeTaskResponse(
        { events: [{ ...event, url: 'https://evil.example/mod/quiz/view.php?id=3' }] },
        'site',
        origin
      )
    ).toBeNull();
    expect(normalizeTaskUrl(`${origin}/course/mod.php?id=3`, origin)).toBeNull();
  });

  it('drops explicitly hidden events and rejects duplicate event ids within a course', () => {
    const event = {
      id: 1,
      name: 'Event',
      course: { id: 2 },
      timesort: 1_800_000_000,
      visible: false,
      overdue: false,
      url: `${origin}/mod/quiz/view.php?id=3`
    };
    expect(normalizeTaskResponse({ events: [event] }, 'site', origin)).toEqual([]);
    expect(
      normalizeTaskResponse(
        {
          events: [
            { ...event, visible: true },
            { ...event, visible: true }
          ]
        },
        'site',
        origin
      )
    ).toBeNull();
  });
});
