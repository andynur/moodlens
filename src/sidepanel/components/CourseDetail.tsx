import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleDashed, CircleHelp, ExternalLink, Lock, Pin } from 'lucide-react';
import { COURSE_COLORS, type CourseColor, type CoursePrefs } from '../../shared/courses';
import type { ActivityChange } from '../../shared/diff';
import type { TranslationKey } from '../../shared/i18n';
import type { ActivityType, CompletionStatus, Locale } from '../../shared/types';
import { isActivityUrl } from '../../shared/validation';
import { colorDot, colorLabel, courseTitle, openCourse, type CourseEntry } from '../courseEntries';
import { hasChrome, sendSiteCommand } from '../useSites';
import type { Feedback } from './Sites';

export const card = 'rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900';
export const smallButton =
  'inline-flex items-center gap-1 rounded-lg border border-slate-300 p-2 text-xs font-semibold dark:border-slate-700';

const completionStyle: Record<CompletionStatus, string> = {
  complete: 'text-emerald-600 dark:text-emerald-400',
  incomplete: 'text-amber-600 dark:text-amber-400',
  unknown: 'text-slate-400 dark:text-slate-500'
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
      <ul className="space-y-1 text-xs">
        {entry.changes.map((change) => (
          <li key={`${change.kind}-${change.activityId}`} className="break-words">
            <span className="font-semibold">{translate(changeLabel[change.kind])}:</span> {change.title}
            {change.kind === 'renamed' && (
              <span className="text-slate-500 dark:text-slate-400">
                {' '}
                ({translate('changeRenamedFrom')} {change.previousTitle})
              </span>
            )}
            {change.kind === 'completion' && (
              <span className="text-slate-500 dark:text-slate-400">
                {' '}
                ({translate(completionLabel[change.previous])} → {translate(completionLabel[change.current])})
              </span>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        title={translate('markSeenHint')}
        className={smallButton}
        onClick={() =>
          void sendSiteCommand({ type: 'MARK_COURSE_SEEN', siteId: entry.site.id, courseId: entry.courseId }).then(
            (ok) => !ok && props.onError('siteActionError')
          )
        }
      >
        <CheckCircle2 size={13} />
        {translate('markSeen')}
      </button>
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
    <section className={`${card} space-y-3`}>
      <div>
        <h3 className="text-sm font-semibold">{translate('personalize')}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{translate('personalizeHint')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={Boolean(prefs.pinned)}
          className={smallButton}
          onClick={() => savePrefs(entry, { ...prefs, pinned: prefs.pinned ? undefined : true }, props)}
        >
          <Pin size={13} />
          {translate(prefs.pinned ? 'unpin' : 'pin')}
        </button>
        <button
          type="button"
          aria-pressed={Boolean(prefs.hidden)}
          className={smallButton}
          onClick={() => savePrefs(entry, { ...prefs, hidden: prefs.hidden ? undefined : true }, props)}
        >
          {translate(prefs.hidden ? 'showCourse' : 'hideCourse')}
        </button>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          savePrefs(entry, { ...prefs, nickname: nickname.trim() || undefined }, props);
        }}
      >
        <input
          aria-label={translate('nickname')}
          placeholder={translate('nickname')}
          value={nickname}
          maxLength={60}
          onChange={(event) => setNickname(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <button type="submit" className={smallButton}>
          {translate('save')}
        </button>
      </form>
      <fieldset>
        <legend className="text-xs font-semibold">{translate('colorTag')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!prefs.color}
            className={`${smallButton} ${!prefs.color ? 'border-blue-600' : ''}`}
            onClick={() => savePrefs(entry, { ...prefs, color: undefined }, props)}
          >
            {translate('colorNone')}
          </button>
          {COURSE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-pressed={prefs.color === color}
              aria-label={translate(colorLabel[color])}
              title={translate(colorLabel[color])}
              className={`${smallButton} ${prefs.color === color ? 'border-blue-600 ring-2 ring-blue-600' : ''}`}
              onClick={() => savePrefs(entry, { ...prefs, color }, props)}
            >
              <ColorDot color={color} />
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

export function CourseDetail(props: Feedback & { entry: CourseEntry; locale: Locale; onBack: () => void }) {
  const { translate, entry, locale } = props;
  const { snapshot, site } = entry;
  const counts = useMemo(() => {
    const count = (status: CompletionStatus) => snapshot.activities.filter((a) => a.completion === status).length;
    return { complete: count('complete'), incomplete: count('incomplete'), unknown: count('unknown') };
  }, [snapshot]);
  function openActivity(url: string) {
    if (!isActivityUrl(url, site.origin)) {
      props.onError('noNavigation');
      return;
    }
    if (hasChrome) void chrome.tabs.create({ url });
    else window.open(url, '_blank', 'noopener,noreferrer');
  }
  return (
    <>
      <button type="button" onClick={props.onBack} className={smallButton}>
        <ArrowLeft size={13} />
        {translate('courses')}
      </button>
      <section className={card}>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{site.label}</p>
        <h2 className="mt-2 flex items-center gap-2 text-lg font-bold">
          <ColorDot color={entry.prefs.color} />
          <span className="min-w-0 break-words">{courseTitle(entry, translate)}</span>
        </h2>
        {entry.prefs.nickname && snapshot.courseName && (
          <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{snapshot.courseName}</p>
        )}
        <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
          {translate('lastSeen')}: {new Date(snapshot.capturedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}
        </p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{translate('refreshHint')}</p>
        <button
          type="button"
          onClick={() => !openCourse(entry) && props.onError('noNavigation')}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
        >
          {translate('openCourse')} <ExternalLink size={12} />
        </button>
      </section>
      {entry.changes.length > 0 && (
        <section className={card}>
          <h3 className="mb-2 text-sm font-semibold">{translate('whatsNew')}</h3>
          <ChangeList {...props} />
        </section>
      )}
      <section className={card}>
        <h3 className="text-sm font-semibold">{translate('statusSummary')}</h3>
        <p className="mt-2 text-sm font-bold">
          {snapshot.activities.length} {translate('activities')}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <strong className="block text-lg">{counts.complete}</strong>
            {translate('completed')}
          </div>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <strong className="block text-lg">{counts.incomplete}</strong>
            {translate('incomplete')}
          </div>
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <strong className="block text-lg">{counts.unknown}</strong>
            {translate('unknown')}
          </div>
        </div>
      </section>
      <section className="space-y-2">
        <h3 id="activities-heading" className="text-sm font-semibold">
          {translate('activities')}
        </h3>
        {snapshot.activities.length === 0 && (
          <p className="rounded-lg bg-white p-3 text-sm text-slate-500 dark:bg-slate-900">
            {translate('emptyActivities')}
          </p>
        )}
        {/* Own scroll area, about one viewport tall, so long courses do not stretch the page. */}
        <div
          role="region"
          aria-labelledby="activities-heading"
          tabIndex={0}
          className="max-h-[calc(100dvh-3rem)] space-y-2 overflow-y-auto overscroll-contain rounded-xl"
        >
          {snapshot.activities.map((activity) => (
            <article
              key={`${activity.type}-${activity.id}`}
              className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="break-words text-sm font-semibold">{activity.title}</h4>
                  <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">
                    {translate(typeLabel[activity.type])}
                  </p>
                </div>
                <div
                  className={`flex shrink-0 items-center gap-1 text-[11px] font-medium ${completionStyle[activity.completion]}`}
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
              </div>
              {activity.url === null ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Lock size={12} />
                  {translate('restricted')}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => openActivity(activity.url!)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                >
                  {translate('open')} <ExternalLink size={12} />
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
      <Personalize key={entry.key} {...props} />
    </>
  );
}
