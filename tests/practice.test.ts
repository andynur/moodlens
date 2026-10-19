import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeStub } from './chrome-stub';

// IndexedDB is absent here, so these tests cover which offers are accepted and which saves are
// refused before the store is opened. The saving path itself is exercised in Chrome.

const A = 'https://moodle-a.example.edu';
const REVIEW = `${A}/mod/quiz/review.php?attempt=4&cmid=9`;
const stub = createChromeStub();
const page: chrome.runtime.MessageSender = { id: 'moodlens-test' };

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
function fromTab(url: string, id = 11): chrome.runtime.MessageSender {
  return { id: 'moodlens-test', tab: { id } as chrome.tabs.Tab, url, origin: new URL(url).origin };
}
const offerFrom = (url: string, count: unknown, tabId = 11) =>
  stub.send({ type: 'PRACTICE_OFFER', count }, fromTab(url, tabId));
const overview = () => stub.send({ type: 'STUDY_OVERVIEW' }, page) as Promise<{ offer: unknown }>;

describe('practice offer (ML-020)', () => {
  it('accepts an offer from a review page of a registered site', async () => {
    const siteId = await enable(A);
    stub.state.tabs = [{ id: 11, url: REVIEW } as chrome.tabs.Tab];
    await expect(offerFrom(REVIEW, 3)).resolves.toEqual({ ok: true });
    await expect(overview()).resolves.toMatchObject({ offer: { siteId, count: 3 } });
  });

  it('refuses offers from other pages, other sites and empty counts', async () => {
    await enable(A);
    await expect(offerFrom(`${A}/mod/quiz/attempt.php?attempt=4`, 3)).resolves.toEqual({ ok: false });
    await expect(offerFrom(`${A}/my/`, 3)).resolves.toEqual({ ok: false });
    await expect(offerFrom(REVIEW, 0)).resolves.toEqual({ ok: false });
    await expect(offerFrom(REVIEW, 'many')).resolves.toEqual({ ok: false });
    await expect(offerFrom('https://other.example/mod/quiz/review.php', 3)).resolves.toEqual({ ok: false });
    // An extension page is not a review page, so it cannot offer either.
    await expect(stub.send({ type: 'PRACTICE_OFFER', count: 3 }, page)).resolves.toEqual({ ok: false });
  });

  it('caps the reported count at the capture maximum', async () => {
    await enable(A);
    stub.state.tabs = [{ id: 11, url: REVIEW } as chrome.tabs.Tab];
    await offerFrom(REVIEW, 5000);
    await expect(overview()).resolves.toMatchObject({ offer: { count: 200 } });
  });

  it('drops the offer once the page is closed or navigated away', async () => {
    await enable(A);
    stub.state.tabs = [{ id: 11, url: REVIEW } as chrome.tabs.Tab];
    await offerFrom(REVIEW, 3);
    stub.state.tabs = [{ id: 11, url: `${A}/my/` } as chrome.tabs.Tab];
    await expect(overview()).resolves.toMatchObject({ offer: null });
    // Forgotten for good: putting the tab back does not bring the offer back.
    stub.state.tabs = [{ id: 11, url: REVIEW } as chrome.tabs.Tab];
    await expect(overview()).resolves.toMatchObject({ offer: null });
  });

  it('refuses a save without an offer, without a deck id, or from a content script', async () => {
    await enable(A);
    await expect(stub.send({ type: 'STUDY_SAVE_MISTAKES', deckId: 'deck-1' }, page)).resolves.toEqual({ ok: false });
    stub.state.tabs = [{ id: 11, url: REVIEW } as chrome.tabs.Tab];
    await offerFrom(REVIEW, 3);
    await expect(stub.send({ type: 'STUDY_SAVE_MISTAKES', deckId: 42 }, page)).resolves.toEqual({ ok: false });
    await expect(stub.send({ type: 'STUDY_SAVE_MISTAKES', deckId: 'deck-1' }, fromTab(REVIEW))).resolves.toEqual({
      ok: false
    });
  });

  it('binds captured mistakes to the offered URL and enforces text bounds at the message boundary', async () => {
    await enable(A);
    stub.state.tabs = [{ id: 11, url: REVIEW } as chrome.tabs.Tab];
    await offerFrom(REVIEW, 1);
    stub.state.tabListening = true;

    stub.tabMessages.mockResolvedValueOnce({
      ok: true,
      url: `${A}/mod/quiz/review.php?attempt=5&cmid=9`,
      mistakes: [{ question: 'Question', answer: 'Answer' }]
    });
    await expect(stub.send({ type: 'STUDY_SAVE_MISTAKES', deckId: 'deck-1' }, page)).resolves.toEqual({ ok: false });

    stub.tabMessages.mockResolvedValueOnce({
      ok: true,
      url: REVIEW,
      mistakes: [{ question: 'Q'.repeat(2001), answer: 'Answer' }]
    });
    await expect(stub.send({ type: 'STUDY_SAVE_MISTAKES', deckId: 'deck-1' }, page)).resolves.toEqual({ ok: false });
  });

  it('forgets the offer when all local data is cleared', async () => {
    await enable(A);
    stub.state.tabs = [{ id: 11, url: REVIEW } as chrome.tabs.Tab];
    await offerFrom(REVIEW, 3);
    await stub.send({ type: 'CLEAR_LOCAL_DATA' }, page);
    await expect(overview()).resolves.toMatchObject({ offer: null });
  });
});
