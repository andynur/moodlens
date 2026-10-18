import type { CompletionStatus, CourseSnapshot } from './types';

/** PRD-009 (ML-017): keep the last 2 snapshots per course. */
export const SNAPSHOT_HISTORY_LIMIT = 2;

export type ActivityChange =
  | { kind: 'added'; activityId: string; title: string }
  | { kind: 'removed'; activityId: string; title: string }
  | { kind: 'renamed'; activityId: string; title: string; previousTitle: string }
  | {
      kind: 'completion';
      activityId: string;
      title: string;
      previous: CompletionStatus;
      current: CompletionStatus;
    };

export interface CourseDiff {
  courseId: string;
  /** Changes in current page order; removed activities follow in previous page order. */
  changes: ActivityChange[];
}

/**
 * Diffs two snapshots of one course by activity id.
 * With no previous snapshot there is nothing to compare, so the diff is empty
 * (a first visit must not flag every activity as new).
 * Completion changes from or to `unknown` are ignored: they reflect what the page showed, not a real change.
 */
export function diffSnapshots(previous: CourseSnapshot | null, current: CourseSnapshot): CourseDiff {
  const changes: ActivityChange[] = [];
  if (!previous || previous.courseId !== current.courseId) return { courseId: current.courseId, changes };

  const before = new Map(previous.activities.map((activity) => [activity.id, activity]));
  const seen = new Set<string>();
  for (const activity of current.activities) {
    seen.add(activity.id);
    const old = before.get(activity.id);
    if (!old) {
      changes.push({ kind: 'added', activityId: activity.id, title: activity.title });
      continue;
    }
    if (old.title !== activity.title) {
      changes.push({ kind: 'renamed', activityId: activity.id, title: activity.title, previousTitle: old.title });
    }
    if (old.completion !== activity.completion && old.completion !== 'unknown' && activity.completion !== 'unknown') {
      changes.push({
        kind: 'completion',
        activityId: activity.id,
        title: activity.title,
        previous: old.completion,
        current: activity.completion
      });
    }
  }
  for (const old of previous.activities) {
    if (!seen.has(old.id)) changes.push({ kind: 'removed', activityId: old.id, title: old.title });
  }
  return { courseId: current.courseId, changes };
}

/**
 * Returns the history with `snapshot` appended, oldest first, capped at `SNAPSHOT_HISTORY_LIMIT`.
 * Snapshots of other courses and snapshots not newer than `snapshot` are dropped, so a stale capture
 * cannot become the comparison base.
 */
export function appendSnapshot(history: readonly CourseSnapshot[], snapshot: CourseSnapshot): CourseSnapshot[] {
  const capturedAt = Date.parse(snapshot.capturedAt);
  const kept = history.filter(
    (entry) => entry.courseId === snapshot.courseId && Date.parse(entry.capturedAt) < capturedAt
  );
  return [...kept, snapshot].slice(-SNAPSHOT_HISTORY_LIMIT);
}

/** Diff between the two newest entries of a history built by `appendSnapshot`; null when empty. */
export function diffHistory(history: readonly CourseSnapshot[]): CourseDiff | null {
  const current = history.at(-1);
  if (!current) return null;
  return diffSnapshots(history.at(-2) ?? null, current);
}
