import { describe, expect, it } from 'vitest';
import type { MoodleTask } from '../src/shared/types';
import { filterTasks, taskGroup } from '../src/shared/tasks';

const task = (dueAt?: string, status: MoodleTask['status'] = 'open'): MoodleTask => ({
  siteId: 'site',
  courseId: '1',
  kind: 'quiz',
  title: 'Final Quiz',
  ...(dueAt ? { dueAt } : {}),
  url: 'https://learn.example.edu/mod/quiz/view.php?id=1',
  status,
  source: 'ajax'
});

describe('task grouping and filters', () => {
  it('groups by calendar day in the requested timezone across a DST boundary', () => {
    const now = new Date('2026-03-08T06:30:00Z');
    expect(taskGroup(task('2026-03-08T07:30:00Z'), now, 'America/New_York')).toBe('today');
    expect(taskGroup(task('2026-03-09T04:00:00Z'), now, 'America/New_York')).toBe('later');
    expect(taskGroup(task('2026-03-08T06:00:00Z'), now, 'America/New_York')).toBe('overdue');
    expect(taskGroup(task(), now, 'America/New_York')).toBe('noDate');
  });

  it('filters by exact dimensions and normalized title search', () => {
    const tasks = [task('2027-01-01T00:00:00Z'), { ...task(), siteId: 'other', kind: 'assign' as const }];
    expect(filterTasks(tasks, { siteId: 'site', courseId: '1', kind: 'quiz', search: ' final  ' })).toHaveLength(1);
  });
});
