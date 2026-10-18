/**
 * IndexedDB study store (v0.6, D-014): decks, flashcards and review logs.
 * One database with a `siteId` field and index on every record, so site removal deletes by index
 * instead of dropping per-site databases. Records read back are validated; invalid ones are skipped.
 *
 * Status: unverified in Chrome and not covered by unit tests (jsdom has no IndexedDB and the repo has
 * no IndexedDB test dependency). Record validation and retention rules are tested in tests/cards.test.ts.
 */

import {
  isDeck,
  isFlashcard,
  isReviewLog,
  reviewLogCutoff,
  STUDY_LIMITS,
  type Deck,
  type Flashcard,
  type ReviewLog,
  type ReviewLogRetention
} from '../shared/cards';

export const STUDY_DB_NAME = 'moodlens-study';
export const STUDY_DB_VERSION = 1;
const DECKS = 'decks';
const CARDS = 'cards';
const LOGS = 'reviewLogs';
type StoreName = typeof DECKS | typeof CARDS | typeof LOGS;

function promised<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/** Schema v1. Later versions add `if (event.oldVersion < n)` steps; never edit a shipped step. */
function upgrade(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    db.createObjectStore(DECKS, { keyPath: 'id' }).createIndex('bySite', 'siteId');
    const cards = db.createObjectStore(CARDS, { keyPath: 'id' });
    cards.createIndex('bySite', 'siteId');
    cards.createIndex('byDeck', 'deckId');
    const logs = db.createObjectStore(LOGS, { autoIncrement: true });
    logs.createIndex('bySite', 'siteId');
    logs.createIndex('bySiteTime', ['siteId', 'reviewedAt']);
    logs.createIndex('byCard', 'cardId');
  }
}

export function openStudyDb(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(STUDY_DB_NAME, STUDY_DB_VERSION);
    request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked'));
  });
}

async function countForSite(db: IDBDatabase, store: StoreName, siteId: string): Promise<number> {
  return promised(db.transaction(store).objectStore(store).index('bySite').count(siteId));
}

async function listForSite<T>(
  db: IDBDatabase,
  store: StoreName,
  siteId: string,
  valid: (input: unknown) => input is T
): Promise<T[]> {
  const rows = await promised(db.transaction(store).objectStore(store).index('bySite').getAll(siteId));
  return rows.filter(valid);
}

export function listDecks(db: IDBDatabase, siteId: string): Promise<Deck[]> {
  return listForSite(db, DECKS, siteId, isDeck);
}

export function listCards(db: IDBDatabase, siteId: string): Promise<Flashcard[]> {
  return listForSite(db, CARDS, siteId, isFlashcard);
}

/** Adds or replaces a deck. Refuses invalid records and new decks past the per-site cap. */
export async function putDeck(db: IDBDatabase, deck: Deck): Promise<boolean> {
  if (!isDeck(deck)) return false;
  const existing = await promised(db.transaction(DECKS).objectStore(DECKS).getKey(deck.id));
  if (existing === undefined && (await countForSite(db, DECKS, deck.siteId)) >= STUDY_LIMITS.decksPerSite) return false;
  const transaction = db.transaction(DECKS, 'readwrite');
  transaction.objectStore(DECKS).put(deck);
  await finished(transaction);
  return true;
}

/** Adds or replaces cards in one transaction. All cards must be valid and fit under the per-site cap. */
export async function putCards(db: IDBDatabase, siteId: string, cards: readonly Flashcard[]): Promise<boolean> {
  if (!cards.every((card) => isFlashcard(card) && card.siteId === siteId)) return false;
  if ((await countForSite(db, CARDS, siteId)) + cards.length > STUDY_LIMITS.cardsPerSite) {
    const keys = await promised(db.transaction(CARDS).objectStore(CARDS).index('bySite').getAllKeys(siteId));
    const known = new Set(keys);
    const added = cards.filter((card) => !known.has(card.id)).length;
    if (keys.length + added > STUDY_LIMITS.cardsPerSite) return false;
  }
  const transaction = db.transaction(CARDS, 'readwrite');
  const store = transaction.objectStore(CARDS);
  for (const card of cards) store.put(card);
  await finished(transaction);
  return true;
}

/** Saves the card's new scheduling state and its review log together. */
export async function recordReview(db: IDBDatabase, card: Flashcard, log: ReviewLog): Promise<boolean> {
  if (!isFlashcard(card) || !isReviewLog(log) || log.cardId !== card.id || log.siteId !== card.siteId) return false;
  const transaction = db.transaction([CARDS, LOGS], 'readwrite');
  transaction.objectStore(CARDS).put(card);
  transaction.objectStore(LOGS).add(log);
  await finished(transaction);
  return true;
}

function deleteByIndex(store: IDBObjectStore, index: string, query: IDBValidKey | IDBKeyRange): void {
  const request = store.index(index).openKeyCursor(query);
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    store.delete(cursor.primaryKey);
    cursor.continue();
  };
}

/** Deletes a deck, its cards and their review logs. */
export async function deleteDeck(db: IDBDatabase, deckId: string): Promise<void> {
  const cardIds = await promised(db.transaction(CARDS).objectStore(CARDS).index('byDeck').getAllKeys(deckId));
  const transaction = db.transaction([DECKS, CARDS, LOGS], 'readwrite');
  transaction.objectStore(DECKS).delete(deckId);
  deleteByIndex(transaction.objectStore(CARDS), 'byDeck', deckId);
  const logs = transaction.objectStore(LOGS);
  for (const cardId of cardIds) deleteByIndex(logs, 'byCard', cardId);
  await finished(transaction);
}

/** Deletes every study record of a site (site removal and clear-all). */
export async function deleteSiteStudyData(db: IDBDatabase, siteId: string): Promise<void> {
  const transaction = db.transaction([DECKS, CARDS, LOGS], 'readwrite');
  for (const store of [DECKS, CARDS, LOGS] as const) deleteByIndex(transaction.objectStore(store), 'bySite', siteId);
  await finished(transaction);
}

/** Deletes review logs older than the retention window, then the oldest logs past the per-site cap. */
export async function pruneReviewLogs(
  db: IDBDatabase,
  siteId: string,
  at: Date,
  retentionDays: ReviewLogRetention
): Promise<void> {
  const cutoff = reviewLogCutoff(at, retentionDays);
  const transaction = db.transaction(LOGS, 'readwrite');
  const store = transaction.objectStore(LOGS);
  deleteByIndex(store, 'bySiteTime', IDBKeyRange.bound([siteId, ''], [siteId, cutoff], false, true));
  await finished(transaction);

  const keys = await promised(
    db
      .transaction(LOGS)
      .objectStore(LOGS)
      .index('bySiteTime')
      .getAllKeys(IDBKeyRange.bound([siteId, ''], [siteId, '￿']))
  );
  const excess = keys.length - STUDY_LIMITS.reviewLogsPerSite;
  if (excess <= 0) return;
  const trim = db.transaction(LOGS, 'readwrite');
  for (const key of keys.slice(0, excess)) trim.objectStore(LOGS).delete(key);
  await finished(trim);
}

/** Removes one site's study data (site removal). No-op where IndexedDB is missing, as in unit tests. */
export async function removeSiteStudyData(
  siteId: string,
  factory: IDBFactory | undefined = globalThis.indexedDB
): Promise<void> {
  if (!factory) return;
  const db = await openStudyDb(factory);
  try {
    await deleteSiteStudyData(db, siteId);
  } finally {
    db.close();
  }
}

/** Deletes the whole study database ("Clear all local data"). No-op where IndexedDB is missing. */
export function deleteStudyDb(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<void> {
  if (!factory) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const request = factory.deleteDatabase(STUDY_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('IndexedDB delete failed'));
  });
}
