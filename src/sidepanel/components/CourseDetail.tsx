import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  CircleDashed,
  CircleHelp,
  ExternalLink,
  Lock,
  Palette,
  Pin
} from 'lucide-react';
import { COURSE_COLORS, type CourseColor, type CoursePrefs } from '../../shared/courses';
import type { ActivityChange } from '../../shared/diff';
import type { TranslationKey } from '../../shared/i18n';
import type { ActivityType, CompletionStatus, Locale } from '../../shared/types';
import { isActivityUrl } from '../../shared/validation';
import { colorDot, colorLabel, courseTitle, openCourse, type CourseEntry } from '../courseEntries';
import { hasChrome, sendSiteCommand } from '../useSites';
import { Badge, Button, Card, CardTitle, cx, Hint, Input, SectionLabel, type Tone } from '../ui';
import { ActivityNote, FocusCard } from './Focus';
import type { Feedback } from './Sites';

const completionStyle: Record<CompletionStatus, string> = {
  complete: 'text-success-ink',
  incomplete: 'text-warning-ink',
  unknown: 'text-ink-3'
};
const typeLabel: Record<ActivityType, TranslationKey> = {
  resource: 'activityResource',
  page: 'activityPage',
  url: 'activityUrl',
  attendance: 'activityAttendance',
  quiz: 'activityQuiz',
  forum: 'activityForum',
  assign: 'activityAssign',
  folder: 'activityFolder',
  book: 'activityBook',
  feedback: 'activityFeedback',
  unknown: 'activityUnknown'
};
export const completionLabel: Record<CompletionStatus, TranslationKey> = {
  complete: 'completed',
  incomplete: 'incomplete',
  unknown: 'unknown'
};
const changeLabel: Record<ActivityChange['kind'], TranslationKey> = {
  added: 'changeAdded',
  removed: 'changeRemoved',
  renamed: 'changeRenamed',
  completion: 'changeCompletion'
};
const changeTone: Record<ActivityChange['kind'], Tone> = {
  added: 'mint',
  removed: 'rose',
  renamed: 'sky',
  completion: 'lavender'
};

export function ColorDot({ color }: { color: CourseColor | undefined }) {
  if (!color) return null;
  return <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${colorDot[color]}`} />;
}

/** Unseen changes of one course with a local "Mark as seen" control. */
export function ChangeList(props: Feedback & { entry: CourseEntry }) {
  const { translate, entry } = props;
  if (entry.changes.length === 0) return null;
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5 text-xs">
        {entry.changes.map((change) => (
          <li key={`${change.kind}-${change.activityId}`} className="flex items-start gap-2 break-words">
            <Badge tone={changeTone[change.kind]}>{translate(changeLabel[change.kind])}</Badge>
            <span className="min-w-0 flex-1 pt-0.5">
              {change.title}
              {change.kind === 'renamed' && (
                <span className="text-ink-2">
                  {' '}
                  ({translate('changeRenamedFrom')} {change.previousTitle})
                </span>
              )}
              {change.kind === 'completion' && (
                <span className="text-ink-2">
                  {' '}
                  ({translate(completionLabel[change.previous])} → {translate(completionLabel[change.current])})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <Button
        title={translate('markSeenHint')}
        onClick={() =>
          void sendSiteCommand({ type: 'MARK_COURSE_SEEN', siteId: entry.site.id, courseId: entry.courseId }).then(
            (ok) => !ok && props.onError('siteActionError')
          )
        }
      >
        <CheckCircle2 size={14} />
        {translate('markSeen')}
      </Button>
    </div>
  );
}

function savePrefs(entry: CourseEntry, prefs: CoursePrefs, feedback: Feedback) {
  void sendSiteCommand({ type: 'SET_COURSE_PREFS', siteId: entry.site.id, courseId: entry.courseId, prefs }).then(
    (ok) => !ok && feedback.onError('siteActionError')
  );
}

/** Pin, hide, nickname and color of one course (ML-016). */
function Personalize(props: Feedback & { entry: CourseEntry }) {
  const { translate, entry } = props;
  // The background keeps the manual position; it is not edited here.
  const prefs = entry.prefs;
  const [nickname, setNickname] = useState(prefs.nickname ?? '');
  return (
    <Card className="space-y-3">
      <CardTitle icon={Palette} tone="rose">
        {translate('personalize')}
      </CardTitle>
      <Hint>{translate('personalizeHint')}</Hint>
      <div className="flex flex-wrap gap-2">
        <Button
          aria-pressed={Boolean(prefs.pinned)}
          onClick={() => savePrefs(entry, { ...prefs, pinned: prefs.pinned ? undefined : true }, props)}
        >
          <Pin size={14} />
          {translate(prefs.pinned ? 'unpin' : 'pin')}
        </Button>
        <Button
          aria-pressed={Boolean(prefs.hidden)}
          onClick={() => savePrefs(entry, { ...prefs, hidden: prefs.hidden ? undefined : true }, props)}
        >
          {translate(prefs.hidden ? 'showCourse' : 'hideCourse')}
        </Button>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          savePrefs(entry, { ...prefs, nickname: nickname.trim() || undefined }, props);
        }}
      >
        <Input
          aria-label={translate('nickname')}
          placeholder={translate('nickname')}
          value={nickname}
          maxLength={60}
          onChange={(event) => setNickname(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="md">
          {translate('save')}
        </Button>
      </form>
      <fieldset>
        <legend>
          <SectionLabel>{translate('colorTag')}</SectionLabel>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button aria-pressed={!prefs.color} onClick={() => savePrefs(entry, { ...prefs, color: undefined }, props)}>
            {translate('colorNone')}
          </Button>
          {COURSE_COLORS.map((color) => (
            <Button
              key={color}
              aria-pressed={prefs.color === color}
              aria-label={translate(colorLabel[color])}
              title={translate(colorLabel[color])}
              className={cx('w-8 justify-center', prefs.color === color && 'ring-2 ring-brand-600/30')}
              onClick={() => savePrefs(entry, { ...prefs, color }, props)}
            >
              <ColorDot color={color} />
            </Button>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

export function CourseDetail(props: Feedback & { entry: CourseEntry; locale: Locale; onBack: () => void }) {
  const { translate, entry, locale } = props;
  const { snapshot, site } = entry;
  const counts = useMemo(() => {
    const count = (status: CompletionStatus) => snapshot.activities.filter((a) => a.completion === status).length;
    return { complete: count('complete'), incomplete: count('incomplete'), unknown: count('unknown') };
  }, [snapshot]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const loadNotes = useCallback(() => {
    if (!hasChrome) return;
    void chrome.runtime
      .sendMessage({ type: 'NOTES_FOR_COURSE', siteId: site.id, courseId: entry.courseId })
      .then((response: { ok?: boolean; notes?: { activityId: string; text: string }[] } | undefined) => {
        if (response?.ok && response.notes) {
          setNotes(Object.fromEntries(response.notes.map((note) => [note.activityId, note.text])));
        }
      })
      .catch(() => undefined);
  }, [site.id, entry.courseId]);
  useEffect(loadNotes, [loadNotes]);
  function openActivity(url: string) {
    if (!isActivityUrl(url, site.origin)) {
      props.onError('noNavigation');
      return;
    }
    if (hasChrome) void chrome.tabs.create({ url });
    else window.open(url, '_blank', 'noopener,noreferrer');
  }
  const stats: { key: CompletionStatus; value: number; className: string }[] = [
    { key: 'complete', value: counts.complete, className: 'bg-success-soft text-success-ink' },
    { key: 'incomplete', value: counts.incomplete, className: 'bg-warning-soft text-warning-ink' },
    { key: 'unknown', value: counts.unknown, className: 'bg-well text-ink-2' }
  ];
  return (
    <>
      <Button variant="ghost" className="-ml-2" onClick={props.onBack}>
        <ArrowLeft size={14} />
        {translate('courses')}
      </Button>
      <Card>
        <SectionLabel tone="accent">{site.label}</SectionLabel>
        <h2 className="mt-1.5 flex items-center gap-2 text-lg leading-snug font-semibold">
          <ColorDot color={entry.prefs.color} />
          <span className="min-w-0 break-words">{courseTitle(entry, translate)}</span>
        </h2>
        {entry.prefs.nickname && snapshot.courseName && (
          <p className="mt-1 text-xs break-words text-ink-2">{snapshot.courseName}</p>
        )}
        <p className="mt-1 text-xs break-words text-ink-3">
          {translate('lastSeen')}: {new Date(snapshot.capturedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}
        </p>
        <Hint className="mt-3">{translate('refreshHint')}</Hint>
        <Button
          variant="primary"
          size="md"
          className="mt-3 w-full justify-center"
          onClick={() => !openCourse(entry) && props.onError('noNavigation')}
        >
          {translate('openCourse')} <ExternalLink size={14} />
        </Button>
      </Card>
      {entry.changes.length > 0 && (
        <Card className="space-y-3">
          <CardTitle icon={Bell} tone="lavender">
            {translate('whatsNew')}
          </CardTitle>
          <ChangeList {...props} />
        </Card>
      )}
      <Card>
        <CardTitle
          actions={
            <span className="text-xs text-ink-2">
              {snapshot.activities.length} {translate('activities')}
            </span>
          }
        >
          {translate('statusSummary')}
        </CardTitle>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-medium">
          {stats.map((stat) => (
            <div key={stat.key} className={cx('rounded-lg p-2', stat.className)}>
              <strong className="block text-xl leading-tight font-semibold">{stat.value}</strong>
              {translate(completionLabel[stat.key])}
            </div>
          ))}
        </div>
      </Card>
      <section className="space-y-2">
        <h3 id="activities-heading" className="px-1 text-sm font-semibold">
          {translate('activities')}
        </h3>
        {snapshot.activities.length === 0 && (
          <Card>
            <Hint>{translate('emptyActivities')}</Hint>
          </Card>
        )}
        {/* Own scroll area, about one viewport tall, so long courses do not stretch the page. */}
        <div
          role="region"
          aria-labelledby="activities-heading"
          tabIndex={0}
          className="max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-canvas shadow-card"
        >
          {snapshot.activities.map((activity) => (
            <article
              key={`${activity.type}-${activity.id}`}
              className="flex items-start gap-3 border-b border-line p-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium break-words">{activity.title}</h4>
                <p className="mt-0.5 text-xs text-ink-3">{translate(typeLabel[activity.type])}</p>
                {activity.url === null ? (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-3">
                    <Lock size={12} />
                    {translate('restricted')}
                  </p>
                ) : (
                  <Button variant="link" className="mt-1.5 text-xs" onClick={() => openActivity(activity.url!)}>
                    {translate('open')} <ExternalLink size={12} />
                  </Button>
                )}
                <ActivityNote
                  key={`${activity.id}-${notes[activity.id] ?? ''}`}
                  {...props}
                  activityId={activity.id}
                  text={notes[activity.id]}
                  onSaved={loadNotes}
                />
              </div>
              <div
                className={cx(
                  'flex shrink-0 items-center gap-1 text-[11px] font-medium',
                  completionStyle[activity.completion]
                )}
              >
                {activity.completion === 'complete' ? (
                  <CheckCircle2 size={14} />
                ) : activity.completion === 'incomplete' ? (
                  <CircleDashed size={14} />
                ) : (
                  <CircleHelp size={14} />
                )}
                {translate(completionLabel[activity.completion])}
              </div>
            </article>
          ))}
        </div>
      </section>
      <FocusCard {...props} />
      <Personalize key={entry.key} {...props} />
    </>
  );
}
