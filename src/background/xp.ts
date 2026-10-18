/**
 * XP storage (ML-021, D-006). The rules live in `src/shared/xp.ts`; this module only keeps the state
 * in `chrome.storage.local` and turns it into the numbers the panel shows. XP is local and has nothing
 * to do with Moodle grades or completion.
 */
import { localTimeZone } from '../shared/days';
import type { XpView } from '../shared/types';
import {
  awardXp,
  createXpState,
  currentStreak,
  dayKey,
  isXpState,
  levelForXp,
  setWeeklyGoal,
  weeklyProgress,
  type XpEvent,
  type XpState
} from '../shared/xp';

export const XP_KEY = 'xp';

export async function loadXpState(): Promise<XpState> {
  const stored: unknown = (await chrome.storage.local.get(XP_KEY))[XP_KEY];
  return isXpState(stored) ? stored : createXpState();
}

function view(state: XpState, at: Date, zone: string): XpView {
  const { level, levelStartXp, nextLevelXp } = levelForXp(state.totalXp);
  const week = weeklyProgress(state, at, zone);
  return {
    ok: true,
    totalXp: state.totalXp,
    level,
    levelStartXp,
    nextLevelXp,
    today: state.daily[dayKey(at, zone)] ?? 0,
    streak: currentStreak(state, at, zone),
    longestStreak: state.streak.longest,
    weeklyGoal: week.goal,
    weeklyEarned: week.earned
  };
}

export async function xpView(at = new Date(), zone = localTimeZone()): Promise<XpView> {
  return view(await loadXpState(), at, zone);
}

/** Applies one study event and stores the result. Returns the XP awarded and the new view. */
export async function awardStudyXp(
  event: XpEvent,
  at = new Date(),
  zone = localTimeZone()
): Promise<{ ok: true; awarded: number; xp: XpView }> {
  const result = awardXp(await loadXpState(), event, at, zone);
  await chrome.storage.local.set({ [XP_KEY]: result.state });
  return { ok: true, awarded: result.awarded, xp: view(result.state, at, zone) };
}

export async function saveWeeklyGoal(
  goal: unknown,
  at = new Date(),
  zone = localTimeZone()
): Promise<{ ok: boolean; xp?: XpView }> {
  if (typeof goal !== 'number' || !Number.isFinite(goal)) return { ok: false };
  const state = setWeeklyGoal(await loadXpState(), goal);
  await chrome.storage.local.set({ [XP_KEY]: state });
  return { ok: true, xp: view(state, at, zone) };
}

/** Awards early-start XP for a task the student opened at least 3 days before its deadline. */
export async function recordTaskOpened(
  input: { taskId: unknown; dueAt: unknown },
  at = new Date(),
  zone = localTimeZone()
): Promise<{ ok: boolean; awarded?: number }> {
  if (typeof input.taskId !== 'string' || input.taskId === '' || input.taskId.length > 300) return { ok: false };
  if (typeof input.dueAt !== 'string' || Number.isNaN(Date.parse(input.dueAt))) return { ok: false };
  const result = await awardStudyXp({ kind: 'task-opened-early', taskId: input.taskId, dueAt: input.dueAt }, at, zone);
  return { ok: true, awarded: result.awarded };
}
