import type { MoodleTask, Site } from '../shared/types';
import { isTaskUrl } from '../shared/validation';
import { hasChrome } from './useSites';

/**
 * Opens a task in Moodle and reports it for early-start XP (ML-021). The background decides whether
 * it earns anything: only a task opened at least 3 days before its deadline, and only once.
 */
export function openTask(task: MoodleTask, site: Site | undefined): void {
  if (!hasChrome || !site || !isTaskUrl(task.url, site.origin)) return;
  void chrome.tabs.create({ url: task.url });
  if (!task.dueAt) return;
  const taskId = `${task.siteId}/${task.activityId ?? task.url}`;
  void chrome.runtime.sendMessage({ type: 'TASK_OPENED', taskId, dueAt: task.dueAt }).catch(() => undefined);
}
