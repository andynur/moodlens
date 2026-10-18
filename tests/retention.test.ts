import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeStub } from './chrome-stub';
import { createBackup, parseBackup } from '../src/shared/backup';
import { DEFAULT_REVIEW_LOG_RETENTION, STUDY_RETENTION_KEY } from '../src/shared/cards';

const A = 'https://moodle-a.example.edu';
const stub = createChromeStub();
const page: chrome.runtime.MessageSender = { id: 'moodlens-test' };

beforeAll(async () => {
  vi.stubGlobal('chrome', stub.chromeStub);
  await import('../src/background/index');
});
beforeEach(() => stub.reset());

const set = (days: unknown) => stub.send({ type: 'SET_STUDY_RETENTION', days }, page);

describe('review log retention (D-014)', () => {
  it('stores one of the three documented values', async () => {
    await expect(set(90)).resolves.toEqual({ ok: true, days: 90 });
    expect(stub.local.get(STUDY_RETENTION_KEY)).toBe(90);
    await expect(set(730)).resolves.toEqual({ ok: true, days: 730 });
    expect(stub.local.get(STUDY_RETENTION_KEY)).toBe(730);
  });

  it('falls back to the default for any other value', async () => {
    for (const bad of [0, -1, 100, '365', null, { days: 90 }]) {
      await expect(set(bad)).resolves.toEqual({ ok: true, days: DEFAULT_REVIEW_LOG_RETENTION });
      expect(stub.local.get(STUDY_RETENTION_KEY)).toBe(DEFAULT_REVIEW_LOG_RETENTION);
    }
  });

  it('refuses the message from a content script', async () => {
    const sender = { id: 'moodlens-test', tab: { id: 3 } as chrome.tabs.Tab, url: `${A}/my/`, origin: A };
    await expect(stub.send({ type: 'SET_STUDY_RETENTION', days: 90 }, sender)).resolves.toEqual({ ok: false });
    expect(stub.local.has(STUDY_RETENTION_KEY)).toBe(false);
  });

  it('is carried by a backup, and an invalid value in a backup rejects the file', () => {
    const backup = createBackup({ sites: [], [STUDY_RETENTION_KEY]: 90 });
    expect(backup.data[STUDY_RETENTION_KEY]).toBe(90);
    expect(parseBackup({ ...backup, data: { sites: [], [STUDY_RETENTION_KEY]: 7 } })).toBeNull();
    expect(createBackup({ sites: [], [STUDY_RETENTION_KEY]: 7 }).data[STUDY_RETENTION_KEY]).toBeUndefined();
  });
});
