// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeStub } from './chrome-stub';
import { parseCourse } from '../src/content/moodle/adapter';
import { snapshotKey, taskDataKey } from '../src/shared/sites';
import type { CourseSnapshot, TaskDataset } from '../src/shared/types';

const A = 'https://moodle-a.example.edu';
const B = 'https://moodle-b.example.edu';
const stub = createChromeStub();
const page: chrome.runtime.MessageSender = { id: 'moodlens-test' };
const tab = { id: 7 } as chrome.tabs.Tab;

beforeAll(async () => {
  vi.stubGlobal('chrome', stub.chromeStub);
  await import('../src/background/index');
});
beforeEach(() => stub.reset());

function snapshot(origin: string, courseId = '5'): CourseSnapshot {
  const doc = new DOMParser().parseFromString(
    `<h1>Course</h1><li class="activity"><a href="${origin}/mod/quiz/view.php?id=9">Quiz</a></li>`,
    'text/html'
  );
  return parseCourse(doc, `${origin}/course/view.php?id=${courseId}`)!;
}
function fromContent(origin: string, courseId = '5'): chrome.runtime.MessageSender {
  return { id: 'moodlens-test', tab, url: `${origin}/course/view.php?id=${courseId}`, origin };
}
async function enable(origin: string) {
  stub.granted.add(`${origin}/*`);
  return stub.send({ type: 'ENABLE_SITE', origin }, page);
}

describe('ENABLE_SITE', () => {
  it('refuses an origin Chrome has not granted', async () => {
    await expect(stub.send({ type: 'ENABLE_SITE', origin: A }, page)).resolves.toEqual({ ok: false, site: null });
    expect(stub.scripts.size).toBe(0);
  });
  it('refuses HTTP origins and senders other than extension pages', async () => {
    stub.granted.add('http://moodle-a.example.edu/*');
    await expect(stub.send({ type: 'ENABLE_SITE', origin: 'http://moodle-a.example.edu' }, page)).resolves.toEqual({
      ok: false,
      site: null
    });
    stub.granted.add(`${A}/*`);
    await expect(stub.send({ type: 'ENABLE_SITE', origin: A }, fromContent(A))).resolves.toEqual({ ok: false });
    expect(stub.local.get('sites')).toBeUndefined();
  });
  it('registers the site and a content script for that enabled origin only', async () => {
    const response = (await enable(A)) as { ok: boolean; site: { id: string; detection?: string } };
    expect(response.ok).toBe(true);
    expect(response.site).toMatchObject({ id: 'moodle-a.example.edu', origin: A, label: 'moodle-a.example.edu' });
    expect(response.site.detection).toBeUndefined();
    expect([...stub.scripts.values()]).toEqual([
      expect.objectContaining({ id: 'moodlens-moodle-a.example.edu', matches: [`${A}/*`] })
    ]);
  });
  it('runs detection once on the active tab of that origin', async () => {
    stub.state.activeTab = { id: 3, url: `${A}/my/` } as chrome.tabs.Tab;
    const response = (await enable(A)) as { site: { detection: string; versionHint: string } };
    expect(response.site).toMatchObject({ detection: 'high', versionHint: '4.x' });
    expect(stub.executeScript).toHaveBeenCalledTimes(2);
    expect(stub.executeScript.mock.calls[0]?.[0]).toHaveProperty('func');
    expect(stub.executeScript.mock.calls[1]?.[0]).toMatchObject({ files: ['content.js'] });
  });
  it('records a page that is not Moodle and ignores malformed detection results', async () => {
    stub.state.activeTab = { id: 3, url: `${A}/` } as chrome.tabs.Tab;
    stub.state.detection = { isMoodle: false, confidence: 'none' };
    expect(((await enable(A)) as { site: { detection: string } }).site.detection).toBe('none');
    stub.state.detection = { isMoodle: true, confidence: 'certain' };
    expect(((await enable(B)) as { site: { detection?: string } }).site.detection).toBeUndefined();
  });
});

describe('TASK_DATASET', () => {
  const taskData = (siteId = 'moodle-a.example.edu'): TaskDataset => ({
    siteId,
    courses: [{ siteId, id: '5', name: 'Course', visible: true }],
    tasks: [
      {
        siteId,
        courseId: '5',
        kind: 'quiz',
        title: 'Quiz',
        dueAt: '2027-01-15T08:00:00.000Z',
        url: `${A}/mod/quiz/view.php?id=9`,
        status: 'open',
        source: 'ajax'
      }
    ],
    capturedAt: '2026-10-19T00:00:00.000Z',
    source: 'ajax'
  });

  it('claims no more than once per 15 minutes unless refresh is explicit', async () => {
    await enable(A);
    const sender = { id: 'moodlens-test', tab, url: `${A}/my/`, origin: A };
    await expect(stub.send({ type: 'TASK_CAPTURE_CLAIM' }, sender)).resolves.toMatchObject({ ok: true, due: true });
    await expect(stub.send({ type: 'TASK_CAPTURE_CLAIM' }, sender)).resolves.toMatchObject({ ok: true, due: false });
    await expect(stub.send({ type: 'TASK_CAPTURE_CLAIM', force: true }, sender)).resolves.toMatchObject({
      ok: true,
      due: true
    });
  });

  it('stores only validated normalized data from its registered origin', async () => {
    await enable(A);
    const sender = { id: 'moodlens-test', tab, url: `${A}/my/`, origin: A };
    await expect(stub.send({ type: 'TASK_DATASET', payload: taskData() }, sender)).resolves.toEqual({ ok: true });
    expect(stub.local.get(taskDataKey('moodle-a.example.edu'))).toEqual(taskData());
    await expect(stub.send({ type: 'TASK_DATASET', payload: taskData('other.example') }, sender)).resolves.toEqual({
      ok: false
    });
  });
});

describe('COURSE_SNAPSHOT', () => {
  it('rejects messages from an origin not in the registry', async () => {
    await expect(stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(A) }, fromContent(A))).resolves.toEqual({
      ok: false
    });
    expect(stub.local.has(snapshotKey('moodle-a.example.edu'))).toBe(false);
  });
  it('rejects a payload for another origin or another course', async () => {
    await enable(A);
    await expect(stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(B) }, fromContent(A))).resolves.toEqual({
      ok: false
    });
    await expect(
      stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(A, '6') }, fromContent(A, '5'))
    ).resolves.toEqual({ ok: false });
  });
  it('keeps two sites in separate namespaces', async () => {
    await enable(A);
    await enable(B);
    await stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(A) }, fromContent(A));
    await stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(B) }, fromContent(B));
    expect((stub.local.get(snapshotKey('moodle-a.example.edu')) as CourseSnapshot).sourceUrl).toContain(A);
    expect((stub.local.get(snapshotKey('moodle-b.example.edu')) as CourseSnapshot).sourceUrl).toContain(B);
  });
});

describe('site management', () => {
  it('REMOVE_SITE deletes its data, permission and script, and keeps other sites', async () => {
    await enable(A);
    await enable(B);
    await stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(A) }, fromContent(A));
    await stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(B) }, fromContent(B));
    await expect(stub.send({ type: 'REMOVE_SITE', siteId: 'moodle-a.example.edu' }, page)).resolves.toEqual({
      ok: true
    });
    expect(stub.local.has(snapshotKey('moodle-a.example.edu'))).toBe(false);
    expect(stub.local.has(snapshotKey('moodle-b.example.edu'))).toBe(true);
    expect([...stub.granted]).toEqual([`${B}/*`]);
    expect([...stub.scripts.keys()]).toEqual(['moodlens-moodle-b.example.edu']);
    expect((stub.local.get('sites') as { id: string }[]).map((site) => site.id)).toEqual(['moodle-b.example.edu']);
  });
  it('RENAME_SITE accepts a trimmed label and rejects empty or unknown input', async () => {
    await enable(A);
    const rename = (siteId: string, label: string) => stub.send({ type: 'RENAME_SITE', siteId, label }, page);
    await expect(rename('moodle-a.example.edu', '  My   campus ')).resolves.toEqual({ ok: true });
    expect((stub.local.get('sites') as { label: string }[])[0]?.label).toBe('My campus');
    await expect(rename('moodle-a.example.edu', '   ')).resolves.toEqual({ ok: false });
    await expect(rename('unknown.example', 'X')).resolves.toEqual({ ok: false });
  });
});

describe('CLEAR_LOCAL_DATA', () => {
  it('clears storage and revokes every site for a trusted extension page', async () => {
    await enable(A);
    await stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(A) }, fromContent(A));
    await expect(stub.send({ type: 'CLEAR_LOCAL_DATA' }, page)).resolves.toEqual({ ok: true });
    // Only the empty current-layout markers remain.
    expect(Object.fromEntries(stub.local)).toEqual({ schemaVersion: 2, sites: [] });
    expect(stub.granted.size).toBe(0);
    expect(stub.scripts.size).toBe(0);
  });
  it('rejects content scripts and other extensions without clearing', async () => {
    await enable(A);
    await expect(stub.send({ type: 'CLEAR_LOCAL_DATA' }, fromContent(A))).resolves.toEqual({ ok: false });
    await expect(stub.send({ type: 'CLEAR_LOCAL_DATA' }, { id: 'other-extension' })).resolves.toEqual({ ok: false });
    expect(stub.local.has('sites')).toBe(true);
  });
  it('reports failure when storage cannot be cleared', async () => {
    stub.chromeStub.storage.local.clear.mockImplementationOnce(() => Promise.reject(new Error('quota')));
    await expect(stub.send({ type: 'CLEAR_LOCAL_DATA' }, page)).resolves.toEqual({ ok: false });
  });
});

describe('course records, prefs and backup', () => {
  const siteId = 'moodle-a.example.edu';
  const recordsKey = `site:${siteId}:snapshots`;
  const prefsKey = `site:${siteId}:courses`;
  async function capture(courseId = '5') {
    return stub.send({ type: 'COURSE_SNAPSHOT', payload: snapshot(A, courseId) }, fromContent(A, courseId));
  }

  it("stores each captured course in the what's new records", async () => {
    await enable(A);
    await capture('5');
    await capture('6');
    expect(Object.keys(stub.local.get(recordsKey) as object).sort()).toEqual(['5', '6']);
  });
  it('MARK_COURSE_SEEN and SET_COURSE_PREFS accept only known courses from extension pages', async () => {
    await enable(A);
    await capture('5');
    await expect(stub.send({ type: 'MARK_COURSE_SEEN', siteId, courseId: '5' }, page)).resolves.toEqual({ ok: true });
    await expect(stub.send({ type: 'MARK_COURSE_SEEN', siteId, courseId: '9' }, page)).resolves.toEqual({ ok: false });
    const prefs = { type: 'SET_COURSE_PREFS', siteId, courseId: '5', prefs: { pinned: true, nickname: ' Calc ' } };
    await expect(stub.send(prefs, fromContent(A))).resolves.toEqual({ ok: false });
    await expect(stub.send(prefs, page)).resolves.toEqual({ ok: true });
    expect(stub.local.get(prefsKey)).toEqual({ '5': { pinned: true, nickname: 'Calc' } });
    await expect(stub.send({ ...prefs, prefs: { color: 'neon' } }, page)).resolves.toEqual({ ok: false });
    await expect(stub.send({ ...prefs, prefs: {} }, page)).resolves.toEqual({ ok: true });
    expect(stub.local.get(prefsKey)).toEqual({});
  });
  it('MOVE_COURSE stores positions and keeps them when prefs change', async () => {
    await enable(A);
    await capture('5');
    await capture('6');
    await stub.send({ type: 'MOVE_COURSE', siteId, courseId: '5', direction: 'up' }, page);
    expect(stub.local.get(prefsKey)).toEqual({ '5': { position: 0 }, '6': { position: 1 } });
    await stub.send({ type: 'SET_COURSE_PREFS', siteId, courseId: '5', prefs: { hidden: true, position: 9 } }, page);
    expect((stub.local.get(prefsKey) as Record<string, unknown>)['5']).toEqual({ hidden: true, position: 0 });
  });
  it('REMOVE_SITE deletes records and prefs too', async () => {
    await enable(A);
    await capture('5');
    await stub.send({ type: 'SET_COURSE_PREFS', siteId, courseId: '5', prefs: { pinned: true } }, page);
    await stub.send({ type: 'REMOVE_SITE', siteId }, page);
    expect(stub.local.has(recordsKey)).toBe(false);
    expect(stub.local.has(prefsKey)).toBe(false);
  });
  it('backup round-trip restores the same state and keeps access only for listed sites', async () => {
    await enable(A);
    await enable(B);
    await capture('5');
    stub.local.set('theme', 'dark');
    const exported = (await stub.send({ type: 'EXPORT_BACKUP' }, page)) as { ok: boolean; backup: unknown };
    expect(exported.ok).toBe(true);
    const before = Object.fromEntries(stub.local);
    await stub.send({ type: 'REMOVE_SITE', siteId: 'moodle-b.example.edu' }, page);
    stub.granted.add('https://unrelated.example.edu/*');
    stub.local.set('theme', 'light');
    await expect(stub.send({ type: 'IMPORT_BACKUP', backup: exported.backup }, page)).resolves.toEqual({ ok: true });
    expect(Object.fromEntries(stub.local)).toEqual({ ...before, schemaVersion: 2 });
    expect([...stub.granted]).toEqual([`${A}/*`]);
    expect([...stub.scripts.keys()]).toEqual(['moodlens-moodle-a.example.edu']);
  });
  it('rejects an invalid backup without touching data, and content-script exports', async () => {
    await enable(A);
    await expect(stub.send({ type: 'IMPORT_BACKUP', backup: { format: 'x' } }, page)).resolves.toEqual({ ok: false });
    expect(stub.local.has('sites')).toBe(true);
    await expect(stub.send({ type: 'EXPORT_BACKUP' }, fromContent(A))).resolves.toEqual({ ok: false });
  });
});

describe('SET_APPEARANCE / GET_APPEARANCE (ML-018)', () => {
  const siteId = 'moodle-a.example.edu';
  const appearanceId = `moodlens-appearance-${siteId}`;
  it('registers the appearance script only while an option is on, and updates open tabs', async () => {
    await enable(A);
    stub.state.activeTab = { id: 4, url: `${A}/my/` } as chrome.tabs.Tab;
    stub.state.tabListening = true;
    await expect(stub.send({ type: 'SET_APPEARANCE', siteId, appearance: { dark: true } }, page)).resolves.toEqual({
      ok: true
    });
    expect(stub.scripts.get(appearanceId)).toMatchObject({
      matches: [`${A}/*`],
      js: ['appearance.js'],
      css: ['appearance.css'],
      runAt: 'document_start'
    });
    expect(stub.tabMessages).toHaveBeenLastCalledWith(4, { type: 'APPEARANCE', appearance: { dark: true } });
    await stub.send({ type: 'SET_APPEARANCE', siteId, appearance: {} }, page);
    expect(stub.scripts.has(appearanceId)).toBe(false);
    expect(stub.local.has(`site:${siteId}:appearance`)).toBe(false);
    expect(stub.tabMessages).toHaveBeenLastCalledWith(4, { type: 'APPEARANCE', appearance: {} });
  });
  it('injects into open tabs that do not have the script yet', async () => {
    await enable(A);
    stub.state.activeTab = { id: 4, url: `${A}/my/` } as chrome.tabs.Tab;
    stub.executeScript.mockClear();
    await stub.send({ type: 'SET_APPEARANCE', siteId, appearance: { largeText: true } }, page);
    expect(stub.chromeStub.scripting.insertCSS).toHaveBeenCalledWith({
      target: { tabId: 4 },
      files: ['appearance.css']
    });
    expect(stub.executeScript).toHaveBeenCalledWith({ target: { tabId: 4 }, files: ['appearance.js'] });
  });
  it('rejects invalid options, unknown sites and content senders', async () => {
    await enable(A);
    await expect(stub.send({ type: 'SET_APPEARANCE', siteId, appearance: { css: 'x' } }, page)).resolves.toEqual({
      ok: false
    });
    await expect(stub.send({ type: 'SET_APPEARANCE', siteId: 'x.example', appearance: {} }, page)).resolves.toEqual({
      ok: false
    });
    await expect(
      stub.send({ type: 'SET_APPEARANCE', siteId, appearance: { dark: true } }, fromContent(A))
    ).resolves.toEqual({ ok: false });
  });
  it('answers GET_APPEARANCE only for registered origins', async () => {
    await enable(A);
    await stub.send({ type: 'SET_APPEARANCE', siteId, appearance: { comfortableWidth: true } }, page);
    await expect(stub.send({ type: 'GET_APPEARANCE' }, fromContent(A))).resolves.toEqual({
      ok: true,
      appearance: { comfortableWidth: true }
    });
    await expect(stub.send({ type: 'GET_APPEARANCE' }, fromContent(B))).resolves.toEqual({ ok: false, appearance: {} });
  });
  it('REMOVE_SITE resets open tabs and drops the appearance script', async () => {
    await enable(A);
    await stub.send({ type: 'SET_APPEARANCE', siteId, appearance: { dark: true } }, page);
    stub.state.activeTab = { id: 4, url: `${A}/my/` } as chrome.tabs.Tab;
    stub.state.tabListening = true;
    await stub.send({ type: 'REMOVE_SITE', siteId }, page);
    expect(stub.tabMessages).toHaveBeenLastCalledWith(4, { type: 'APPEARANCE', appearance: {} });
    expect(stub.scripts.has(appearanceId)).toBe(false);
  });
});
