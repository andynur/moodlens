import type { TaskAjaxCapability, TaskDataset } from '../../shared/types';
import { MoodleAjaxClient } from './ajax';
import { normalizeCourseResponse, normalizeTaskResponse } from './ajax-data';
import { parseDashboardCourses, parseTimelineTasks } from './timeline';

/**
 * Moodle rejects `core_calendar_get_action_events_by_timesort` with "Limit must be between 1 and 50
 * (inclusive)" above this value (verified on SiberMu, Moodle 4.x, 2026-10-19). A larger number makes the
 * call fail and the capability is then cached as unsupported, so the site falls back to DOM for a day.
 */
export const TIMELINE_LIMIT = 50;

export async function captureTaskDataset(
  doc: Document,
  pageUrl: string,
  siteId: string,
  now = new Date(),
  client = new MoodleAjaxClient(doc, pageUrl),
  skipped: TaskAjaxCapability[] = []
): Promise<TaskDataset> {
  const origin = new URL(pageUrl).origin;
  const [courses, tasks] = await Promise.all([
    skipped.includes('courses')
      ? Promise.resolve({ ok: false as const, reason: 'unsupported' as const })
      : client.call(
          'core_course_get_enrolled_courses_by_timeline_classification',
          { classification: 'all', limit: 200, offset: 0 },
          (data) => normalizeCourseResponse(data, siteId)
        ),
    skipped.includes('tasks')
      ? Promise.resolve({ ok: false as const, reason: 'unsupported' as const })
      : client.call(
          'core_calendar_get_action_events_by_timesort',
          { timesortfrom: 0, limitnum: TIMELINE_LIMIT, limittononsuspendedevents: true },
          (data) => normalizeTaskResponse(data, siteId, origin)
        )
  ]);
  const source = tasks.ok ? 'ajax' : 'dom';
  const unsupported: TaskAjaxCapability[] = [];
  if (!courses.ok && courses.reason === 'unsupported') unsupported.push('courses');
  if (!tasks.ok && tasks.reason === 'unsupported') unsupported.push('tasks');
  return {
    siteId,
    courses: courses.ok ? courses.data : parseDashboardCourses(doc, siteId),
    tasks: tasks.ok ? tasks.data : parseTimelineTasks(doc, siteId, origin),
    capturedAt: now.toISOString(),
    source,
    ...(unsupported.length > 0 ? { unsupported } : {})
  };
}
