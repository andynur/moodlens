import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeStub } from './chrome-stub';

// IndexedDB is absent in this environment, so these tests cover the validation and trust decisions the
// study service makes before it opens the store. The store paths themselves are exercised in Chrome
// (see docs/09_TEST_PLAN.md) because the project adds no IndexedDB test double.

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

async function enable(origin: string) {
  stub.granted.add(`${origin}/*`);
  const response = (await stub.send({ type: 'ENABLE_SITE', origin }, page)) as { site: { id: string } | null };
  return response.site!.id;
}

describe('study service (ML-019)', () => {
  it('answers an overview with no decks before any site is enabled', async () => {
    await expect(stub.send({ type: 'STUDY_OVERVIEW' }, page)).resolves.toEqual({
      ok: true,
      decks: [],
      queue: [],
      later: 0,
      offer: null
    });
  });

  it('refuses every study message from a content script', async () => {
    const siteId = await enable(A);
    for (const message of [
      { type: 'STUDY_OVERVIEW' },
      { type: 'STUDY_CREATE_DECK', siteId, name: 'Deck' },
      { type: 'STUDY_DELETE_DECK', deckId: 'deck-1' },
      { type: 'STUDY_ADD_CARDS', siteId, deckId: 'deck-1', cards: [{ deck: 'd', front: 'f', back: 'b' }] },
      { type: 'STUDY_REVIEW', cardId: 'card-1', rating: 'good' },
      { type: 'STUDY_EXPORT_CARDS', format: 'json' }
    ]) {
      await expect(stub.send(message, content)).resolves.toEqual({ ok: false });
    }
  });

  it('refuses a deck for a site that is not registered, or without a name', async () => {
    const siteId = await enable(A);
    await expect(
      stub.send({ type: 'STUDY_CREATE_DECK', siteId: 'other.example', name: 'Deck' }, page)
    ).resolves.toEqual({ ok: false });
    await expect(stub.send({ type: 'STUDY_CREATE_DECK', siteId, name: '   ' }, page)).resolves.toEqual({ ok: false });
    await expect(stub.send({ type: 'STUDY_CREATE_DECK', siteId, name: 42 }, page)).resolves.toEqual({ ok: false });
  });

  it('refuses cards without a site, a deck or usable card data', async () => {
    const siteId = await enable(A);
    for (const cards of [[], 'text', [{ front: 'only front' }], [{ deck: 'd', front: '', back: '' }]]) {
      await expect(stub.send({ type: 'STUDY_ADD_CARDS', siteId, deckId: 'deck-1', cards }, page)).resolves.toEqual({
        ok: false
      });
    }
    await expect(
      stub.send(
        { type: 'STUDY_ADD_CARDS', siteId: 'other', deckId: 'deck-1', cards: [{ front: 'a', back: 'b' }] },
        page
      )
    ).resolves.toEqual({ ok: false });
  });

  it('refuses a review without a known rating', async () => {
    await enable(A);
    for (const rating of ['perfect', '', 1, null]) {
      await expect(stub.send({ type: 'STUDY_REVIEW', cardId: 'card-1', rating }, page)).resolves.toEqual({ ok: false });
    }
  });

  it('refuses an export format it does not write', async () => {
    await enable(A);
    for (const format of ['xml', 'anki', '', undefined]) {
      await expect(stub.send({ type: 'STUDY_EXPORT_CARDS', format }, page)).resolves.toEqual({
        ok: false,
        text: '',
        cards: 0
      });
    }
  });
});
