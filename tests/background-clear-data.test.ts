import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal chrome stub: the background script registers its listener at import time.
type Listener = (raw: unknown, sender: chrome.runtime.MessageSender, respond: (value: unknown) => void) => boolean;
let listener: Listener;
const localClear = vi.fn(() => Promise.resolve());
const sessionClear = vi.fn(() => Promise.resolve());
const area = (clear: () => Promise<void>) => ({
  clear, setAccessLevel: () => Promise.resolve(), get: () => Promise.resolve({}), set: () => Promise.resolve()
});

beforeAll(async () => {
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'moodlens-test',
      onInstalled: { addListener: () => undefined },
      onMessage: { addListener: (fn: Listener) => { listener = fn; } }
    },
    sidePanel: { setPanelBehavior: () => Promise.resolve() },
    storage: { local: area(localClear), session: area(sessionClear) }
  });
  await import('../src/background/index');
});
beforeEach(() => { localClear.mockClear(); sessionClear.mockClear(); });

function send(sender: chrome.runtime.MessageSender): Promise<unknown> {
  return new Promise((resolve) => { listener({ type: 'CLEAR_LOCAL_DATA' }, sender, resolve); });
}

describe('CLEAR_LOCAL_DATA', () => {
  it('clears local and session storage for a trusted extension page', async () => {
    await expect(send({ id: 'moodlens-test' })).resolves.toEqual({ ok: true });
    expect(localClear).toHaveBeenCalledOnce();
    expect(sessionClear).toHaveBeenCalledOnce();
  });
  it('rejects content scripts and other extensions without clearing', async () => {
    const tab = { id: 1 } as chrome.tabs.Tab;
    await expect(send({ id: 'moodlens-test', tab, url: 'https://solusi.sibermu.ac.id/course/view.php?id=1' }))
      .resolves.toEqual({ ok: false });
    await expect(send({ id: 'other-extension' })).resolves.toEqual({ ok: false });
    expect(localClear).not.toHaveBeenCalled();
    expect(sessionClear).not.toHaveBeenCalled();
  });
  it('reports failure when storage cannot be cleared', async () => {
    localClear.mockImplementationOnce(() => Promise.reject(new Error('quota')));
    await expect(send({ id: 'moodlens-test' })).resolves.toEqual({ ok: false });
  });
});
