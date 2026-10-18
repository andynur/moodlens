/**
 * Study service (ML-019): the side panel's only way to the IndexedDB study store. The background owns
 * storage, so every deck, card and review passes through here, where ids, text and ratings are
 * validated before anything is written.
 *
 * Quiz-derived cards (D-009) are reviewed like any other card but never exported.
 */
import {
  exportCardsCsv,
  exportCardsJson,
  exportableCards,
  isDeck,
  MAX_DECK_NAME,
  newStudentCard,
  toPortableCard,
  type Deck,
  type Flashcard,
  type PortableCard,
  type ReviewLog
} from '../shared/cards';
import { dayKey } from '../shared/days';
import { isDue, previewIntervals, reviewCard, reviewQueue, SRS_RATINGS, type SrsRating } from '../shared/srs';
import type {
  OkResponse,
  StudyCardView,
  StudyDeckView,
  StudyExportResponse,
  StudyOverviewResponse
} from '../shared/types';
import { loadSites } from './sites';
import { deleteDeck, getCard, listCards, listDecks, openStudyDb, putCards, putDeck, recordReview } from './studyStore';

/** New cards offered per site per day; the rest waits so a big import cannot flood one day. */
const NEW_CARDS_PER_DAY = 20;
const MAX_CARDS_PER_CALL = 500;

const EMPTY_OVERVIEW: StudyOverviewResponse = { ok: false, decks: [], queue: [], later: 0 };

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function withDb<T>(
  factory: IDBFactory | undefined,
  fallback: T,
  run: (db: IDBDatabase) => Promise<T>
): Promise<T> {
  if (!factory) return fallback;
  const db = await openStudyDb(factory);
  try {
    return await run(db);
  } finally {
    db.close();
  }
}

function cardView(card: Flashcard, at: Date, zone: string): StudyCardView {
  return {
    id: card.id,
    siteId: card.siteId,
    deckId: card.deckId,
    front: card.front,
    back: card.back,
    ...(card.sourceUrl ? { sourceUrl: card.sourceUrl } : {}),
    origin: card.origin,
    intervals: previewIntervals(card.memory, at, zone)
  };
}

/** Decks with their card and due counts, plus today's review queue across every registered site. */
export async function studyOverview(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  at = new Date(),
  zone = timeZone()
): Promise<StudyOverviewResponse> {
  const sites = await loadSites();
  if (sites.length === 0) return { ...EMPTY_OVERVIEW, ok: true };
  return withDb(factory, { ...EMPTY_OVERVIEW, ok: true }, async (db) => {
    const decks: StudyDeckView[] = [];
    const queue: StudyCardView[] = [];
    let later = 0;
    for (const site of sites) {
      const cards = await listCards(db, site.id);
      const dueQueue = reviewQueue(cards, at, zone, NEW_CARDS_PER_DAY);
      const dueIds = new Set(dueQueue.map((card) => card.id));
      later += cards.filter((card) => !dueIds.has(card.id)).length;
      for (const card of dueQueue) queue.push(cardView(card, at, zone));
      for (const deck of await listDecks(db, site.id)) {
        const deckCards = cards.filter((card) => card.deckId === deck.id);
        decks.push({
          id: deck.id,
          siteId: deck.siteId,
          name: deck.name,
          ...(deck.courseId ? { courseId: deck.courseId } : {}),
          cards: deckCards.length,
          due: deckCards.filter((card) => dueIds.has(card.id)).length
        });
      }
    }
    decks.sort((a, b) => a.name.localeCompare(b.name));
    return { ok: true, decks, queue, later };
  });
}

async function siteOf(siteId: unknown) {
  return typeof siteId === 'string' ? ((await loadSites()).find((site) => site.id === siteId) ?? null) : null;
}

function newId(): string {
  return crypto.randomUUID();
}

export async function createDeck(
  input: { siteId: unknown; name: unknown; courseId?: unknown },
  factory: IDBFactory | undefined = globalThis.indexedDB,
  at = new Date()
): Promise<OkResponse & { deckId?: string }> {
  const site = await siteOf(input.siteId);
  const name = typeof input.name === 'string' ? input.name.replace(/\s+/g, ' ').trim().slice(0, MAX_DECK_NAME) : '';
  if (!site || !name) return { ok: false };
  const deck: Deck = {
    id: newId(),
    siteId: site.id,
    name,
    ...(typeof input.courseId === 'string' ? { courseId: input.courseId } : {}),
    createdAt: at.toISOString()
  };
  if (!isDeck(deck)) return { ok: false };
  const ok = await withDb(factory, false, (db) => putDeck(db, deck));
  return ok ? { ok: true, deckId: deck.id } : { ok: false };
}

export async function removeDeck(
  deckId: unknown,
  factory: IDBFactory | undefined = globalThis.indexedDB
): Promise<OkResponse> {
  if (typeof deckId !== 'string' || deckId === '') return { ok: false };
  await withDb(factory, undefined, (db) => deleteDeck(db, deckId));
  return { ok: true };
}

/** Adds student-authored cards to a deck: one typed card, or many from an import. */
export async function addCards(
  input: { siteId: unknown; deckId: unknown; cards: unknown },
  factory: IDBFactory | undefined = globalThis.indexedDB,
  at = new Date()
): Promise<OkResponse & { added?: number }> {
  const site = await siteOf(input.siteId);
  if (!site || typeof input.deckId !== 'string' || !Array.isArray(input.cards)) return { ok: false };
  const portable = input.cards
    .slice(0, MAX_CARDS_PER_CALL)
    .map(toPortableCard)
    .filter((card): card is PortableCard => card !== null);
  if (portable.length === 0) return { ok: false };
  const result = await withDb(factory, false, async (db) => {
    const decks = await listDecks(db, site.id);
    if (!decks.some((deck) => deck.id === input.deckId)) return false;
    const cards = portable.map((card) =>
      newStudentCard({ id: newId(), siteId: site.id, deckId: input.deckId as string }, card, at.toISOString())
    );
    return putCards(db, site.id, cards);
  });
  return result ? { ok: true, added: portable.length } : { ok: false };
}

export async function reviewFlashcard(
  input: { cardId: unknown; rating: unknown },
  factory: IDBFactory | undefined = globalThis.indexedDB,
  at = new Date(),
  zone = timeZone()
): Promise<OkResponse & { dueDay?: string | null }> {
  if (typeof input.cardId !== 'string' || !SRS_RATINGS.includes(input.rating as SrsRating)) return { ok: false };
  const rating = input.rating as SrsRating;
  return withDb<OkResponse & { dueDay?: string | null }>(factory, { ok: false }, async (db) => {
    const card = await getCard(db, input.cardId as string);
    // A card the queue no longer holds, or one already reviewed today, is not rated again.
    if (!card || !isDue(card.memory, at, zone)) return { ok: false };
    const memory = reviewCard(card.memory, rating, at, zone);
    const log: ReviewLog = {
      siteId: card.siteId,
      cardId: card.id,
      rating,
      reviewedAt: at.toISOString(),
      day: dayKey(at, zone),
      scheduledDays: memory.scheduledDays
    };
    const ok = await recordReview(db, { ...card, memory }, log);
    return ok ? { ok: true, dueDay: memory.dueDay } : { ok: false };
  });
}

/** Export of student-authored cards only (D-009): quiz-derived cards never leave the device. */
export async function exportCards(
  format: unknown,
  factory: IDBFactory | undefined = globalThis.indexedDB
): Promise<StudyExportResponse> {
  if (format !== 'json' && format !== 'csv') return { ok: false, text: '', cards: 0 };
  const sites = await loadSites();
  return withDb<StudyExportResponse>(factory, { ok: false, text: '', cards: 0 }, async (db) => {
    const cards: Flashcard[] = [];
    const deckNames: Record<string, string> = {};
    for (const site of sites) {
      cards.push(...(await listCards(db, site.id)));
      for (const deck of await listDecks(db, site.id)) deckNames[deck.id] = deck.name;
    }
    const text = format === 'json' ? exportCardsJson(cards, deckNames) : exportCardsCsv(cards, deckNames);
    return { ok: true, text, cards: exportableCards(cards, deckNames).length };
  });
}
