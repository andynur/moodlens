/**
 * Focus timer (ML-026). One session at a time, stored under `focus` with a `chrome.alarms` alarm at its end.
 * Only the background decides that a session is complete, so the panel cannot claim focus XP early.
 * The session never touches Moodle; it is tied to a course of a registered site only for display.
 */
import {
  FOCUS_ALARM,
  FOCUS_KEY,
  isFocusComplete,
  isFocusMinutes,
  isFocusSession,
  newFocusSession,
  type FocusSession
} from '../shared/focus';
import { t } from '../shared/i18n';
import type { Locale } from '../shared/types';
import { loadSites } from './sites';
import { awardStudyXp } from './xp';

export interface FocusStateResponse {
  ok: boolean;
  session: FocusSession | null;
  /** XP awarded when this call found the session complete; the panel shows it once. */
  awarded?: number;
}

const COURSE_ID = /^\d{1,20}$/;

async function loadSession(): Promise<FocusSession | null> {
  const stored: unknown = (await chrome.storage.local.get(FOCUS_KEY))[FOCUS_KEY];
  return isFocusSession(stored) ? stored : null;
}

async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(FOCUS_KEY);
  await chrome.alarms.clear(FOCUS_ALARM);
}

async function notifyDone(): Promise<void> {
  if (!(await chrome.permissions.contains({ permissions: ['notifications'] }))) return;
  const stored: unknown = (await chrome.storage.local.get('locale')).locale;
  const locale: Locale = stored === 'id' ? 'id' : 'en';
  await chrome.notifications.create(FOCUS_ALARM, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: t(locale, 'focusDoneTitle'),
    message: t(locale, 'focusDoneMessage')
  });
}

/**
 * Completes the stored session once its full length has passed: clears it first, then awards focus XP
 * when its site is still registered. Returns the XP awarded, or null when nothing was due.
 */
async function completeIfDue(at: Date): Promise<number | null> {
  const session = await loadSession();
  if (!session || !isFocusComplete(session, at)) return null;
  await clearSession();
  if (!(await loadSites()).some((site) => site.id === session.siteId)) return 0;
  const { awarded } = await awardStudyXp({ kind: 'focus-session-completed' }, at);
  await notifyDone().catch(() => undefined);
  return awarded;
}

export async function focusState(at = new Date()): Promise<FocusStateResponse> {
  const awarded = await completeIfDue(at);
  return { ok: true, session: await loadSession(), ...(awarded !== null ? { awarded } : {}) };
}

/** Starts a session for a course of a registered site. A running session is replaced without XP. */
export async function startFocus(
  input: { siteId: unknown; courseId: unknown; minutes: unknown },
  at = new Date()
): Promise<FocusStateResponse> {
  const site = (await loadSites()).find((item) => item.id === input.siteId);
  if (
    !site ||
    typeof input.courseId !== 'string' ||
    !COURSE_ID.test(input.courseId) ||
    !isFocusMinutes(input.minutes)
  ) {
    return { ok: false, session: await loadSession() };
  }
  const session = newFocusSession(site.id, input.courseId, input.minutes, at);
  await chrome.storage.local.set({ [FOCUS_KEY]: session });
  await chrome.alarms.create(FOCUS_ALARM, { when: Date.parse(session.endsAt) });
  return { ok: true, session };
}

/** Stops the running session without XP. */
export async function cancelFocus(): Promise<FocusStateResponse> {
  await clearSession();
  return { ok: true, session: null };
}

export async function handleFocusAlarm(alarm: chrome.alarms.Alarm, at = new Date()): Promise<void> {
  if (alarm.name === FOCUS_ALARM) await completeIfDue(at);
}

/** Clears the alarm on "Clear all local data"; the stored session goes with local storage. */
export function clearFocusAlarm(): Promise<boolean> {
  return chrome.alarms.clear(FOCUS_ALARM);
}
