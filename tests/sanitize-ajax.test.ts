import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sanitizeAjaxEvents } from '../scripts/sanitize-ajax-core';
import { normalizeTaskResponse } from '../src/content/moodle/ajax-data';

const origin = 'https://moodle.example.test';

const RAW = [
  {
    error: false,
    data: {
      events: [
        {
          id: 501,
          name: 'Presensi Pertemuan 3 Budi Santoso',
          description: '<p>Dosen: siti@example.test NIM 2023010001</p>',
          userid: 77,
          modulename: 'attendance',
          component: 'mod_attendance',
          eventtype: 'attendance',
          instance: 9,
          timestart: 1760000000,
          timesort: 1760000000,
          timeduration: 5400,
          visible: 1,
          overdue: false,
          isactionevent: true,
          icon: { iconurl: `${origin}/theme/image.php` },
          course: { id: 42, fullname: 'Basis Data Lanjut', shortname: 'BDL', visible: true, summary: 'secret' },
          action: {
            name: 'Submit attendance',
            url: `${origin}/mod/attendance/view.php?id=46&sesskey=abc123`,
            actionable: true
          },
          url: `${origin}/mod/attendance/view.php?id=46`
        },
        {
          id: 502,
          name: 'Tugas 1',
          modulename: 'assign',
          eventtype: 'due',
          instance: 3,
          timestart: 1760100000,
          timesort: 1760100000,
          timeduration: 0,
          visible: 1,
          overdue: true,
          course: { id: 42, fullname: 'Basis Data Lanjut', visible: true },
          url: `${origin}/mod/assign/view.php?id=47`
        }
      ],
      firstid: 501,
      lastid: 502
    }
  }
];

describe('sanitizeAjaxEvents', () => {
  it('keeps only allowlisted fields and reports attendance evidence', () => {
    const report = sanitizeAjaxEvents(RAW);
    expect(report.json).not.toMatch(
      /Budi|Siti|siti@|2023010001|Basis Data|BDL|sesskey|abc123|secret|userid|description/
    );
    expect(report.events).toBe(2);
    expect(report.warnings).toEqual([]);
    expect(report.attendance).toEqual({
      events: 1,
      withTimestart: 1,
      withTimesort: 1,
      withDuration: 1,
      overdue: 0,
      eventTypes: ['attendance']
    });
    const parsed = JSON.parse(report.json);
    expect(parsed.events[0]).toMatchObject({
      name: 'Attendance 1',
      timestart: 1760000000,
      timeduration: 5400,
      course: { id: 42, fullname: 'Sample Course 1' },
      action: { name: 'Action', url: `${origin}/mod/attendance/view.php?id=46` }
    });
    expect(parsed).toMatchObject({ firstid: 501, lastid: 502 });
  });

  it('produces output the strict task normalizer still accepts', () => {
    const parsed = JSON.parse(sanitizeAjaxEvents(RAW).json);
    const tasks = normalizeTaskResponse(parsed, 'site-1', origin);
    expect(tasks?.map((task) => [task.kind, task.status])).toEqual([
      ['attendance', 'open'],
      ['assign', 'overdue']
    ]);
  });

  it('warns when no attendance events or no events array exist', () => {
    expect(sanitizeAjaxEvents({ events: [] }).warnings).toContain(
      'No attendance events found; ML-005 is not proven by this capture.'
    );
    expect(sanitizeAjaxEvents({ foo: 1 })).toMatchObject({ json: '', events: 0 });
  });
});

describe('SiberMu timeline AJAX fixture', () => {
  it('normalizes the observed empty response to no tasks', () => {
    const fixture = JSON.parse(
      readFileSync(
        join(__dirname, 'fixtures/sibermu-2026-10/ajax-core_calendar_get_action_events_by_timesort.json'),
        'utf8'
      )
    );
    expect(normalizeTaskResponse(fixture, 'site-1', 'https://solusi.sibermu.ac.id')).toEqual([]);
  });
});
