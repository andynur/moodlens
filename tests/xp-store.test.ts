import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeStub } from './chrome-stub';
import { createBackup, parseBackup } from '../src/shared/backup';
import { createXpState, DAILY_XP_CAP, MAX_WEEKLY_GOAL } from '../src/shared/xp';

const A = 'https://moodle-a.example.edu';
const stub = createChromeStub();
const page: chrome.runtime.MessageSender = { id: 'moodlens-test' };
const content: chrome.runtime.MessageSender = {
  id: 'moodlens-test',
  tab: { id: 3 } as chrome.tabs.Tab,
  url: `${A}/my/`,
  origin: A
};

beforeAll(async () => {
  vi.stubGlobal('chrome', stub.chromeStub);
  await import('../src/background/index');
});
beforeEach(() => stub.reset());

const xp = () =>
  stub.send({ type: 'XP_STATE' }, page) as Promise<{
    ok: boolean;
    totalXp: number;
    level: number;
    streak: number;
    weeklyGoal: number;
    weeklyEarned: number;
    today: number;
  }>;
const session = () => stub.send({ type: 'STUDY_SESSION_DONE' }, page);

describe('XP storage (ML-021)', () => {
  it('starts at level 1 with nothing earned', async () => {
    await expect(xp()).resolves.toMatchObject({ ok: true, totalXp: 0, level: 1, streak: 0, weeklyGoal: 0 });
  });

  it('awards a finished review session and keeps the streak', async () => {
    await expect(session()).resolves.toMatchObject({ ok: true, awarded: 10 });
    await expect(xp()).resolves.toMatchObject({ totalXp: 10, today: 10, streak: 1, weeklyEarned: 10 });
  });

  it('stops awarding at the daily cap but keeps the state valid', async () => {
    for (let i = 0; i < 20; i++) await session();
    const view = await xp();
    expect(view.today).toBe(DAILY_XP_CAP);
    expect(view.totalXp).toBe(DAILY_XP_CAP);
    expect(view.streak).toBe(1);
  });

  it('saves a weekly goal inside its range and refuses anything else', async () => {
    await expect(stub.send({ type: 'SET_WEEKLY_GOAL', goal: 300 }, page)).resolves.toMatchObject({ ok: true });
    await expect(xp()).resolves.toMatchObject({ weeklyGoal: 300 });
    await expect(stub.send({ type: 'SET_WEEKLY_GOAL', goal: 99_999 }, page)).resolves.toMatchObject({ ok: true });
    await expect(xp()).resolves.toMatchObject({ weeklyGoal: MAX_WEEKLY_GOAL });
    await expect(stub.send({ type: 'SET_WEEKLY_GOAL', goal: '100' }, page)).resolves.toEqual({ ok: false });
    await expect(stub.send({ type: 'SET_WEEKLY_GOAL', goal: Number.NaN }, page)).resolves.toEqual({ ok: false });
  });

  it('awards early-start XP once per task, and only well before the deadline', async () => {
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const later = new Date(Date.now() + 9 * 86_400_000).toISOString();
    await expect(stub.send({ type: 'TASK_OPENED', taskId: 'a/1', dueAt: soon }, page)).resolves.toEqual({
      ok: true,
      awarded: 0
    });
    await expect(stub.send({ type: 'TASK_OPENED', taskId: 'a/2', dueAt: later }, page)).resolves.toEqual({
      ok: true,
      awarded: 10
    });
    await expect(stub.send({ type: 'TASK_OPENED', taskId: 'a/2', dueAt: later }, page)).resolves.toEqual({
      ok: true,
      awarded: 0
    });
    await expect(stub.send({ type: 'TASK_OPENED', taskId: 'a/3', dueAt: 'not a date' }, page)).resolves.toEqual({
      ok: false
    });
    await expect(xp()).resolves.toMatchObject({ totalXp: 10 });
  });

  it('refuses XP messages from a content script', async () => {
    for (const message of [
      { type: 'XP_STATE' },
      { type: 'STUDY_SESSION_DONE' },
      { type: 'SET_WEEKLY_GOAL', goal: 100 },
      { type: 'TASK_OPENED', taskId: 'a/1', dueAt: new Date().toISOString() }
    ]) {
      await expect(stub.send(message, content)).resolves.toEqual({ ok: false });
    }
  });

  it('ignores a stored state that fails validation', async () => {
    stub.local.set('xp', { totalXp: -5, daily: {}, streak: null, weeklyGoal: 0, earlyTaskIds: [] });
    await expect(xp()).resolves.toMatchObject({ totalXp: 0, level: 1 });
  });

  it('carries XP in a backup and rejects an invalid state in one', () => {
    const state = createXpState();
    expect(createBackup({ sites: [], xp: state }).data.xp).toEqual(state);
    expect(createBackup({ sites: [], xp: { totalXp: 1 } }).data.xp).toBeUndefined();
    const backup = createBackup({ sites: [], xp: state });
    expect(parseBackup({ ...backup, data: { sites: [], xp: { totalXp: 'lots' } } })).toBeNull();
  });
});
