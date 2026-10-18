import { describe, expect, it } from 'vitest';
import {
  awardXp,
  createXpState,
  currentStreak,
  DAILY_XP_CAP,
  dayKey,
  levelForXp,
  setWeeklyGoal,
  weekKey,
  weeklyProgress,
  type XpEvent,
  type XpState
} from '../src/shared/xp';

const JAKARTA = 'Asia/Jakarta'; // UTC+7
const UTC = 'UTC';
const REVIEW: XpEvent = { kind: 'card-reviewed' };
const SESSION: XpEvent = { kind: 'review-session-completed' };

function at(iso: string): Date {
  return new Date(iso);
}

function apply(state: XpState, events: [XpEvent, string][], timeZone = JAKARTA): XpState {
  return events.reduce((current, [event, time]) => awardXp(current, event, at(time), timeZone).state, state);
}

describe('XP points', () => {
  it('awards the documented points per event', () => {
    const cases: [XpEvent, number][] = [
      [REVIEW, 2],
      [SESSION, 10],
      [{ kind: 'practice-session-completed' }, 15],
      [{ kind: 'focus-session-completed' }, 10]
    ];
    for (const [event, points] of cases) {
      expect(awardXp(createXpState(), event, at('2026-10-18T03:00:00Z'), JAKARTA).awarded).toBe(points);
    }
  });

  it('stops at the daily cap and keeps the remainder of the last event', () => {
    let state = createXpState();
    let awarded = 0;
    for (let i = 0; i < 20; i++) {
      const result = awardXp(state, { kind: 'practice-session-completed' }, at('2026-10-18T03:00:00Z'), JAKARTA);
      state = result.state;
      awarded += result.awarded;
    }
    expect(awarded).toBe(DAILY_XP_CAP);
    expect(state.totalXp).toBe(DAILY_XP_CAP);
    expect(state.daily['2026-10-18']).toBe(DAILY_XP_CAP);
  });

  it('resets the cap on the next local day, not the next UTC day', () => {
    // 16:30 UTC on the 18th is 23:30 in Jakarta; 17:30 UTC is already the 19th there.
    let state = createXpState();
    for (let i = 0; i < 15; i++) state = awardXp(state, SESSION, at('2026-10-18T16:30:00Z'), JAKARTA).state;
    expect(awardXp(state, SESSION, at('2026-10-18T16:59:00Z'), JAKARTA).awarded).toBe(0);
    expect(awardXp(state, SESSION, at('2026-10-18T17:30:00Z'), JAKARTA).awarded).toBe(10);
  });
});

describe('XP for tasks opened early', () => {
  const now = '2026-10-18T03:00:00Z';
  it('awards a task opened at least 3 days before it is due, once', () => {
    const event: XpEvent = { kind: 'task-opened-early', taskId: 'site-1:assign-9', dueAt: '2026-10-21T03:00:00Z' };
    const first = awardXp(createXpState(), event, at(now), JAKARTA);
    expect(first.awarded).toBe(10);
    const again = awardXp(first.state, event, at(now), JAKARTA);
    expect(again.awarded).toBe(0);
    expect(again.state).toBe(first.state);
  });
  it('awards nothing and keeps the streak unchanged when the task is due sooner', () => {
    const event: XpEvent = { kind: 'task-opened-early', taskId: 't', dueAt: '2026-10-21T02:59:00Z' };
    const result = awardXp(createXpState(), event, at(now), JAKARTA);
    expect(result).toEqual({ state: createXpState(), awarded: 0 });
  });
  it('awards nothing for an invalid due date or empty task id', () => {
    expect(
      awardXp(createXpState(), { kind: 'task-opened-early', taskId: 't', dueAt: 'soon' }, at(now), JAKARTA).awarded
    ).toBe(0);
    expect(
      awardXp(
        createXpState(),
        { kind: 'task-opened-early', taskId: '', dueAt: '2026-12-01T00:00:00Z' },
        at(now),
        JAKARTA
      ).awarded
    ).toBe(0);
  });
});

describe('streaks', () => {
  it('counts consecutive local days', () => {
    const state = apply(createXpState(), [
      [REVIEW, '2026-10-12T03:00:00Z'],
      [REVIEW, '2026-10-12T05:00:00Z'],
      [REVIEW, '2026-10-13T03:00:00Z'],
      [REVIEW, '2026-10-14T03:00:00Z']
    ]);
    expect(state.streak).toMatchObject({ current: 3, longest: 3, lastActiveDay: '2026-10-14' });
  });

  it('rolls over at local midnight in the student time zone', () => {
    // 16:30 UTC and 17:30 UTC: same UTC day, two Jakarta days.
    const events: [XpEvent, string][] = [
      [REVIEW, '2026-10-12T16:30:00Z'],
      [REVIEW, '2026-10-12T17:30:00Z']
    ];
    expect(apply(createXpState(), events, JAKARTA).streak.current).toBe(2);
    expect(apply(createXpState(), events, UTC).streak.current).toBe(1);
  });

  it('bridges one missed day with the weekly freeze, once per week', () => {
    // Mon 12, skip Tue 13, Wed 14: freeze used for the week of the 12th.
    let state = apply(createXpState(), [
      [REVIEW, '2026-10-12T03:00:00Z'],
      [REVIEW, '2026-10-14T03:00:00Z']
    ]);
    expect(state.streak).toMatchObject({ current: 2, freezeWeeks: ['2026-10-12'] });
    // Skip Thu 15, Fri 16: same week, freeze already used, so the streak resets.
    state = apply(state, [[REVIEW, '2026-10-16T03:00:00Z']]);
    expect(state.streak).toMatchObject({ current: 1, longest: 2 });
  });

  it('gives a fresh freeze in the next week', () => {
    const state = apply(createXpState(), [
      [REVIEW, '2026-10-12T03:00:00Z'],
      [REVIEW, '2026-10-14T03:00:00Z'], // freeze for the week of the 12th
      [REVIEW, '2026-10-15T03:00:00Z'],
      [REVIEW, '2026-10-16T03:00:00Z'],
      [REVIEW, '2026-10-17T03:00:00Z'],
      [REVIEW, '2026-10-18T03:00:00Z'],
      [REVIEW, '2026-10-20T03:00:00Z'] // missed Mon 19, week of the 19th
    ]);
    expect(state.streak).toMatchObject({ current: 7, freezeWeeks: ['2026-10-12', '2026-10-19'] });
  });

  it('resets after two missed days', () => {
    const state = apply(createXpState(), [
      [REVIEW, '2026-10-12T03:00:00Z'],
      [REVIEW, '2026-10-15T03:00:00Z']
    ]);
    expect(state.streak).toMatchObject({ current: 1, longest: 1 });
  });

  it('counts a capped event as study for the streak', () => {
    let state = createXpState();
    for (let i = 0; i < 20; i++) state = awardXp(state, SESSION, at('2026-10-12T03:00:00Z'), JAKARTA).state;
    const capped = awardXp(state, SESSION, at('2026-10-13T03:00:00Z'), JAKARTA);
    expect(capped.state.streak.current).toBe(2);
  });

  it('ignores a clock moving backwards', () => {
    const state = apply(createXpState(), [
      [REVIEW, '2026-10-14T03:00:00Z'],
      [REVIEW, '2026-10-13T03:00:00Z']
    ]);
    expect(state.streak).toMatchObject({ current: 1, lastActiveDay: '2026-10-14' });
  });

  it('displays the streak while it can still be continued', () => {
    const state = apply(createXpState(), [
      [REVIEW, '2026-10-12T03:00:00Z'],
      [REVIEW, '2026-10-13T03:00:00Z']
    ]);
    expect(currentStreak(state, at('2026-10-14T03:00:00Z'), JAKARTA)).toBe(2);
    expect(currentStreak(state, at('2026-10-15T03:00:00Z'), JAKARTA)).toBe(2); // freeze still available
    expect(currentStreak(state, at('2026-10-16T03:00:00Z'), JAKARTA)).toBe(0);
    expect(currentStreak(createXpState(), at('2026-10-16T03:00:00Z'), JAKARTA)).toBe(0);
  });
});

describe('levels', () => {
  it('uses thresholds 0, 100, 300, 600', () => {
    expect(levelForXp(0)).toEqual({ level: 1, levelStartXp: 0, nextLevelXp: 100 });
    expect(levelForXp(99).level).toBe(1);
    expect(levelForXp(100).level).toBe(2);
    expect(levelForXp(300).level).toBe(3);
    expect(levelForXp(599)).toEqual({ level: 3, levelStartXp: 300, nextLevelXp: 600 });
  });
});

describe('weekly goal', () => {
  it('sums the Monday-start local week', () => {
    const state = apply(setWeeklyGoal(createXpState(), 100), [
      [SESSION, '2026-10-11T03:00:00Z'], // Sunday, previous week
      [SESSION, '2026-10-12T03:00:00Z'], // Monday
      [REVIEW, '2026-10-18T03:00:00Z'] // Sunday
    ]);
    expect(weeklyProgress(state, at('2026-10-18T10:00:00Z'), JAKARTA)).toEqual({
      weekStart: '2026-10-12',
      earned: 12,
      goal: 100
    });
  });
  it('clamps the goal to a whole number in range', () => {
    expect(setWeeklyGoal(createXpState(), -5).weeklyGoal).toBe(0);
    expect(setWeeklyGoal(createXpState(), 120.6).weeklyGoal).toBe(121);
    expect(setWeeklyGoal(createXpState(), Number.NaN).weeklyGoal).toBe(0);
    expect(setWeeklyGoal(createXpState(), 1e9).weeklyGoal).toBe(5000);
  });
  it('keeps only recent daily totals', () => {
    const state = apply(createXpState(), [
      [REVIEW, '2026-09-01T03:00:00Z'],
      [REVIEW, '2026-10-18T03:00:00Z']
    ]);
    expect(Object.keys(state.daily)).toEqual(['2026-10-18']);
  });
});

describe('day and week keys', () => {
  it('formats local days and Monday week starts', () => {
    expect(dayKey(at('2026-10-18T17:30:00Z'), JAKARTA)).toBe('2026-10-19');
    expect(dayKey(at('2026-10-18T17:30:00Z'), 'America/New_York')).toBe('2026-10-18');
    expect(weekKey('2026-10-18')).toBe('2026-10-12');
    expect(weekKey('2026-10-19')).toBe('2026-10-19');
  });
});
