import { ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { courseTitle, type CourseEntry } from '../courseEntries';
import { sendSiteCommand } from '../useSites';
import { card, ColorDot, smallButton } from './CourseDetail';
import type { Feedback } from './Sites';

function move(entry: CourseEntry, direction: 'up' | 'down', feedback: Feedback) {
  void sendSiteCommand({ type: 'MOVE_COURSE', siteId: entry.site.id, courseId: entry.courseId, direction }).then(
    (ok) => !ok && feedback.onError('siteActionError')
  );
}

export function NewBadge(props: Pick<Feedback, 'translate'> & { count: number }) {
  if (props.count === 0) return null;
  return (
    <span className="shrink-0 rounded-full bg-blue-700 px-2 py-0.5 text-[11px] font-bold text-white">
      {props.count} <span className="sr-only">{props.translate('changesCount')}</span>
    </span>
  );
}

function CourseRow(props: Feedback & { entry: CourseEntry; onSelect: (key: string) => void; showSite: boolean }) {
  const { translate, entry } = props;
  return (
    <li className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => props.onSelect(entry.key)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <ColorDot color={entry.prefs.color} />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold">{courseTitle(entry, translate)}</span>
          {props.showSite && (
            <span className="block break-words text-xs text-slate-500 dark:text-slate-400">{entry.site.label}</span>
          )}
        </span>
        {entry.prefs.pinned && <Pin size={13} aria-label={translate('pinned')} className="shrink-0 text-blue-600" />}
        <NewBadge translate={translate} count={entry.changes.length} />
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          aria-label={translate('moveUp')}
          className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => move(entry, 'up', props)}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          aria-label={translate('moveDown')}
          className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={() => move(entry, 'down', props)}
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </li>
  );
}

export function CourseList(props: Feedback & { entries: CourseEntry[]; onSelect: (key: string) => void }) {
  const { translate, entries } = props;
  if (entries.length === 0) {
    return (
      <section className={card}>
        <p className="text-sm text-slate-500 dark:text-slate-400">{translate('noData')}</p>
      </section>
    );
  }
  const showSite = new Set(entries.map((entry) => entry.site.id)).size > 1;
  const visible = entries.filter((entry) => !entry.prefs.hidden);
  const hidden = entries.filter((entry) => entry.prefs.hidden);
  return (
    <>
      <ul className="space-y-2">
        {visible.map((entry) => (
          <CourseRow key={entry.key} entry={entry} showSite={showSite} {...props} />
        ))}
      </ul>
      {hidden.length > 0 && (
        <details className={card}>
          <summary className={`${smallButton} cursor-pointer border-none p-0`}>
            {translate('hiddenCourses')} ({hidden.length})
          </summary>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{translate('hiddenCoursesHint')}</p>
          <ul className="mt-2 space-y-2">
            {hidden.map((entry) => (
              <CourseRow key={entry.key} entry={entry} showSite={showSite} {...props} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
