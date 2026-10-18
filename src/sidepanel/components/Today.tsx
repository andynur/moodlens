import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, ExternalLink, Flame, SlidersHorizontal } from 'lucide-react';
import {
  DASHBOARD_KEY,
  dueSoon,
  moveWidget,
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
import { card, ChangeList, ColorDot, smallButton } from './CourseDetail';
import { NewBadge } from './Courses';
import { useXpView } from './Xp';
import type { Feedback } from './Sites';

type WidgetProps = Feedback & {
  entries: CourseEntry[];
  onSelect: (key: string) => void;
  tasks: MoodleTask[];
  sites: Site[];
  locale: Locale;
};

const widgetTitle: Record<WidgetId, TranslationKey> = {
  dueSoon: 'dueSoon',
  whatsNew: 'whatsNew',
  pinned: 'pinnedCourses',
  progress: 'courseProgress',
  streak: 'streak'
};

/** XP streak and this week's XP (ML-021); the Study page holds the full card. */
function Streak({ translate }: WidgetProps) {
  const xp = useXpView(0);
  if (!xp) return <p className="text-xs text-slate-500 dark:text-slate-400">{translate('streakEmpty')}</p>;
  return (
    <div className="space-y-1 text-xs">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Flame size={15} className="text-amber-600" />
        {xp.streak} {translate('streakDays')}
      </p>
      <p className="text-slate-500 dark:text-slate-400">
        {translate('xpLevel')} {xp.level} · {xp.totalXp} {translate('xpTotal')} · {translate('xpWeekProgress')}{' '}
        {xp.weeklyEarned}
        {xp.weeklyGoal > 0 ? `/${xp.weeklyGoal}` : ''}
      </p>
      <p className="text-slate-500 dark:text-slate-400">{translate('xpLabel')}</p>
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

function CourseButton(props: Feedback & { entry: CourseEntry; onSelect: (key: string) => void }) {
  const { entry, translate } = props;
  return (
    <button
      type="button"
      onClick={() => props.onSelect(entry.key)}
      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold"
    >
      <ColorDot color={entry.prefs.color} />
      <span className="min-w-0 flex-1 break-words">{courseTitle(entry, translate)}</span>
    </button>
  );
}

function DueSoon(props: WidgetProps) {
  const { translate, locale } = props;
  const hidden = new Set(props.entries.filter((entry) => entry.prefs.hidden).map((entry) => entry.key));
  const tasks = dueSoon(props.tasks, hidden);
  if (tasks.length === 0)
    return <p className="text-xs text-slate-500 dark:text-slate-400">{translate('dueSoonEmpty')}</p>;
  const byKey = new Map(props.entries.map((entry) => [entry.key, entry]));
  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const site = props.sites.find((item) => item.id === task.siteId);
        const entry = byKey.get(`${task.siteId}/${task.courseId}`);
        return (
          <li key={`${task.siteId}|${task.courseId}|${task.url}|${task.dueAt}`} className="flex items-center gap-2">
            <ColorDot color={entry?.prefs.color} />
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-semibold">{task.title}</span>
              <span className="block break-words text-xs text-slate-500 dark:text-slate-400">
                {formatRelativeDue(task.dueAt!, locale)}
                {entry ? ` · ${courseTitle(entry, translate)}` : ''}
              </span>
            </span>
            {site && isTaskUrl(task.url, site.origin) && (
              <button
                type="button"
                aria-label={translate('open')}
                title={translate('open')}
                className="shrink-0 rounded p-1 text-blue-700 hover:bg-slate-100 dark:text-blue-400 dark:hover:bg-slate-800"
                onClick={() => openTask(task, site)}
              >
                <ExternalLink size={14} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function WhatsNew(props: WidgetProps) {
  const changed = props.entries.filter((entry) => entry.changes.length > 0);
  if (changed.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{props.translate('whatsNewEmpty')}</p>;
  }
  return (
    <ul className="space-y-3">
      {changed.map((entry) => (
        <li key={entry.key} className="space-y-2">
          <div className="flex items-center gap-2">
            <CourseButton {...props} entry={entry} />
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
  if (pinned.length === 0)
    return <p className="text-xs text-slate-500 dark:text-slate-400">{translate('pinnedEmpty')}</p>;
  return (
    <ul className="space-y-2">
      {pinned.map((entry) => (
        <li key={entry.key} className="flex items-center gap-2">
          <CourseButton {...props} entry={entry} />
          <button
            type="button"
            aria-label={translate('openCourse')}
            title={translate('openCourse')}
            className="shrink-0 rounded p-1 text-blue-700 hover:bg-slate-100 dark:text-blue-400 dark:hover:bg-slate-800"
            onClick={() => !openCourse(entry) && props.onError('noNavigation')}
          >
            <ExternalLink size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Progress(props: WidgetProps) {
  if (props.entries.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{props.translate('noData')}</p>;
  }
  return (
    <ul className="space-y-3">
      {props.entries.map((entry) => {
        const total = entry.snapshot.activities.length;
        const done = entry.snapshot.activities.filter((activity) => activity.completion === 'complete').length;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);
        return (
          <li key={entry.key} className="space-y-1">
            <div className="flex items-center gap-2">
              <CourseButton {...props} entry={entry} />
              <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                {done}/{total}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={courseTitle(entry, props.translate)}
              className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
            </div>
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
  return (
    <>
      <div className="flex justify-end">
        <button type="button" className={smallButton} onClick={() => setCustomizing(!customizing)}>
          <SlidersHorizontal size={13} />
          {translate(customizing ? 'customizeDone' : 'customize')}
        </button>
      </div>
      {shown.map((widget, index) => {
        const Widget = widgets[widget];
        const isHidden = layout.hidden.includes(widget);
        return (
          <section key={widget} className={`${card} ${isHidden ? 'opacity-60' : ''}`}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="min-w-0 flex-1 text-sm font-semibold">{translate(widgetTitle[widget])}</h2>
              {customizing && (
                <>
                  <button
                    type="button"
                    aria-label={translate('moveUp')}
                    disabled={index === 0}
                    className="rounded p-1 disabled:opacity-30"
                    onClick={() => saveLayout(moveWidget(layout, widget, 'up'))}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={translate('moveDown')}
                    disabled={index === shown.length - 1}
                    className="rounded p-1 disabled:opacity-30"
                    onClick={() => saveLayout(moveWidget(layout, widget, 'down'))}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    aria-pressed={!isHidden}
                    className={smallButton}
                    onClick={() => saveLayout(toggleWidget(layout, widget))}
                  >
                    {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    {translate(isHidden ? 'showWidget' : 'hideWidget')}
                  </button>
                </>
              )}
            </div>
            {customizing && isHidden ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">{translate('widgetHidden')}</p>
            ) : (
              <Widget {...props} entries={entries} />
            )}
          </section>
        );
      })}
    </>
  );
}
