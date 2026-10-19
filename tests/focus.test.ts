import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeStub } from './chrome-stub';
import { createBackup } from '../src/shared/backup';
import {
  cleanNoteText,
  FOCUS_ALARM,
  FOCUS_KEY,
  isActivityNote,
  isFocusComplete,
  isFocusSession,
  MAX_NOTE_LENGTH,
  newFocusSession,
  noteId
} from '../src/shared/focus';
import { handleFocusAlarm } from '../src/background/focus';

// IndexedDB is absent here, so the note tests cover validation and the trust checks before the store
// opens; the notes store itself is exercised in Chrome like the rest of the study database.

const A = 'https://moodle-a.example.edu';
const stub = createChromeStub();
const page: chrome.runtime.MessageSender = { id: 'moodlens-test' };
const content: chrome.runtime.MessageSender = {
  id: 'moodlens-test',
  tab: { id: 3 } as chrome.tabs.Tab,
  url: `${A}/course/view.php?id=7`,
  origin: A
};

beforeAll(async () => {
  vi.stubGlobal('chrome', stub.chromeStub);
  await import('../src/background/index');
});
beforeEach(() => stub.reset());

async function enable(origin: string) {
  stub.granted.add(`${origin}/*`);
  const response = (await stub.send({ type: 'ENABLE_SITE', origin }, page)) as { site: { id: string } | null };
  return response.site!.id;
}

const at = new Date('2026-10-19T08:00:00Z');
type FocusReply = { ok: boolean; session: { endsAt: string } | null; awarded?: number };
const xp = async () => ((await stub.send({ type: 'XP_STATE' }, page)) as { totalXp: number }).totalXp;

describe('focus session rules (ML-026)', () => {
  it('ends exactly after its length and rejects a stored session with a shortened end', () => {
    const session = newFocusSession('moodle-a.example.edu', '7', 25, at);
    expect(isFocusSession(session)).toBe(true);
    expect(isFocusComplete(session, new Date(at.getTime() + 25 * 60_000 - 1))).toBe(false);
    expect(isFocusComplete(session, new Date(at.getTime() + 25 * 60_000))).toBe(true);
    expect(isFocusSession({ ...session, endsAt: new Date(at.getTime() + 60_000).toISOString() })).toBe(false);
    expect(isFocusSession({ ...session, minutes: 1 })).toBe(false);
    expect(isFocusSession({ ...session, courseId: '7; drop' })).toBe(false);
  });
});

describe('focus timer service (ML-026)', () => {
  it('starts a session only for a registered site, a numeric course and an offered length', async () => {
    await expect(
      stub.send({ type: 'FOCUS_START', siteId: 'moodle-a.example.edu', courseId: '7', minutes: 25 }, page)
    ).resolves.toMatchObject({ ok: false, session: null });
    const siteId = await enable(A);
    for (const bad of [
      { courseId: '7', minutes: 1 },
      { courseId: '7', minutes: '25' },
      { courseId: 'x', minutes: 25 }
    ]) {
      await expect(stub.send({ type: 'FOCUS_START', siteId, ...bad }, page)).resolves.toMatchObject({ ok: false });
    }
    const started = (await stub.send({ type: 'FOCUS_START', siteId, courseId: '7', minutes: 15 }, page)) as FocusReply;
    expect(started.ok).toBe(true);
    expect(stub.chromeStub.alarms.create).toHaveBeenCalledWith(FOCUS_ALARM, {
      when: Date.parse(started.session!.endsAt)
    });
  });

  it('refuses focus commands from content scripts', async () => {
    const siteId = await enable(A);
    await expect(stub.send({ type: 'FOCUS_START', siteId, courseId: '7', minutes: 25 }, content)).resolves.toEqual({
      ok: false
    });
    expect(stub.local.has(FOCUS_KEY)).toBe(false);
  });

  it('awards no XP for a running or cancelled session', async () => {
    const siteId = await enable(A);
    await stub.send({ type: 'FOCUS_START', siteId, courseId: '7', minutes: 25 }, page);
    const state = (await stub.send({ type: 'FOCUS_STATE' }, page)) as FocusReply;
    expect(state.session).not.toBeNull();
    expect(state.awarded).toBeUndefined();
    await expect(stub.send({ type: 'FOCUS_CANCEL' }, page)).resolves.toEqual({ ok: true, session: null });
    expect(stub.chromeStub.alarms.clear).toHaveBeenCalledWith(FOCUS_ALARM);
    expect(await xp()).toBe(0);
  });

  it('awards focus XP once when the alarm fires after the full length', async () => {
    const siteId = await enable(A);
    const started = (await stub.send({ type: 'FOCUS_START', siteId, courseId: '7', minutes: 25 }, page)) as FocusReply;
    const end = new Date(started.session!.endsAt);
    const alarm = { name: FOCUS_ALARM, scheduledTime: end.getTime(), persistAcrossSessions: true };
    await handleFocusAlarm(alarm, new Date(end.getTime() - 1000));
    expect(await xp()).toBe(0);
    await handleFocusAlarm(alarm, end);
    expect(await xp()).toBe(10);
    expect(stub.local.has(FOCUS_KEY)).toBe(false);
    await handleFocusAlarm(alarm, end);
    expect(await xp()).toBe(10);
  });

  it('awards nothing when the site was removed before the session ended', async () => {
    const siteId = await enable(A);
    const started = (await stub.send({ type: 'FOCUS_START', siteId, courseId: '7', minutes: 15 }, page)) as FocusReply;
    await stub.send({ type: 'REMOVE_SITE', siteId }, page);
    await handleFocusAlarm(
      { name: FOCUS_ALARM, scheduledTime: 0, persistAcrossSessions: true },
      new Date(started.session!.endsAt)
    );
    expect(await xp()).toBe(0);
  });

  it('ignores a tampered stored session and keeps it out of backups', async () => {
    const siteId = await enable(A);
    stub.local.set(FOCUS_KEY, { ...newFocusSession(siteId, '7', 25, at), endsAt: at.toISOString() });
    await expect(stub.send({ type: 'FOCUS_STATE' }, page)).resolves.toEqual({ ok: true, session: null });
    expect(await xp()).toBe(0);
    stub.local.set(FOCUS_KEY, newFocusSession(siteId, '7', 25, at));
    expect(JSON.stringify(createBackup(Object.fromEntries(stub.local), at))).not.toContain('"focus"');
  });
});

describe('activity notes (ML-026)', () => {
  it('validates note records and cleans control characters', () => {
    const note = {
      id: noteId('moodle-a.example.edu', '7', '42'),
      siteId: 'moodle-a.example.edu',
      courseId: '7',
      activityId: '42',
      text: 'Read chapter 2',
      updatedAt: at.toISOString()
    };
    expect(isActivityNote(note)).toBe(true);
    expect(isActivityNote({ ...note, id: noteId('moodle-a.example.edu', '7', '43') })).toBe(false);
    expect(isActivityNote({ ...note, text: '' })).toBe(false);
    expect(isActivityNote({ ...note, text: 'x'.repeat(MAX_NOTE_LENGTH + 1) })).toBe(false);
    expect(cleanNoteText('a\r\nb\u0007\tc  ')).toBe('a\nb\tc');
  });

  it('refuses notes for unregistered sites, bad ids, oversized text and content scripts', async () => {
    const note = { siteId: 'moodle-a.example.edu', courseId: '7', activityId: '42', text: 'ok' };
    await expect(stub.send({ type: 'SAVE_NOTE', ...note }, page)).resolves.toEqual({ ok: false });
    const siteId = await enable(A);
    await expect(stub.send({ type: 'SAVE_NOTE', ...note, siteId, activityId: 'a1' }, page)).resolves.toEqual({
      ok: false
    });
    await expect(
      stub.send({ type: 'SAVE_NOTE', ...note, siteId, text: 'x'.repeat(MAX_NOTE_LENGTH + 1) }, page)
    ).resolves.toEqual({ ok: false });
    await expect(stub.send({ type: 'SAVE_NOTE', ...note, siteId }, content)).resolves.toEqual({ ok: false });
    await expect(stub.send({ type: 'NOTES_FOR_COURSE', siteId, courseId: '7' }, content)).resolves.toEqual({
      ok: false
    });
    await expect(
      stub.send({ type: 'NOTES_FOR_COURSE', siteId: 'other.example', courseId: '7' }, page)
    ).resolves.toEqual({ ok: false, notes: [] });
  });
});
