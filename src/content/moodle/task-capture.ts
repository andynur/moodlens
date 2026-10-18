import type { TaskDataset } from '../../shared/types';
import { MoodleAjaxClient } from './ajax';
import { normalizeCourseResponse, normalizeTaskResponse } from './ajax-data';
import { parseDashboardCourses, parseTimelineTasks } from './timeline';

export async function captureTaskDataset(
  doc: Document,
  pageUrl: string,
  siteId: string,
  now = new Date(),
  client = new MoodleAjaxClient(doc, pageUrl)
): Promise<TaskDataset> {
  const origin = new URL(pageUrl).origin;
  const [courses, tasks] = await Promise.all([
    client.call(
      'core_course_get_enrolled_courses_by_timeline_classification',
      { classification: 'all', limit: 200, offset: 0 },
      (data) => normalizeCourseResponse(data, siteId)
    ),
    client.call(
      'core_calendar_get_action_events_by_timesort',
      { timesortfrom: 0, limitnum: 500, limittononsuspendedevents: true },
      (data) => normalizeTaskResponse(data, siteId, origin)
    )
  ]);
  const source = tasks.ok ? 'ajax' : 'dom';
  return {
    siteId,
    courses: courses.ok ? courses.data : parseDashboardCourses(doc, siteId),
    tasks: tasks.ok ? tasks.data : parseTimelineTasks(doc, siteId, origin),
    capturedAt: now.toISOString(),
    source
  };
}
