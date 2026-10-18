import { describe, expect, it } from 'vitest';
import { appendSnapshot, diffHistory, diffSnapshots } from '../src/shared/diff';
import type { CompletionStatus, CourseSnapshot, MoodleActivity } from '../src/shared/types';

function activity(id: string, title: string, completion: CompletionStatus = 'incomplete'): MoodleActivity {
  return { id, courseId: '7', title, type: 'page', url: null, restricted: false, completion };
}

function snapshot(capturedAt: string, activities: MoodleActivity[], courseId = '7'): CourseSnapshot {
  return {
    courseId,
    courseName: 'Course',
    sourceUrl: `https://moodle.example.edu/course/view.php?id=${courseId}`,
    capturedAt,
    activities
  };
}

const base = snapshot('2026-10-01T00:00:00Z', [activity('1', 'Intro'), activity('2', 'Week 1')]);

describe('diffSnapshots', () => {
  it('reports nothing for unchanged snapshots', () => {
    expect(diffSnapshots(base, { ...base, capturedAt: '2026-10-02T00:00:00Z' }).changes).toEqual([]);
  });
  it('reports nothing on a first visit', () => {
    expect(diffSnapshots(null, base)).toEqual({ courseId: '7', changes: [] });
  });
  it('reports added and removed activities by id', () => {
    const next = snapshot('2026-10-02T00:00:00Z', [activity('1', 'Intro'), activity('3', 'Week 2')]);
    expect(diffSnapshots(base, next).changes).toEqual([
      { kind: 'added', activityId: '3', title: 'Week 2' },
      { kind: 'removed', activityId: '2', title: 'Week 1' }
    ]);
  });
  it('reports a rename when the id stays and the title changes', () => {
    const next = snapshot('2026-10-02T00:00:00Z', [activity('1', 'Introduction'), activity('2', 'Week 1')]);
    expect(diffSnapshots(base, next).changes).toEqual([
      { kind: 'renamed', activityId: '1', title: 'Introduction', previousTitle: 'Intro' }
    ]);
  });
  it('reports completion changes and ignores unknown states', () => {
    const next = snapshot('2026-10-02T00:00:00Z', [
      activity('1', 'Intro', 'complete'),
      activity('2', 'Week 1', 'unknown')
    ]);
    expect(diffSnapshots(base, next).changes).toEqual([
      { kind: 'completion', activityId: '1', title: 'Intro', previous: 'incomplete', current: 'complete' }
    ]);
  });
  it('reports rename and completion change of one activity together', () => {
    const next = snapshot('2026-10-02T00:00:00Z', [activity('1', 'Intro v2', 'complete'), activity('2', 'Week 1')]);
    expect(diffSnapshots(base, next).changes.map((change) => change.kind)).toEqual(['renamed', 'completion']);
  });
  it('does not compare different courses', () => {
    expect(diffSnapshots(base, snapshot('2026-10-02T00:00:00Z', [], '8')).changes).toEqual([]);
  });
});

describe('snapshot history', () => {
  it('keeps the last 2 snapshots of the course, oldest first', () => {
    const second = snapshot('2026-10-02T00:00:00Z', [activity('1', 'Intro')]);
    const third = snapshot('2026-10-03T00:00:00Z', [activity('1', 'Intro'), activity('4', 'Quiz')]);
    const history = appendSnapshot(appendSnapshot(appendSnapshot([], base), second), third);
    expect(history).toEqual([second, third]);
    expect(diffHistory(history)?.changes).toEqual([{ kind: 'added', activityId: '4', title: 'Quiz' }]);
  });
  it('drops other courses and entries not older than the new snapshot', () => {
    const other = snapshot('2026-09-30T00:00:00Z', [], '8');
    const later = snapshot('2026-10-05T00:00:00Z', []);
    const next = snapshot('2026-10-02T00:00:00Z', []);
    expect(appendSnapshot([other, base, later], next)).toEqual([base, next]);
  });
  it('returns null for an empty history and an empty diff for one entry', () => {
    expect(diffHistory([])).toBeNull();
    expect(diffHistory([base])?.changes).toEqual([]);
  });
});
