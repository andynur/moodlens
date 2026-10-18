import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { tasksToIcs } from '../../shared/ics';
import {
  DEFAULT_REMINDER_PREFS,
  normalizeReminderPrefs,
  REMINDER_LEADS,
  REMINDER_PREFS_KEY
} from '../../shared/reminders';
import {
  filterTasks,
  formatRelativeDue,
  mergeTaskDatasets,
  taskGroup,
  taskIdentity,
  type TaskGroup
} from '../../shared/tasks';
import type { Locale, Site, TaskKind } from '../../shared/types';
import { openTask } from '../openTask';
import { taskKindText, taskText } from '../taskStrings';
import { useTaskData } from '../useTaskData';

const groups: TaskGroup[] = ['overdue', 'today', 'thisWeek', 'later', 'noDate'];
const kinds: TaskKind[] = ['assign', 'quiz', 'attendance', 'forum', 'event', 'other'];

function saveIcs(content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'moodlens-tasks.ics';
  anchor.click();
  URL.revokeObjectURL(url);
}

/** `hidden` holds `<siteId>/<courseId>` keys of courses the student hid (PRD-009); they stay in storage. */
export function TasksView({ sites, locale, hidden }: { sites: Site[]; locale: Locale; hidden: ReadonlySet<string> }) {
  const datasets = useTaskData(sites);
  const [siteId, setSiteId] = useState('');
  const [courseKey, setCourseKey] = useState('');
  const [kind, setKind] = useState<TaskKind | ''>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [reminders, setReminders] = useState(DEFAULT_REMINDER_PREFS);
  const all = useMemo(
    () => mergeTaskDatasets(Object.values(datasets)).filter((task) => !hidden.has(`${task.siteId}/${task.courseId}`)),
    [datasets, hidden]
  );
  const shown = useMemo(() => {
    const filtered = filterTasks(all, {
      siteId: siteId || undefined,
      kind: kind || undefined,
      search
    });
    return courseKey ? filtered.filter((task) => `${task.siteId}:${task.courseId}` === courseKey) : filtered;
  }, [all, siteId, courseKey, kind, search]);
  const courses = Object.values(datasets)
    .flatMap((dataset) => dataset.courses)
    .filter((course) => !hidden.has(`${course.siteId}/${course.id}`));
  const courseName = new Map(courses.map((course) => [`${course.siteId}:${course.id}`, course.name]));
  const siteName = new Map(sites.map((site) => [site.id, site.label]));
  const datasetList = Object.values(datasets).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

  useEffect(() => {
    if (typeof chrome === 'undefined') return;
    void chrome.storage.local.get(REMINDER_PREFS_KEY).then((stored) => {
      const prefs = normalizeReminderPrefs(stored[REMINDER_PREFS_KEY]);
      if (prefs) setReminders(prefs);
    });
  }, []);

  async function saveReminders(enabled: boolean, leadMinutes = reminders.leadMinutes) {
    if (enabled) {
      const granted = await chrome.permissions.request({ permissions: ['notifications'] }).catch(() => false);
      if (!granted) return setMessage(taskText(locale, 'reminderDenied'));
    }
    const next = { enabled, leadMinutes };
    const response = (await chrome.runtime.sendMessage({ type: 'SET_REMINDERS', prefs: next }).catch(() => null)) as {
      ok?: boolean;
    } | null;
    if (response?.ok) setReminders(next);
    if (!enabled) void chrome.permissions.remove({ permissions: ['notifications'] });
  }

  function exportTasks(selectedOnly: boolean) {
    const candidates = selectedOnly ? shown.filter((task) => selected.has(taskIdentity(task))) : shown;
    if (!candidates.some((task) => task.dueAt)) return setMessage(taskText(locale, 'exportEmpty'));
    saveIcs(tasksToIcs(candidates));
    setMessage('');
  }

  async function refresh() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
    const origin = tab?.url ? new URL(tab.url).origin : '';
    const site = sites.find((candidate) => candidate.origin === origin);
    if (tab?.id === undefined || !site) return setMessage(taskText(locale, 'refreshError'));
    const sent = await chrome.tabs
      .sendMessage(tab.id, { type: 'REFRESH_TASKS' })
      .then(() => true)
      .catch(() => false);
    setMessage(taskText(locale, sent ? 'refreshedHint' : 'refreshError'));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{taskText(locale, 'tasks')}</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1 rounded-lg border p-2 text-xs font-semibold"
        >
          <RefreshCw size={13} /> {taskText(locale, 'refresh')}
        </button>
      </div>
      {datasetList.length > 0 && (
        <div className="space-y-1 text-xs text-slate-500">
          {datasetList.map((dataset) => (
            <p key={dataset.siteId}>
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {siteName.get(dataset.siteId) ?? dataset.siteId}
              </span>{' '}
              · {taskText(locale, 'lastUpdated')}:{' '}
              {new Date(dataset.capturedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')} ·{' '}
              {taskText(locale, 'source')}: {dataset.source.toUpperCase()}
            </p>
          ))}
        </div>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          {message}
        </p>
      )}
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={taskText(locale, 'search')}
        aria-label={taskText(locale, 'search')}
        className="w-full rounded-lg border bg-white p-2 text-sm dark:bg-slate-900"
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={siteId}
          onChange={(event) => {
            setSiteId(event.target.value);
            setCourseKey('');
          }}
          aria-label={taskText(locale, 'allSites')}
          className="min-w-0 rounded-lg border bg-white p-2 text-xs dark:bg-slate-900"
        >
          <option value="">{taskText(locale, 'allSites')}</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.label}
            </option>
          ))}
        </select>
        <select
          value={courseKey}
          onChange={(event) => setCourseKey(event.target.value)}
          aria-label={taskText(locale, 'allCourses')}
          className="min-w-0 rounded-lg border bg-white p-2 text-xs dark:bg-slate-900"
        >
          <option value="">{taskText(locale, 'allCourses')}</option>
          {courses
            .filter((course) => !siteId || course.siteId === siteId)
            .map((course) => (
              <option key={`${course.siteId}:${course.id}`} value={`${course.siteId}:${course.id}`}>
                {course.name}
              </option>
            ))}
        </select>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as TaskKind | '')}
          aria-label={taskText(locale, 'allTypes')}
          className="min-w-0 rounded-lg border bg-white p-2 text-xs dark:bg-slate-900"
        >
          <option value="">{taskText(locale, 'allTypes')}</option>
          {kinds.map((value) => (
            <option key={value} value={value}>
              {taskKindText(locale, value)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border p-2 text-xs"
          onClick={() => setSelected(new Set(shown.map(taskIdentity)))}
        >
          {taskText(locale, 'selectAll')}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border p-2 text-xs"
          onClick={() => exportTasks(true)}
        >
          <Download size={13} />
          {taskText(locale, 'exportSelected')}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border p-2 text-xs"
          onClick={() => exportTasks(false)}
        >
          <Download size={13} />
          {taskText(locale, 'exportAll')}
        </button>
      </div>
      <fieldset className="space-y-2 rounded-xl border bg-white p-3 dark:bg-slate-900">
        <legend className="px-1 text-sm font-semibold">{taskText(locale, 'reminders')}</legend>
        <p className="text-xs text-slate-500">{taskText(locale, 'remindersHint')}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reminders.enabled}
            onChange={(event) => void saveReminders(event.target.checked)}
          />
          {taskText(locale, 'remindersOn')}
        </label>
        <div className="flex flex-wrap gap-3 text-xs">
          {REMINDER_LEADS.map((lead) => (
            <label key={lead} className="flex items-center gap-1">
              <input
                type="checkbox"
                disabled={!reminders.enabled}
                checked={reminders.leadMinutes.includes(lead)}
                onChange={(event) => {
                  const leads = event.target.checked
                    ? [...reminders.leadMinutes, lead]
                    : reminders.leadMinutes.filter((value) => value !== lead);
                  if (leads.length > 0) void saveReminders(reminders.enabled, leads);
                }}
              />
              {taskText(locale, lead === 60 ? 'reminder1h' : lead === 180 ? 'reminder3h' : 'reminder1d')}
            </label>
          ))}
        </div>
      </fieldset>
      {shown.length === 0 && (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-500 dark:bg-slate-900">
          {taskText(locale, 'noTasks')}
        </p>
      )}
      {groups.map((group) => {
        const items = shown.filter((task) => taskGroup(task) === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="space-y-2">
            <h3 className="text-sm font-semibold">{taskText(locale, group)}</h3>
            {items.map((task) => {
              const identity = taskIdentity(task);
              const site = sites.find((item) => item.id === task.siteId);
              return (
                <article key={identity} className="rounded-xl border bg-white p-3 dark:bg-slate-900">
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(identity)}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(identity);
                          else next.delete(identity);
                          return next;
                        })
                      }
                      aria-label={task.title}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="break-words text-sm font-semibold">{task.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {courseName.get(`${task.siteId}:${task.courseId}`) ?? task.courseId} ·{' '}
                        {siteName.get(task.siteId)} · {taskKindText(locale, task.kind)}
                      </p>
                      {task.dueAt && (
                        <time className="mt-1 block text-xs" dateTime={task.dueAt}>
                          {formatRelativeDue(task.dueAt, locale)} ·{' '}
                          {new Date(task.dueAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}
                        </time>
                      )}
                      {site && (
                        <button
                          type="button"
                          onClick={() => openTask(task, site)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700"
                        >
                          <ExternalLink size={12} />
                          {taskText(locale, 'openTask')}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
