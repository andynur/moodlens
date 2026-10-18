/**
 * Flashcard records and portable import/export (ML-019, D-009).
 * Only student-authored cards leave the extension; quiz-derived cards are filtered out of every export.
 * Imported text is untrusted: it is validated, size-limited and always becomes student-authored cards
 * without scheduling state.
 */

import { isDayKey } from './days';
import { createSrsMemory, isSrsMemory, SRS_RATINGS, type SrsMemory, type SrsRating } from './srs';

export type CardOrigin = 'student' | 'quiz-review';

export interface Deck {
  id: string;
  siteId: string;
  name: string;
  /** Moodle course id the deck belongs to, when made from a course. */
  courseId?: string;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  siteId: string;
  deckId: string;
  front: string;
  back: string;
  /** Optional link to the Moodle activity the card is about (https only). */
  sourceUrl?: string;
  /** `quiz-review` cards come from a finished quiz review page and are never exported or shared (D-009). */
  origin: CardOrigin;
  memory: SrsMemory;
  createdAt: string;
}

/** One rating, kept for review statistics and pruned by the retention setting. */
export interface ReviewLog {
  siteId: string;
  cardId: string;
  rating: SrsRating;
  /** ISO timestamp of the review. */
  reviewedAt: string;
  /** Local day of the review. */
  day: string;
  scheduledDays: number;
}

/** Portable card: what export writes and import reads. No ids, scheduling or origin. */
export interface PortableCard {
  deck: string;
  front: string;
  back: string;
  source?: string;
}

export const MAX_CARD_TEXT = 2000;
export const MAX_DECK_NAME = 100;
export const MAX_IMPORT_CARDS = 5000;
export const MAX_IMPORT_BYTES = 2_000_000;
const JSON_FORMAT = 'moodlens-cards';
const JSON_VERSION = 1;
const CSV_HEADER = ['deck', 'front', 'back', 'source'] as const;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex -- strips control characters from untrusted input
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
  return text.length > 0 && text.length <= max ? text : null;
}

function cleanSource(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Validates one portable card; returns null when any field is missing, too long or unsafe. */
export function toPortableCard(input: unknown): PortableCard | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  const deck = cleanText(value.deck, MAX_DECK_NAME);
  const front = cleanText(value.front, MAX_CARD_TEXT);
  const back = cleanText(value.back, MAX_CARD_TEXT);
  const source = cleanSource(value.source);
  if (!deck || !front || !back || source === null) return null;
  return source ? { deck, front, back, source } : { deck, front, back };
}

/** Student-authored cards only, with deck names resolved; quiz-derived cards never pass (D-009). */
export function exportableCards(cards: readonly Flashcard[], deckNames: Readonly<Record<string, string>>) {
  const portable: PortableCard[] = [];
  for (const card of cards) {
    if (card.origin !== 'student') continue;
    const result = toPortableCard({
      deck: deckNames[card.deckId],
      front: card.front,
      back: card.back,
      source: card.sourceUrl
    });
    if (result) portable.push(result);
  }
  return portable;
}

export function exportCardsJson(cards: readonly Flashcard[], deckNames: Readonly<Record<string, string>>): string {
  return JSON.stringify(
    { format: JSON_FORMAT, version: JSON_VERSION, cards: exportableCards(cards, deckNames) },
    null,
    2
  );
}

/** Spreadsheet apps run cells starting with these characters as formulas; prefix a quote to keep them text. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function exportCardsCsv(cards: readonly Flashcard[], deckNames: Readonly<Record<string, string>>): string {
  const rows = exportableCards(cards, deckNames).map((card) =>
    [card.deck, card.front, card.back, card.source ?? ''].map(csvCell).join(',')
  );
  return [CSV_HEADER.join(','), ...rows].join('\n') + '\n';
}

/** RFC 4180 CSV: quoted fields may hold commas, quotes ("") and newlines. Returns null on malformed quoting. */
export function parseCsv(text: string): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const input = text.replace(/^\uFEFF/, '');
  while (i < input.length) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (char === '"') {
        quoted = false;
        i++;
        if (i < input.length && !/[,\r\n]/.test(input[i] ?? '')) return null;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      if (field.length > 0) return null;
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
    i++;
  }
  if (quoted) return null;
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

export interface ImportResult {
  cards: PortableCard[];
  /** Rows or entries dropped because a field was missing, too long or unsafe, or past the card limit. */
  skipped: number;
  error?: 'too-large' | 'unreadable';
}

function collect(entries: readonly unknown[]): ImportResult {
  const cards: PortableCard[] = [];
  let skipped = 0;
  for (const entry of entries) {
    const card = cards.length < MAX_IMPORT_CARDS ? toPortableCard(entry) : null;
    if (card) cards.push(card);
    else skipped++;
  }
  return { cards, skipped };
}

export function importCards(text: string, format: 'json' | 'csv'): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { cards: [], skipped: 0, error: 'too-large' };
  if (format === 'json') {
    try {
      const parsed: unknown = JSON.parse(text);
      const value = parsed as { format?: unknown; cards?: unknown };
      if (!parsed || typeof parsed !== 'object' || value.format !== JSON_FORMAT || !Array.isArray(value.cards))
        return { cards: [], skipped: 0, error: 'unreadable' };
      return collect(value.cards);
    } catch {
      return { cards: [], skipped: 0, error: 'unreadable' };
    }
  }
  const rows = parseCsv(text);
  if (!rows || rows.length === 0) return { cards: [], skipped: 0, error: 'unreadable' };
  const header = (rows[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const column = (name: string) => header.indexOf(name);
  if (column('deck') < 0 || column('front') < 0 || column('back') < 0)
    return { cards: [], skipped: 0, error: 'unreadable' };
  // Undo the formula-safety quote that export adds.
  const cell = (cells: string[], name: string) => {
    const value = column(name) >= 0 ? cells[column(name)] : undefined;
    return value?.replace(/^'(?=[=+\-@\t])/, '');
  };
  return collect(
    rows.slice(1).map((cells) => ({
      deck: cell(cells, 'deck'),
      front: cell(cells, 'front'),
      back: cell(cells, 'back'),
      source: cell(cells, 'source')
    }))
  );
}

/** Builds a new student-authored card from an imported or typed card; scheduling starts fresh. */
export function newStudentCard(
  ids: { id: string; siteId: string; deckId: string },
  card: PortableCard,
  createdAt: string
): Flashcard {
  return {
    ...ids,
    front: card.front,
    back: card.back,
    ...(card.source ? { sourceUrl: card.source } : {}),
    origin: 'student',
    memory: createSrsMemory(),
    createdAt
  };
}

/**
 * Builds a private card from a mistake on a finished quiz review page (ML-020). Origin `quiz-review`
 * keeps it out of every export and backup (D-009). Returns null when the text is empty or too long.
 */
export function newQuizReviewCard(
  ids: { id: string; siteId: string; deckId: string },
  mistake: { question: string; answer: string },
  createdAt: string,
  sourceUrl?: string
): Flashcard | null {
  const front = cleanText(mistake.question, MAX_CARD_TEXT);
  const back = cleanText(mistake.answer, MAX_CARD_TEXT);
  const source = cleanSource(sourceUrl);
  if (!front || !back) return null;
  return {
    ...ids,
    front,
    back,
    ...(source ? { sourceUrl: source } : {}),
    origin: 'quiz-review',
    memory: createSrsMemory(),
    createdAt
  };
}

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;

function isId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function isIsoTime(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

/** Runtime guards for records read back from IndexedDB; a record that fails is skipped, never trusted. */
export function isDeck(input: unknown): input is Deck {
  if (!input || typeof input !== 'object') return false;
  const value = input as Record<string, unknown>;
  return (
    isId(value.id) &&
    isId(value.siteId) &&
    cleanText(value.name, MAX_DECK_NAME) === value.name &&
    (value.courseId === undefined || isId(value.courseId)) &&
    isIsoTime(value.createdAt)
  );
}

export function isFlashcard(input: unknown): input is Flashcard {
  if (!input || typeof input !== 'object') return false;
  const value = input as Record<string, unknown>;
  return (
    isId(value.id) &&
    isId(value.siteId) &&
    isId(value.deckId) &&
    cleanText(value.front, MAX_CARD_TEXT) === value.front &&
    cleanText(value.back, MAX_CARD_TEXT) === value.back &&
    (value.sourceUrl === undefined || cleanSource(value.sourceUrl) === value.sourceUrl) &&
    (value.origin === 'student' || value.origin === 'quiz-review') &&
    isSrsMemory(value.memory) &&
    isIsoTime(value.createdAt)
  );
}

export function isReviewLog(input: unknown): input is ReviewLog {
  if (!input || typeof input !== 'object') return false;
  const value = input as Record<string, unknown>;
  return (
    isId(value.siteId) &&
    isId(value.cardId) &&
    SRS_RATINGS.includes(value.rating as SrsRating) &&
    // Exact `toISOString()` form, so the time index sorts logs chronologically.
    isIsoTime(value.reviewedAt) &&
    new Date(value.reviewedAt).toISOString() === value.reviewedAt &&
    isDayKey(value.day) &&
    Number.isInteger(value.scheduledDays) &&
    (value.scheduledDays as number) >= 0
  );
}

/** Per-site caps for the IndexedDB study store; writes past a cap are refused, old logs are pruned. */
export const STUDY_LIMITS = { decksPerSite: 200, cardsPerSite: 10_000, reviewLogsPerSite: 50_000 } as const;

/** Review-log retention choices in days; ratings older than this are deleted. Cards are kept until deleted. */
export const REVIEW_LOG_RETENTION_DAYS = [90, 365, 730] as const;
export type ReviewLogRetention = (typeof REVIEW_LOG_RETENTION_DAYS)[number];
export const DEFAULT_REVIEW_LOG_RETENTION: ReviewLogRetention = 365;

/** Storage key of the student's review-log retention choice (D-014). */
export const STUDY_RETENTION_KEY = 'studyRetention';

export function isReviewLogRetention(input: unknown): input is ReviewLogRetention {
  return REVIEW_LOG_RETENTION_DAYS.includes(input as ReviewLogRetention);
}

export function normalizeRetention(input: unknown): ReviewLogRetention {
  return isReviewLogRetention(input) ? input : DEFAULT_REVIEW_LOG_RETENTION;
}

/** ISO timestamp before which review logs are pruned. */
export function reviewLogCutoff(at: Date, retentionDays: ReviewLogRetention): string {
  return new Date(at.getTime() - retentionDays * 86_400_000).toISOString();
}
