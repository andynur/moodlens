import { useEffect, useState } from 'react';
import {
  Bell,
  CalendarClock,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  ListChecks,
  Pin,
  SlidersHorizontal
} from 'lucide-react';
import {
  DASHBOARD_KEY,
  dueSoon,
  isUrgent,
  moveWidget,
  overdueCount,
  normalizeLayout,
  toggleWidget,
  type DashboardLayout,
  type WidgetId
} from '../../shared/dashboard';
import type { TranslationKey } from '../../shared/i18n';
import { formatRelativeDue } from '../../shared/tasks';
import type { Locale, MoodleTask, Site } from '../../shared/types';
import { isTaskUrl } from '../../shared/validation';
import { courseTitle, openCourse, type CourseEntry } from '../courseEntries';
import { openTask } from '../openTask';
import { hasChrome } from '../useSites';
import { Button, Card, CardTitle, cx, Hint, ProgressBar, type Tone } from '../ui';
import { ChangeList, ColorDot } from './CourseDetail';
import { NewBadge } from './Courses';
import { useXpView } from './Xp';
import type { Feedback } from './Sites';

type WidgetProps = Feedback & {
  entries: CourseEntry[];
  onSelect: (key: string) => void;
  tasks: MoodleTask[];
  sites: Site[];
  locale: Locale;
  /** Course names from task datasets, keyed `<siteId>/<courseId>`, for courses without a snapshot. */
  courseNames: ReadonlyMap<string, string>;
  onOpenTasks: () => void;
};

const widgetMeta: Record<WidgetId, { title: TranslationKey; icon: typeof Bell; tone: Tone }> = {
  dueSoon: { title: 'dueSoon', icon: CalendarClock, tone: 'peach' },
  whatsNew: { title: 'whatsNew', icon: Bell, tone: 'lavender' },
  pinned: { title: 'pinnedCourses', icon: Pin, tone: 'sky' },
  progress: { title: 'courseProgress', icon: ChartColumn, tone: 'mint' },
  streak: { title: 'streak', icon: Flame, tone: 'yellow' }
};

/** XP streak and this week's XP (ML-021); the Study page holds the full card. */
function Streak({ translate }: WidgetProps) {
  const xp = useXpView(0);
  if (!xp) return <Hint>{translate('streakEmpty')}</Hint>;
  return (
    <div className="space-y-1 text-xs">
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl leading-none font-semibold">{xp.streak}</span>
        <span className="text-sm font-medium">{translate('streakDays')}</span>
      </p>
      <p className="text-ink-2">
        {translate('xpLevel')} {xp.level} · {xp.totalXp} {translate('xpTotal')} · {translate('xpWeekProgress')}{' '}
        {xp.weeklyEarned}
        {xp.weeklyGoal > 0 ? `/${xp.weeklyGoal}` : ''}
      </p>
      <p className="text-ink-3">{translate('xpLabel')}</p>
    </div>
  );
}

/** Widget layout kept in `chrome.storage.local`, like language and theme. */
function useLayout(): [DashboardLayout, (next: DashboardLayout) => void] {
  const [layout, setLayout] = useState<DashboardLayout>(() => normalizeLayout(null));
  useEffect(() => {
    if (!hasChrome) return;
    void chrome.storage.local
      .get(DASHBOARD_KEY)
      .then((stored) => setLayout(normalizeLayout(stored[DASHBOARD_KEY])))
      .catch(() => undefined);
  }, []);
  return [
    layout,
    (next) => {
      setLayout(next);
      if (hasChrome) void chrome.storage.local.set({ [DASHBOARD_KEY]: next });
    }
  ];
}

function CourseButton(props: Feedback & { entry: CourseEntry; onSelect: (key: string) => void; showSite?: boolean }) {
  const { entry, translate } = props;
  return (
    <button
      type="button"
      onClick={() => props.onSelect(entry.key)}
      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium hover:text-accent-ink"
    >
      <ColorDot color={entry.prefs.color} />
      <span className="min-w-0 flex-1">
        <span className="block break-words">{courseTitle(entry, translate)}</span>
        {props.showSite && <span className="block text-xs font-normal break-words text-ink-3">{entry.site.label}</span>}
      </span>
    </button>
  );
}

function DueSoon(props: WidgetProps) {
  const { translate, locale } = props;
  const showSite = new Set(props.sites.map((site) => site.id)).size > 1;
  const hidden = new Set(props.entries.filter((entry) => entry.prefs.hidden).map((entry) => entry.key));
  const tasks = dueSoon(props.tasks, hidden);
  const overdue = overdueCount(props.tasks, hidden);
  const overdueLink = overdue > 0 && (
    <button
      type="button"
      onClick={props.onOpenTasks}
      className="mb-2 flex w-full items-center gap-2 rounded-lg bg-error-soft px-3 py-2 text-left text-xs font-medium text-error-ink hover:brightness-95"
    >
      <span className="min-w-0 flex-1">
        {translate('overdueLabel')}: <span className="font-semibold tabular-nums">{overdue}</span>
      </span>
      <ListChecks size={14} aria-hidden="true" />
      {translate('viewTasks')}
    </button>
  );
  if (tasks.length === 0)
    return (
      <>
        {overdueLink}
        <Hint>{translate('dueSoonEmpty')}</Hint>
      </>
    );
  const byKey = new Map(props.entries.map((entry) => [entry.key, entry]));
  return (
    <>
      {overdueLink}
      <ul className="-my-1 divide-y divide-line">
        {tasks.map((task) => {
          const site = props.sites.find((item) => item.id === task.siteId);
          const entry = byKey.get(`${task.siteId}/${task.courseId}`);
          const course = entry
            ? courseTitle(entry, translate)
            : props.courseNames.get(`${task.siteId}/${task.courseId}`);
          return (
            <li
              key={`${task.siteId}|${task.courseId}|${task.url}|${task.dueAt}`}
              className="flex items-center gap-2 py-2"
            >
              <ColorDot color={entry?.prefs.color} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium break-words">{task.title}</span>
                <span className="block text-xs break-words text-ink-2">
                  <span className={cx('font-medium', isUrgent(task.dueAt!) ? 'text-error-ink' : 'text-warning-ink')}>
                    {formatRelativeDue(task.dueAt!, locale)}
                  </span>
                  {course ? ` · ${course}` : ''}
                  {showSite && site ? ` · ${site.label}` : ''}
                </span>
              </span>
              {site && isTaskUrl(task.url, site.origin) && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={translate('open')}
                  title={translate('open')}
                  onClick={() => openTask(task, site)}
                >
                  <ExternalLink size={14} />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Shown on Today until a site is enabled, instead of five empty widgets. */
function GetStarted({ translate }: Pick<WidgetProps, 'translate'>) {
  const steps: TranslationKey[] = ['startStep1', 'startStep2', 'startStep3'];
  return (
    <Card>
      <CardTitle className="mb-3">{translate('startTitle')}</CardTitle>
      <ol className="space-y-3 text-sm leading-relaxed">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden="true"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink"
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">{translate(step)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function WhatsNew(props: WidgetProps) {
  const changed = props.entries.filter((entry) => entry.changes.length > 0);
  const showSite = new Set(props.sites.map((site) => site.id)).size > 1;
  if (changed.length === 0) return <Hint>{props.translate('whatsNewEmpty')}</Hint>;
  return (
    <ul className="space-y-4">
      {changed.map((entry) => (
        <li key={entry.key} className="space-y-2">
          <div className="flex items-center gap-2">
            <CourseButton {...props} entry={entry} showSite={showSite} />
            <NewBadge translate={props.translate} count={entry.changes.length} />
          </div>
          <ChangeList {...props} entry={entry} />
        </li>
      ))}
    </ul>
  );
}

function Pinned(props: WidgetProps) {
  const { translate } = props;
  const pinned = props.entries.filter((entry) => entry.prefs.pinned);
  const showSite = new Set(props.sites.map((site) => site.id)).size > 1;
  if (pinned.length === 0) return <Hint>{translate('pinnedEmpty')}</Hint>;
  return (
    <ul className="-my-1 divide-y divide-line">
      {pinned.map((entry) => (
        <li key={entry.key} className="flex items-center gap-2 py-1.5">
          <CourseButton {...props} entry={entry} showSite={showSite} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={translate('openCourse')}
            title={translate('openCourse')}
            onClick={() => !openCourse(entry) && props.onError('noNavigation')}
          >
            <ExternalLink size={14} />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Progress(props: WidgetProps) {
  if (props.entries.length === 0) return <Hint>{props.translate('noData')}</Hint>;
  const showSite = new Set(props.sites.map((site) => site.id)).size > 1;
  return (
    <ul className="space-y-3">
      {props.entries.map((entry) => {
        const total = entry.snapshot.activities.length;
        const done = entry.snapshot.activities.filter((activity) => activity.completion === 'complete').length;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);
        return (
          <li key={entry.key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CourseButton {...props} entry={entry} showSite={showSite} />
              <span className="shrink-0 text-xs text-ink-2 tabular-nums">
                {done}/{total}
              </span>
            </div>
            <ProgressBar value={percent} tone="success" label={courseTitle(entry, props.translate)} />
          </li>
        );
      })}
    </ul>
  );
}

const widgets: Record<WidgetId, (props: WidgetProps) => React.ReactNode> = {
  dueSoon: DueSoon,
  whatsNew: WhatsNew,
  pinned: Pinned,
  progress: Progress,
  streak: Streak
};

/** Today dashboard (ML-004) from cached data only; hidden courses are left out. */
export function Today(props: WidgetProps) {
  const { translate } = props;
  const [layout, saveLayout] = useLayout();
  const [customizing, setCustomizing] = useState(false);
  const entries = props.entries.filter((entry) => !entry.prefs.hidden);
  const shown = customizing ? layout.order : layout.order.filter((widget) => !layout.hidden.includes(widget));
  if (props.sites.length === 0) return <GetStarted translate={translate} />;
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-semibold">{translate('today')}</h2>
        <Button variant="ghost" aria-pressed={customizing} onClick={() => setCustomizing(!customizing)}>
          <SlidersHorizontal size={14} />
          {translate(customizing ? 'customizeDone' : 'customize')}
        </Button>
      </div>
      {shown.map((widget, index) => {
        const Widget = widgets[widget];
        const meta = widgetMeta[widget];
        const isHidden = layout.hidden.includes(widget);
        return (
          <Card key={widget} variant={isHidden ? 'muted' : 'default'}>
            <CardTitle
              icon={meta.icon}
              tone={meta.tone}
              className="mb-3"
              actions={
                customizing && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={translate('moveUp')}
                      disabled={index === 0}
                      onClick={() => saveLayout(moveWidget(layout, widget, 'up'))}
                    >
                      <ChevronUp size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={translate('moveDown')}
                      disabled={index === shown.length - 1}
                      onClick={() => saveLayout(moveWidget(layout, widget, 'down'))}
                    >
                      <ChevronDown size={14} />
                    </Button>
                    <Button aria-pressed={!isHidden} onClick={() => saveLayout(toggleWidget(layout, widget))}>
                      {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      {translate(isHidden ? 'showWidget' : 'hideWidget')}
                    </Button>
                  </div>
                )
              }
            >
              {translate(meta.title)}
            </CardTitle>
            {customizing && isHidden ? (
              <Hint>{translate('widgetHidden')}</Hint>
            ) : (
              <Widget {...props} entries={entries} />
            )}
          </Card>
        );
      })}
    </>
  );
}
