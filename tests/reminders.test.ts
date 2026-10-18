import { describe, expect, it } from 'vitest';
import { buildReminderSchedule, normalizeReminderPrefs, REMINDER_ALARM_PREFIX } from '../src/shared/reminders';
import type { TaskDataset } from '../src/shared/types';

const dataset: TaskDataset = {
  siteId: 'site',
  courses: [{ siteId: 'site', id: '1', name: 'Course', visible: true }],
  tasks: [
    {
      siteId: 'site',
      courseId: '1',
      kind: 'assign',
      title: 'Essay',
      dueAt: '2027-01-02T00:00:00Z',
      url: 'https://learn.example.edu/mod/assign/view.php?id=2',
      status: 'open',
      source: 'ajax'
    }
  ],
  capturedAt: '2026-10-19T00:00:00Z',
  source: 'ajax'
};

describe('local reminder schedule', () => {
  it('is off by default and validates only supported lead times', () => {
    expect(buildReminderSchedule([dataset], { enabled: false, leadMinutes: [60] })).toEqual({});
    expect(normalizeReminderPrefs({ enabled: true, leadMinutes: [60, 180] })).toEqual({
      enabled: true,
      leadMinutes: [60, 180]
    });
    expect(normalizeReminderPrefs({ enabled: true, leadMinutes: [5] })).toBeNull();
  });

  it('uses opaque alarm names and skips past, done, or undated tasks', () => {
    const schedule = buildReminderSchedule(
      [dataset],
      { enabled: true, leadMinutes: [60, 1440] },
      Date.parse('2027-01-01T00:00:00Z')
    );
    expect(Object.keys(schedule)).toHaveLength(1);
    expect(Object.keys(schedule)[0]).toMatch(new RegExp(`^${REMINDER_ALARM_PREFIX}[a-f0-9]{8}$`));
    expect(Object.values(schedule)[0]).toMatchObject({
      taskTitle: 'Essay',
      courseName: 'Course',
      when: Date.parse('2027-01-01T23:00:00Z')
    });
    expect(
      buildReminderSchedule([{ ...dataset, tasks: [{ ...dataset.tasks[0]!, status: 'done' }] }], {
        enabled: true,
        leadMinutes: [60]
      })
    ).toEqual({});
  });
});
