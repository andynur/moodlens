import { ChevronDown, ChevronRight, ChevronUp, Pin } from 'lucide-react';
import { courseTitle, type CourseEntry } from '../courseEntries';
import { sendSiteCommand } from '../useSites';
import { Badge, Button, buttonClass, Card, cardClass, Hint } from '../ui';
import { ColorDot } from './CourseDetail';
import type { Feedback } from './Sites';

function move(entry: CourseEntry, direction: 'up' | 'down', feedback: Feedback) {
  void sendSiteCommand({ type: 'MOVE_COURSE', siteId: entry.site.id, courseId: entry.courseId, direction }).then(
    (ok) => !ok && feedback.onError('siteActionError')
  );
}

export function NewBadge(props: Pick<Feedback, 'translate'> & { count: number }) {
  if (props.count === 0) return null;
  return (
    <Badge tone="solid">
      {props.count} <span className="sr-only">{props.translate('changesCount')}</span>
    </Badge>
  );
}

function CourseRow(props: Feedback & { entry: CourseEntry; onSelect: (key: string) => void; showSite: boolean }) {
  const { translate, entry } = props;
  return (
    <li className="flex items-center gap-1 border-b border-line py-1 pr-1 pl-3 last:border-b-0">
      <button
        type="button"
        onClick={() => props.onSelect(entry.key)}
        className="group flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
      >
        <ColorDot color={entry.prefs.color} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium break-words group-hover:text-accent-ink">
            {courseTitle(entry, translate)}
          </span>
          {props.showSite && <span className="block text-xs break-words text-ink-3">{entry.site.label}</span>}
        </span>
        {entry.prefs.pinned && <Pin size={13} aria-label={translate('pinned')} className="shrink-0 text-accent-ink" />}
        <NewBadge translate={translate} count={entry.changes.length} />
        <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-ink-3" />
      </button>
      <div className="flex shrink-0 flex-col">
        <Button variant="ghost" size="icon" aria-label={translate('moveUp')} onClick={() => move(entry, 'up', props)}>
          <ChevronUp size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={translate('moveDown')}
          onClick={() => move(entry, 'down', props)}
        >
          <ChevronDown size={14} />
        </Button>
      </div>
    </li>
  );
}

const listClass = `overflow-hidden ${cardClass('default', false)}`;

export function CourseList(props: Feedback & { entries: CourseEntry[]; onSelect: (key: string) => void }) {
  const { translate, entries } = props;
  if (entries.length === 0) {
    return (
      <Card>
        <Hint>{translate('noData')}</Hint>
      </Card>
    );
  }
  const showSite = new Set(entries.map((entry) => entry.site.id)).size > 1;
  const visible = entries.filter((entry) => !entry.prefs.hidden);
  const hidden = entries.filter((entry) => entry.prefs.hidden);
  return (
    <>
      <h2 className="px-1 text-lg font-semibold">{translate('courses')}</h2>
      {visible.length > 0 && (
        <ul className={listClass}>
          {visible.map((entry) => (
            <CourseRow key={entry.key} entry={entry} showSite={showSite} {...props} />
          ))}
        </ul>
      )}
      {hidden.length > 0 && (
        <details className={cardClass()}>
          <summary className={buttonClass('ghost', 'sm', '-m-1')}>
            {translate('hiddenCourses')} ({hidden.length})
          </summary>
          <Hint className="mt-2">{translate('hiddenCoursesHint')}</Hint>
          <ul className={`mt-2 overflow-hidden ${cardClass('flat', false)}`}>
            {hidden.map((entry) => (
              <CourseRow key={entry.key} entry={entry} showSite={showSite} {...props} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
