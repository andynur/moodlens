/**
 * Focus timer and activity notes (ML-026, PRD-010). Pure rules shared by the background and the panel.
 * The background owns the running session and decides when it is complete; the panel only displays it.
 */

/** Session lengths the student can pick, in minutes. */
export const FOCUS_MINUTES = [15, 25, 50] as const;
export type FocusMinutes = (typeof FOCUS_MINUTES)[number];
export const DEFAULT_FOCUS_MINUTES: FocusMinutes = 25;
export const FOCUS_KEY = 'focus';
export const FOCUS_ALARM = 'moodlens-focus';

export interface FocusSession {
  siteId: string;
  courseId: string;
  minutes: FocusMinutes;
  startedAt: string;
  endsAt: string;
}

const NUMERIC_ID = /^\d{1,20}$/;
// Site ids are the origin's host, with a port when it is not the default (`siteIdFor`).
const SITE_ID = /^[A-Za-z0-9.:[\]-]{1,100}$/;

export function isFocusMinutes(input: unknown): input is FocusMinutes {
  return typeof input === 'number' && (FOCUS_MINUTES as readonly number[]).includes(input);
}

export function newFocusSession(siteId: string, courseId: string, minutes: FocusMinutes, at: Date): FocusSession {
  return {
    siteId,
    courseId,
    minutes,
    startedAt: at.toISOString(),
    endsAt: new Date(at.getTime() + minutes * 60_000).toISOString()
  };
}

export function isFocusSession(input: unknown): input is FocusSession {
  if (typeof input !== 'object' || input === null) return false;
  const value = input as Record<string, unknown>;
  if (typeof value.siteId !== 'string' || !SITE_ID.test(value.siteId)) return false;
  if (typeof value.courseId !== 'string' || !NUMERIC_ID.test(value.courseId)) return false;
  if (!isFocusMinutes(value.minutes)) return false;
  if (typeof value.startedAt !== 'string' || typeof value.endsAt !== 'string') return false;
  const started = Date.parse(value.startedAt);
  const ends = Date.parse(value.endsAt);
  // The end must follow from the start and the length, so a stored session cannot claim a shorter run.
  return Number.isFinite(started) && ends === started + value.minutes * 60_000;
}

/** A session is complete once its full length has passed. Alarms never fire early, so no tolerance. */
export function isFocusComplete(session: FocusSession, at: Date): boolean {
  return at.getTime() >= Date.parse(session.endsAt);
}

export const MAX_NOTE_LENGTH = 5000;
export const NOTES_PER_SITE = 2000;

/** Plain-text note on one course activity. Local only; never in backups, exports or messages to providers. */
export interface ActivityNote {
  id: string;
  siteId: string;
  courseId: string;
  activityId: string;
  text: string;
  updatedAt: string;
}

export function noteId(siteId: string, courseId: string, activityId: string): string {
  return `${siteId}:${courseId}:${activityId}`;
}

export function isNoteTarget(siteId: unknown, courseId: unknown, activityId: unknown): boolean {
  return (
    typeof siteId === 'string' &&
    SITE_ID.test(siteId) &&
    typeof courseId === 'string' &&
    NUMERIC_ID.test(courseId) &&
    typeof activityId === 'string' &&
    NUMERIC_ID.test(activityId)
  );
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b-\u001f\u007f]/g;

/** Trims trailing space and removes control characters except newlines and tabs. */
export function cleanNoteText(input: string): string {
  return input.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').trimEnd();
}

export function isActivityNote(input: unknown): input is ActivityNote {
  if (typeof input !== 'object' || input === null) return false;
  const value = input as Record<string, unknown>;
  return (
    isNoteTarget(value.siteId, value.courseId, value.activityId) &&
    value.id === noteId(value.siteId as string, value.courseId as string, value.activityId as string) &&
    typeof value.text === 'string' &&
    value.text.length > 0 &&
    value.text.length <= MAX_NOTE_LENGTH &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}
