import { useEffect, useMemo, useState } from 'react';
import { BellRing, Download, ExternalLink, RefreshCw, Search } from 'lucide-react';
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
import { hasChrome } from '../useSites';
import { useTaskData } from '../useTaskData';
import { Alert, Badge, Button, Card, cardClass, CardTitle, Checkbox, cx, Hint, Input, Select, type Tone } from '../ui';

const groups: TaskGroup[] = ['overdue', 'today', 'thisWeek', 'later', 'noDate'];
const kinds: TaskKind[] = ['assign', 'quiz', 'attendance', 'forum', 'event', 'other'];
const groupStyle: Record<TaskGroup, { tone: Tone; dueClass: string }> = {
  overdue: { tone: 'rose', dueClass: 'text-error-ink' },
  today: { tone: 'peach', dueClass: 'text-warning-ink' },
  thisWeek: { tone: 'yellow', dueClass: 'text-ink' },
  later: { tone: 'sky', dueClass: 'text-ink-2' },
  noDate: { tone: 'neutral', dueClass: 'text-ink-2' }
};

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
    if (!hasChrome) return;
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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-semibold">{taskText(locale, 'tasks')}</h2>
        <Button onClick={() => void refresh()}>
          <RefreshCw size={14} /> {taskText(locale, 'refresh')}
        </Button>
      </div>
      {datasetList.length > 0 && (
        <div className="space-y-0.5 px-1 text-[11px] text-ink-3">
          {datasetList.map((dataset) => (
            <p key={dataset.siteId}>
              <span className="font-medium text-ink-2">{siteName.get(dataset.siteId) ?? dataset.siteId}</span> ·{' '}
              {taskText(locale, 'lastUpdated')}:{' '}
              {new Date(dataset.capturedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')} ·{' '}
              {taskText(locale, 'source')}: {dataset.source.toUpperCase()}
            </p>
          ))}
        </div>
      )}
      {message && (
        <Alert tone="warning" role="status">
          {message}
        </Alert>
      )}
      <div className="relative">
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={taskText(locale, 'search')}
          aria-label={taskText(locale, 'search')}
          leading
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={siteId}
          onChange={(event) => {
            setSiteId(event.target.value);
            setCourseKey('');
          }}
          aria-label={taskText(locale, 'allSites')}
          compact
        >
          <option value="">{taskText(locale, 'allSites')}</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.label}
            </option>
          ))}
        </Select>
        <Select
          value={courseKey}
          onChange={(event) => setCourseKey(event.target.value)}
          aria-label={taskText(locale, 'allCourses')}
          compact
        >
          <option value="">{taskText(locale, 'allCourses')}</option>
          {courses
            .filter((course) => !siteId || course.siteId === siteId)
            .map((course) => (
              <option key={`${course.siteId}:${course.id}`} value={`${course.siteId}:${course.id}`}>
                {course.name}
              </option>
            ))}
        </Select>
        <Select
          value={kind}
          onChange={(event) => setKind(event.target.value as TaskKind | '')}
          aria-label={taskText(locale, 'allTypes')}
          compact
        >
          <option value="">{taskText(locale, 'allTypes')}</option>
          {kinds.map((value) => (
            <option key={value} value={value}>
              {taskKindText(locale, value)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setSelected(new Set(shown.map(taskIdentity)))}>
          {taskText(locale, 'selectAll')}
        </Button>
        <Button onClick={() => exportTasks(true)}>
          <Download size={14} />
          {taskText(locale, 'exportSelected')}
        </Button>
        <Button onClick={() => exportTasks(false)}>
          <Download size={14} />
          {taskText(locale, 'exportAll')}
        </Button>
      </div>
      <Card className="space-y-3">
        <CardTitle icon={BellRing} tone="lavender">
          {taskText(locale, 'reminders')}
        </CardTitle>
        <Hint>{taskText(locale, 'remindersHint')}</Hint>
        <Checkbox
          checked={reminders.enabled}
          onChange={(event) => void saveReminders(event.target.checked)}
          label={taskText(locale, 'remindersOn')}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {REMINDER_LEADS.map((lead) => (
            <Checkbox
              key={lead}
              className="text-xs"
              disabled={!reminders.enabled}
              checked={reminders.leadMinutes.includes(lead)}
              onChange={(event) => {
                const leads = event.target.checked
                  ? [...reminders.leadMinutes, lead]
                  : reminders.leadMinutes.filter((value) => value !== lead);
                if (leads.length > 0) void saveReminders(reminders.enabled, leads);
              }}
              label={taskText(locale, lead === 60 ? 'reminder1h' : lead === 180 ? 'reminder3h' : 'reminder1d')}
            />
          ))}
        </div>
      </Card>
      {shown.length === 0 && (
        <Card>
          <Hint>{taskText(locale, 'noTasks')}</Hint>
        </Card>
      )}
      {groups.map((group) => {
        const items = shown.filter((task) => taskGroup(task) === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="space-y-2">
            <h3 className="flex items-center gap-2 px-1 text-sm font-semibold">
              {taskText(locale, group)}
              <Badge tone={groupStyle[group].tone}>{items.length}</Badge>
            </h3>
            <div className={`overflow-hidden ${cardClass('default', false)}`}>
              {items.map((task) => {
                const identity = taskIdentity(task);
                const site = sites.find((item) => item.id === task.siteId);
                return (
                  <article
                    key={identity}
                    className={cx(
                      'flex gap-3 border-b border-line p-3 last:border-b-0',
                      selected.has(identity) && 'bg-accent-soft'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
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
                      <h4 className="text-sm font-medium break-words">{task.title}</h4>
                      <p className="mt-0.5 text-xs text-ink-3">
                        {courseName.get(`${task.siteId}:${task.courseId}`) ?? task.courseId} ·{' '}
                        {siteName.get(task.siteId)} · {taskKindText(locale, task.kind)}
                      </p>
                      {task.dueAt && (
                        <time className="mt-1 block text-xs" dateTime={task.dueAt}>
                          <span className={cx('font-medium', groupStyle[group].dueClass)}>
                            {formatRelativeDue(task.dueAt, locale)}
                          </span>{' '}
                          <span className="text-ink-3">
                            · {new Date(task.dueAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}
                          </span>
                        </time>
                      )}
                      {site && (
                        <Button variant="link" className="mt-1.5 text-xs" onClick={() => openTask(task, site)}>
                          <ExternalLink size={12} />
                          {taskText(locale, 'openTask')}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
