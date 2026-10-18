/**
 * Moodlens XP (ML-021, D-006): local study points, separate from Moodle grades and completion.
 * Rules are documented in docs/prd/PRD-010_PRACTICE_AND_XP.md ("XP rules"); keep both in sync.
 * Pure logic: no storage, no clock reads. Callers pass the time and the student's IANA time zone.
 */

import { dayKey, dayNumber, isDayKey, keyFromDayNumber, weekKey } from './days';

export { dayKey, weekKey };

export type XpEvent =
  | { kind: 'card-reviewed' }
  | { kind: 'review-session-completed' }
  | { kind: 'practice-session-completed' }
  | { kind: 'focus-session-completed' }
  | { kind: 'task-opened-early'; taskId: string; dueAt: string };

export type XpEventKind = XpEvent['kind'];

export const XP_POINTS: Readonly<Record<XpEventKind, number>> = {
  'card-reviewed': 2,
  'review-session-completed': 10,
  'practice-session-completed': 15,
  'focus-session-completed': 10,
  'task-opened-early': 10
};
export const DAILY_XP_CAP = 150;
export const EARLY_TASK_DAYS = 3;
export const MAX_WEEKLY_GOAL = 5000;
/** Days of daily totals kept; enough for this week and last week. */
export const DAILY_HISTORY_DAYS = 14;
const MAX_EARLY_TASK_IDS = 500;
const DAY_MS = 86_400_000;

export interface XpStreak {
  current: number;
  longest: number;
  /** Local day key (`YYYY-MM-DD`) of the last study event. */
  lastActiveDay: string | null;
  /** Week keys (Monday day key) in which the weekly freeze was used. */
  freezeWeeks: string[];
}

export interface XpState {
  totalXp: number;
  /** Local day key to XP earned that day, after the daily cap. */
  daily: Record<string, number>;
  streak: XpStreak;
  /** Student-set weekly XP target; 0 means no goal. */
  weeklyGoal: number;
  /** Tasks that already earned early-start XP, so reopening a task earns nothing. */
  earlyTaskIds: string[];
}

export function createXpState(): XpState {
  return {
    totalXp: 0,
    daily: {},
    streak: { current: 0, longest: 0, lastActiveDay: null, freezeWeeks: [] },
    weeklyGoal: 0,
    earlyTaskIds: []
  };
}

/**
 * Advances the streak for a study event on `today`.
 * One missed day is bridged by the weekly freeze if the freeze is unused in the missed day's week.
 * Two or more missed days reset the streak. A clock or time zone moving backwards changes nothing.
 */
function advanceStreak(streak: XpStreak, today: string): XpStreak {
  if (streak.lastActiveDay === null)
    return { ...streak, current: 1, longest: Math.max(1, streak.longest), lastActiveDay: today };
  const gap = dayNumber(today) - dayNumber(streak.lastActiveDay);
  if (gap <= 0) return streak;
  let current = 1;
  let freezeWeeks = streak.freezeWeeks;
  if (gap === 1) current = streak.current + 1;
  if (gap === 2) {
    const missedWeek = weekKey(keyFromDayNumber(dayNumber(today) - 1));
    if (!freezeWeeks.includes(missedWeek)) {
      current = streak.current + 1;
      freezeWeeks = [...freezeWeeks, missedWeek].slice(-8);
    }
  }
  return { current, longest: Math.max(streak.longest, current), lastActiveDay: today, freezeWeeks };
}

function pruneDaily(daily: Record<string, number>, today: string): Record<string, number> {
  const oldest = dayNumber(today) - (DAILY_HISTORY_DAYS - 1);
  return Object.fromEntries(Object.entries(daily).filter(([key]) => dayNumber(key) >= oldest));
}

function isEligibleEarlyTask(
  state: XpState,
  event: Extract<XpEvent, { kind: 'task-opened-early' }>,
  at: Date
): boolean {
  const due = Date.parse(event.dueAt);
  if (!event.taskId || event.taskId.length > 200 || Number.isNaN(due)) return false;
  if (state.earlyTaskIds.includes(event.taskId)) return false;
  return due - at.getTime() >= EARLY_TASK_DAYS * DAY_MS;
}

/**
 * Applies one study event. Returns the new state and the XP actually awarded (0 once the daily cap is hit).
 * A capped event still counts as study for the streak. An ineligible early-task event changes nothing.
 */
export function awardXp(
  state: XpState,
  event: XpEvent,
  at: Date,
  timeZone: string
): { state: XpState; awarded: number } {
  if (event.kind === 'task-opened-early' && !isEligibleEarlyTask(state, event, at)) return { state, awarded: 0 };
  const today = dayKey(at, timeZone);
  const earnedToday = state.daily[today] ?? 0;
  const awarded = Math.min(XP_POINTS[event.kind], Math.max(0, DAILY_XP_CAP - earnedToday));
  const earlyTaskIds =
    event.kind === 'task-opened-early'
      ? [...state.earlyTaskIds, event.taskId].slice(-MAX_EARLY_TASK_IDS)
      : state.earlyTaskIds;
  return {
    awarded,
    state: {
      ...state,
      totalXp: state.totalXp + awarded,
      daily: pruneDaily({ ...state.daily, [today]: earnedToday + awarded }, today),
      streak: advanceStreak(state.streak, today),
      earlyTaskIds
    }
  };
}

/** Streak to display at `at`: 0 once it can no longer be continued today. */
export function currentStreak(state: XpState, at: Date, timeZone: string): number {
  const { lastActiveDay, current, freezeWeeks } = state.streak;
  if (lastActiveDay === null) return 0;
  const today = dayNumber(dayKey(at, timeZone));
  const gap = today - dayNumber(lastActiveDay);
  if (gap <= 1) return current;
  if (gap === 2 && !freezeWeeks.includes(weekKey(keyFromDayNumber(today - 1)))) return current;
  return 0;
}

/** Total XP needed to reach `level` (level 1 starts at 0): 100, 300, 600, 1000, ... */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelForXp(totalXp: number): { level: number; levelStartXp: number; nextLevelXp: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level++;
  return { level, levelStartXp: xpForLevel(level), nextLevelXp: xpForLevel(level + 1) };
}

export function setWeeklyGoal(state: XpState, goal: number): XpState {
  const weeklyGoal = Number.isFinite(goal) ? Math.min(MAX_WEEKLY_GOAL, Math.max(0, Math.round(goal))) : 0;
  return { ...state, weeklyGoal };
}

/** XP earned in the Monday-start week that contains `at`, against the student's goal. */
export function weeklyProgress(
  state: XpState,
  at: Date,
  timeZone: string
): { weekStart: string; earned: number; goal: number } {
  const weekStart = weekKey(dayKey(at, timeZone));
  const first = dayNumber(weekStart);
  let earned = 0;
  for (let day = first; day < first + 7; day++) earned += state.daily[keyFromDayNumber(day)] ?? 0;
  return { weekStart, earned, goal: state.weeklyGoal };
}

/** Runtime guard for the stored state; anything that fails starts over from a fresh state. */
export function isXpState(input: unknown): input is XpState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const state = input as Partial<XpState>;
  const whole = (value: unknown, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
  if (!whole(state.totalXp, Number.MAX_SAFE_INTEGER) || !whole(state.weeklyGoal, MAX_WEEKLY_GOAL)) return false;
  if (!state.daily || typeof state.daily !== 'object' || Array.isArray(state.daily)) return false;
  const daily = Object.entries(state.daily);
  if (daily.length > DAILY_HISTORY_DAYS || !daily.every(([day, xp]) => isDayKey(day) && whole(xp, DAILY_XP_CAP))) {
    return false;
  }
  if (!Array.isArray(state.earlyTaskIds) || state.earlyTaskIds.length > MAX_EARLY_TASK_IDS) return false;
  if (!state.earlyTaskIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 300)) return false;
  const streak = state.streak;
  if (!streak || typeof streak !== 'object') return false;
  if (!whole(streak.current, 100_000) || !whole(streak.longest, 100_000)) return false;
  if (!(streak.lastActiveDay === null || isDayKey(streak.lastActiveDay))) return false;
  return (
    Array.isArray(streak.freezeWeeks) &&
    streak.freezeWeeks.length <= 520 &&
    streak.freezeWeeks.every((week) => isDayKey(week))
  );
}
