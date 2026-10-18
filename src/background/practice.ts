/**
 * Practice from closed quiz reviews (ML-020, D-009). The review page's content script offers a count
 * of wrong questions; the question text itself is never stored here. It is read from the page only
 * when the student presses Save, and it goes straight into private `quiz-review` cards that no export
 * or backup includes.
 */
import { MAX_REVIEW_QUESTIONS, type ReviewMistake } from '../content/moodle/quiz-review';
import { newQuizReviewCard, type Flashcard } from '../shared/cards';
import type { OkResponse, PracticeOffer } from '../shared/types';
import { loadSites } from './sites';
import { listDecks, openStudyDb, putCards } from './studyStore';

const OFFER_KEY = 'practice:offer';
/** The offer is dropped when the tab is gone, the page changed or the browser session ended. */
const OFFER_TTL_MS = 6 * 60 * 60 * 1000;
const REVIEW_PATH = /\/mod\/quiz\/review\.php$/;

interface StoredOffer extends PracticeOffer {
  tabId: number;
  url: string;
  at: number;
}

function isStoredOffer(value: unknown): value is StoredOffer {
  if (!value || typeof value !== 'object') return false;
  const offer = value as Partial<StoredOffer>;
  return (
    typeof offer.tabId === 'number' &&
    typeof offer.url === 'string' &&
    typeof offer.siteId === 'string' &&
    typeof offer.count === 'number' &&
    typeof offer.at === 'number'
  );
}

async function loadOffer(): Promise<StoredOffer | null> {
  const stored: unknown = (await chrome.storage.session.get(OFFER_KEY))[OFFER_KEY];
  if (!isStoredOffer(stored) || Date.now() - stored.at > OFFER_TTL_MS) return null;
  return stored;
}

/** Stores that a finished review page holds mistakes. Only a registered site's review page may offer. */
export async function recordPracticeOffer(
  input: { count: unknown },
  sender: chrome.runtime.MessageSender
): Promise<OkResponse> {
  const tabId = sender.tab?.id;
  if (tabId === undefined || !sender.url) return { ok: false };
  const url = new URL(sender.url);
  const site = (await loadSites()).find((item) => item.origin === (sender.origin ?? url.origin));
  const count = typeof input.count === 'number' ? Math.floor(input.count) : 0;
  if (!site || !REVIEW_PATH.test(url.pathname) || count < 1) return { ok: false };
  const offer: StoredOffer = {
    tabId,
    url: sender.url,
    siteId: site.id,
    count: Math.min(count, MAX_REVIEW_QUESTIONS),
    at: Date.now()
  };
  await chrome.storage.session.set({ [OFFER_KEY]: offer });
  return { ok: true };
}

/** The current offer for the panel, or null when the page it came from is no longer open. */
export async function practiceOffer(): Promise<PracticeOffer | null> {
  const offer = await loadOffer();
  if (!offer) return null;
  const site = (await loadSites()).find((item) => item.id === offer.siteId);
  if (!site) return null;
  const tabs = await chrome.tabs.query({ url: `${site.origin}/*` }).catch(() => []);
  if (!tabs.some((tab) => tab.id === offer.tabId && tab.url === offer.url)) {
    await chrome.storage.session.remove(OFFER_KEY);
    return null;
  }
  return { siteId: offer.siteId, count: offer.count };
}

function isMistakeList(value: unknown): value is ReviewMistake[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_REVIEW_QUESTIONS &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as ReviewMistake).question === 'string' &&
        typeof (item as ReviewMistake).answer === 'string'
    )
  );
}

/**
 * Saves the mistakes of the offered review page into one deck. The page is asked for them at this
 * moment, so a page that navigated away or locked again saves nothing.
 */
export async function saveQuizMistakes(
  input: { deckId: unknown },
  factory: IDBFactory | undefined = globalThis.indexedDB,
  at = new Date()
): Promise<OkResponse & { saved?: number }> {
  const offer = await loadOffer();
  if (!offer || typeof input.deckId !== 'string' || !factory) return { ok: false };
  const site = (await loadSites()).find((item) => item.id === offer.siteId);
  if (!site) return { ok: false };
  const answer = (await chrome.tabs.sendMessage(offer.tabId, { type: 'CAPTURE_QUIZ_MISTAKES' }).catch(() => null)) as {
    ok?: boolean;
    mistakes?: unknown;
    cmid?: unknown;
  } | null;
  if (!answer?.ok || !isMistakeList(answer.mistakes) || answer.mistakes.length === 0) return { ok: false };
  // Only the course module id may be kept; an attempt id never becomes part of a card (ML-020).
  const cmid = typeof answer.cmid === 'string' && /^\d{1,12}$/.test(answer.cmid) ? answer.cmid : null;
  const sourceUrl = cmid ? `${site.origin}/mod/quiz/view.php?id=${cmid}` : undefined;

  const db = await openStudyDb(factory);
  try {
    const decks = await listDecks(db, site.id);
    if (!decks.some((deck) => deck.id === input.deckId)) return { ok: false };
    const cards = answer.mistakes
      .map((mistake) =>
        newQuizReviewCard(
          { id: crypto.randomUUID(), siteId: site.id, deckId: input.deckId as string },
          mistake,
          at.toISOString(),
          sourceUrl
        )
      )
      .filter((card): card is Flashcard => card !== null);
    if (cards.length === 0) return { ok: false };
    const ok = await putCards(db, site.id, cards);
    return ok ? { ok: true, saved: cards.length } : { ok: false };
  } finally {
    db.close();
  }
}

/** Drops the offer, for site removal and "Clear all local data". */
export async function clearPracticeOffer(): Promise<void> {
  await chrome.storage.session.remove(OFFER_KEY);
}
