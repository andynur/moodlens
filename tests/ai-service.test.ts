// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeStub } from './chrome-stub';
import type { AiPrepareResponse, AiSendResponse, AiSettingsView } from '../src/shared/types';

const A = 'https://moodle-a.example.edu';
const KEY = 'sk-test-0123456789';
const stub = createChromeStub();
const page: chrome.runtime.MessageSender = { id: 'moodlens-test' };
const fetchMock = vi.fn<typeof fetch>();

beforeAll(async () => {
  vi.stubGlobal('chrome', stub.chromeStub);
  vi.stubGlobal('fetch', fetchMock);
  await import('../src/background/index');
});
beforeEach(async () => {
  stub.reset();
  await chrome.storage.session.clear();
  fetchMock.mockReset();
});

const send = <T>(message: unknown, sender = page) => stub.send(message, sender) as Promise<T>;
const task = {
  purpose: 'question',
  language: 'en',
  docName: 'bio.pdf',
  question: 'Where is ATP made?',
  evidence: [{ page: 5, text: 'Mitochondria produce ATP for the cell.' }]
};
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const answer = {
  choices: [{ message: { content: JSON.stringify({ status: 'answer', text: 'Mitochondria [S1].', sources: ['S1'] }) } }]
};

async function setUp(grant = true) {
  await send({ type: 'AI_SAVE_SETTINGS', provider: 'openai', model: 'gpt-test' });
  await send({ type: 'AI_SAVE_KEY', provider: 'openai', key: KEY });
  if (grant) stub.granted.add('https://api.openai.com/*');
}
async function prepare() {
  const response = await send<AiPrepareResponse>({ type: 'AI_PREPARE', task });
  if (!response.ok) throw new Error(response.error);
  return response.preview;
}

describe('provider settings and keys', () => {
  it('never returns the key and forgets it on request', async () => {
    await setUp();
    const view = await send<AiSettingsView>({ type: 'AI_SETTINGS' });
    expect(view).toMatchObject({
      ok: true,
      enabled: true,
      provider: 'openai',
      keys: { openai: true, gemini: false }
    });
    expect(JSON.stringify(view)).not.toContain(KEY);
    expect(await chrome.storage.local.get(null)).not.toHaveProperty('aiKey:openai');
    await send({ type: 'AI_FORGET_KEYS' });
    expect((await send<AiSettingsView>({ type: 'AI_SETTINGS' })).keys.openai).toBe(false);
  });

  it('refuses keys and settings from content scripts', async () => {
    const tab = { id: 'moodlens-test', tab: { id: 3 } as chrome.tabs.Tab, url: `${A}/my/`, origin: A };
    await expect(send({ type: 'AI_SAVE_KEY', provider: 'openai', key: KEY }, tab)).resolves.toEqual({ ok: false });
    await expect(send({ type: 'AI_SEND', nonce: 'x' }, tab)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses invalid models and keys', async () => {
    await expect(send({ type: 'AI_SAVE_SETTINGS', provider: 'openai', model: '../files' })).resolves.toEqual({
      ok: false
    });
    await expect(send({ type: 'AI_SAVE_KEY', provider: 'openai', key: 'bad key' })).resolves.toEqual({ ok: false });
    await expect(send({ type: 'AI_SAVE_KEY', provider: 'ollama', key: KEY })).resolves.toEqual({ ok: false });
  });
});

describe('consent before any request', () => {
  it('makes zero provider requests while preparing', async () => {
    await setUp();
    const preview = await prepare();
    expect(preview).toMatchObject({
      provider: 'openai',
      destination: 'https://api.openai.com/v1/chat/completions',
      purpose: 'question'
    });
    expect(preview.text).toContain('Mitochondria produce ATP for the cell.');
    expect(preview.text).not.toContain(KEY);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends exactly the previewed text once, after Continue', async () => {
    await setUp();
    const preview = await prepare();
    fetchMock.mockResolvedValueOnce(reply(answer));
    const result = await send<AiSendResponse>({ type: 'AI_SEND', nonce: preview.nonce });
    expect(result).toEqual({
      ok: true,
      result: { kind: 'answer', text: 'Mitochondria [S1].', citations: [{ id: 'S1', page: 5 }] }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(preview.destination);
    const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
    expect(`${body.messages[0]!.content}\n\n---\n\n${body.messages[1]!.content}`).toBe(preview.text);
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(init?.credentials).toBe('omit');
    // The nonce is single use.
    await expect(send({ type: 'AI_SEND', nonce: preview.nonce })).resolves.toEqual({ ok: false, error: 'expired' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends nothing after Cancel or with an unknown nonce', async () => {
    await setUp();
    const preview = await prepare();
    await send({ type: 'AI_SEND', nonce: 'forged' });
    await send({ type: 'AI_CANCEL' });
    await expect(send({ type: 'AI_SEND', nonce: preview.nonce })).resolves.toEqual({ ok: false, error: 'expired' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('needs a provider and a key before preparing', async () => {
    await expect(send({ type: 'AI_PREPARE', task })).resolves.toEqual({ ok: false, error: 'no-provider' });
    await send({ type: 'AI_SAVE_SETTINGS', provider: 'gemini' });
    await expect(send({ type: 'AI_PREPARE', task })).resolves.toEqual({ ok: false, error: 'no-key' });
  });

  it('reports a refused provider permission without sending', async () => {
    await setUp(false);
    const preview = await prepare();
    await expect(send({ type: 'AI_SEND', nonce: preview.nonce })).resolves.toEqual({ ok: false, error: 'permission' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('assessment guard', () => {
  it('blocks preparing and sending while a quiz attempt is open', async () => {
    await setUp();
    stub.granted.add(`${A}/*`);
    await send({ type: 'ENABLE_SITE', origin: A });
    const preview = await prepare();
    stub.state.tabs = [{ id: 9, url: `${A}/mod/quiz/attempt.php?attempt=1&cmid=2` } as chrome.tabs.Tab];
    await expect(send({ type: 'AI_SEND', nonce: preview.nonce })).resolves.toEqual({ ok: false, error: 'guard' });
    await expect(send({ type: 'AI_PREPARE', task })).resolves.toEqual({ ok: false, error: 'guard' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('provider errors', () => {
  it.each([
    [() => Promise.resolve(reply({ error: {} }, 401)), 'bad-key'],
    [() => Promise.resolve(reply({ error: {} }, 429)), 'rate-limit'],
    [() => Promise.resolve(reply({ error: {} }, 503)), 'provider-down'],
    [() => Promise.reject(new TypeError('Failed to fetch')), 'provider-down'],
    [() => Promise.resolve(new Response('not json')), 'bad-response'],
    [() => Promise.resolve(reply({ choices: [{ message: { content: 'plain words' } }] })), 'bad-response']
  ])('maps a failure to a clear error (%#)', async (respond, error) => {
    await setUp();
    const preview = await prepare();
    fetchMock.mockImplementationOnce(respond as () => Promise<Response>);
    await expect(send({ type: 'AI_SEND', nonce: preview.nonce })).resolves.toEqual({ ok: false, error });
  });

  it('limits requests per minute', async () => {
    await setUp();
    fetchMock.mockImplementation(() => Promise.resolve(reply(answer)));
    const results: unknown[] = [];
    for (let i = 0; i < 7; i++) {
      const preview = await prepare();
      results.push(await send({ type: 'AI_SEND', nonce: preview.nonce }));
    }
    expect(results.at(-1)).toEqual({ ok: false, error: 'too-many' });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});

describe('clear all local data', () => {
  it('drops keys and settings', async () => {
    await setUp();
    await send({ type: 'CLEAR_LOCAL_DATA' });
    const view = await send<AiSettingsView>({ type: 'AI_SETTINGS' });
    expect(view.provider).toBeNull();
    expect(view.keys.openai).toBe(false);
  });
});
