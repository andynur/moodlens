import { useMemo, useState } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { tasksToIcs } from '../../shared/ics';
import { filterTasks, mergeTaskDatasets, taskGroup, taskIdentity, type TaskGroup } from '../../shared/tasks';
import type { Locale, Site, TaskKind } from '../../shared/types';
import { isTaskUrl } from '../../shared/validation';
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

export function TasksView({ sites, locale }: { sites: Site[]; locale: Locale }) {
  const datasets = useTaskData(sites);
  const [siteId, setSiteId] = useState('');
  const [courseKey, setCourseKey] = useState('');
  const [kind, setKind] = useState<TaskKind | ''>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const all = useMemo(() => mergeTaskDatasets(Object.values(datasets)), [datasets]);
  const shown = useMemo(() => {
    const filtered = filterTasks(all, {
      siteId: siteId || undefined,
      kind: kind || undefined,
      search
    });
    return courseKey ? filtered.filter((task) => `${task.siteId}:${task.courseId}` === courseKey) : filtered;
  }, [all, siteId, courseKey, kind, search]);
  const courses = Object.values(datasets).flatMap((dataset) => dataset.courses);
  const courseName = new Map(courses.map((course) => [`${course.siteId}:${course.id}`, course.name]));
  const siteName = new Map(sites.map((site) => [site.id, site.label]));
  const latest = Object.values(datasets).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];

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
      {latest && (
        <p className="text-xs text-slate-500">
          {taskText(locale, 'lastUpdated')}:{' '}
          {new Date(latest.capturedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')} ·{' '}
          {taskText(locale, 'source')}: {latest.source.toUpperCase()}
        </p>
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
                          {new Date(task.dueAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}
                        </time>
                      )}
                      {site && (
                        <button
                          type="button"
                          onClick={() => isTaskUrl(task.url, site.origin) && chrome.tabs.create({ url: task.url })}
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
