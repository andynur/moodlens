import { useEffect, useState } from 'react';
import { NotebookPen, Play, Square, Timer } from 'lucide-react';
import {
  DEFAULT_FOCUS_MINUTES,
  FOCUS_MINUTES,
  MAX_NOTE_LENGTH,
  type FocusMinutes,
  type FocusSession
} from '../../shared/focus';
import type { CourseEntry } from '../courseEntries';
import { hasChrome } from '../useSites';
import { Alert, Button, Card, CardTitle, Hint, ProgressBar, Segmented, Textarea } from '../ui';
import type { Feedback } from './Sites';

interface FocusStateResponse {
  ok: boolean;
  session: FocusSession | null;
  awarded?: number;
}

async function send<T>(message: unknown, fallback: T): Promise<T> {
  if (!hasChrome) return fallback;
  return ((await chrome.runtime.sendMessage(message).catch(() => null)) as T | null) ?? fallback;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Focus timer for one course (ML-026). The background keeps the session and awards XP when it ends. */
export function FocusCard(props: Feedback & { entry: CourseEntry }) {
  const { translate, entry } = props;
  const [session, setSession] = useState<FocusSession | null>(null);
  const [minutes, setMinutes] = useState<FocusMinutes>(DEFAULT_FOCUS_MINUTES);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<number | null>(null);
  const empty: FocusStateResponse = { ok: false, session: null };

  useEffect(() => {
    void send<FocusStateResponse>({ type: 'FOCUS_STATE' }, empty).then((state) => setSession(state.session));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endsAt = session ? Date.parse(session.endsAt) : 0;
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);

  // Once the time is up, ask the background; it completes the session if its alarm has not run yet.
  const ended = session !== null && now >= endsAt;
  useEffect(() => {
    if (!ended || !session) return;
    const mine = session.siteId === entry.site.id && session.courseId === entry.courseId;
    void send<FocusStateResponse>({ type: 'FOCUS_STATE' }, empty).then((state) => {
      setSession(state.session);
      if (mine && !state.session) setDone(state.awarded ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const mine = session !== null && session.siteId === entry.site.id && session.courseId === entry.courseId;
  const start = async () => {
    const state = await send<FocusStateResponse>(
      { type: 'FOCUS_START', siteId: entry.site.id, courseId: entry.courseId, minutes },
      empty
    );
    if (!state.ok) props.onError('siteActionError');
    setDone(null);
    setNow(Date.now());
    setSession(state.session);
  };
  const stop = async () => {
    const state = await send<FocusStateResponse>({ type: 'FOCUS_CANCEL' }, empty);
    if (!state.ok) props.onError('siteActionError');
    else setSession(null);
  };

  const total = session ? session.minutes * 60_000 : 1;
  const left = Math.max(0, endsAt - now);
  return (
    <Card className="space-y-3">
      <CardTitle icon={Timer} tone="peach">
        {translate('focusTimer')}
      </CardTitle>
      <Hint>{translate('focusHint')}</Hint>
      {done !== null && (
        <Alert tone="success" role="status">
          {translate('focusDoneTitle')}
          {done > 0 && ` · +${done} XP`}
        </Alert>
      )}
      {mine ? (
        <div className="space-y-2">
          <p className="flex items-baseline justify-between text-xs text-ink-2">
            {translate('focusRemaining')}
            <strong className="text-2xl font-semibold text-ink tabular-nums" aria-live="off">
              {clock(left)}
            </strong>
          </p>
          <ProgressBar value={Math.round(((total - left) / total) * 100)} label={translate('focusRemaining')} />
          <Button variant="danger" size="md" className="w-full justify-center" onClick={() => void stop()}>
            <Square size={14} />
            {translate('focusStop')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {session && <Hint>{translate('focusOtherCourse')}</Hint>}
          <Segmented
            label={translate('focusLength')}
            value={String(minutes)}
            options={FOCUS_MINUTES.map((value) => ({
              value: String(value),
              label: `${value} ${translate('minutesShort')}`
            }))}
            onChange={(value) => setMinutes(Number(value) as FocusMinutes)}
          />
          <Button variant="primary" size="md" className="w-full justify-center" onClick={() => void start()}>
            <Play size={14} />
            {translate('focusStart')}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Plain-text note on one activity (ML-026). Saving empty text deletes the note. */
export function ActivityNote(
  props: Feedback & { entry: CourseEntry; activityId: string; text: string | undefined; onSaved: () => void }
) {
  const { translate, entry, activityId } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.text ?? '');
  const save = async () => {
    const result = await send<{ ok: boolean }>(
      { type: 'SAVE_NOTE', siteId: entry.site.id, courseId: entry.courseId, activityId, text: draft },
      { ok: false }
    );
    if (!result.ok) {
      props.onError('siteActionError');
      return;
    }
    setEditing(false);
    props.onNotice('noteSaved');
    props.onSaved();
  };
  if (!editing) {
    return (
      <>
        {props.text && (
          <p className="mt-1.5 rounded-lg bg-well p-2 text-xs whitespace-pre-wrap break-words text-ink-2">
            {props.text}
          </p>
        )}
        <Button
          variant="link"
          className="mt-1.5 text-xs"
          onClick={() => {
            setDraft(props.text ?? '');
            setEditing(true);
          }}
        >
          <NotebookPen size={12} />
          {translate(props.text ? 'noteEdit' : 'noteAdd')}
        </Button>
      </>
    );
  }
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Textarea
        aria-label={translate('note')}
        value={draft}
        maxLength={MAX_NOTE_LENGTH}
        rows={4}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
      />
      <Hint faint>{translate('noteHint')}</Hint>
      <div className="flex gap-2">
        <Button type="submit" variant="primary">
          {translate('save')}
        </Button>
        <Button onClick={() => setEditing(false)}>{translate('cancel')}</Button>
      </div>
    </form>
  );
}
