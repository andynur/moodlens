/**
 * Spaced repetition scheduler (ML-019): FSRS-5 with default weights, day-based ("long-term") scheduling,
 * no learning steps and no interval fuzz. Results match ts-fsrs 4.7.1 with
 * `{ enable_short_term: false, enable_fuzz: false }` (reference values in tests/srs.test.ts).
 * Pure logic: no storage, no clock reads. Days follow the student's IANA time zone.
 */

import { addDays, dayKey, dayNumber, isDayKey } from './days';

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
export const SRS_RATINGS: readonly SrsRating[] = ['again', 'hard', 'good', 'easy'];

export interface SrsMemory {
  /** `new` until the first review; every reviewed card is `review` in day-based scheduling. */
  state: 'new' | 'review';
  /** Days until recall probability drops to 90%; 0 for a new card. */
  stability: number;
  /** 1 (easy) to 10 (hard); 0 for a new card. */
  difficulty: number;
  /** Local day the card is due; null for a new card (due as soon as it enters the queue). */
  dueDay: string | null;
  lastReviewDay: string | null;
  scheduledDays: number;
  reps: number;
  lapses: number;
}

export interface SrsSettings {
  /** Target recall probability at the due day, 0.7 to 0.97. */
  requestRetention: number;
  maximumInterval: number;
}

export const DEFAULT_SRS_SETTINGS: SrsSettings = { requestRetention: 0.9, maximumInterval: 36_500 };
export const MIN_RETENTION = 0.7;
export const MAX_RETENTION = 0.97;

/** FSRS-5 default weights (ts-fsrs 4.7.1 `default_w`). */
const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605,
  2.2698, 0.2315, 2.9898, 0.51655, 0.6621
] as const;
const DECAY = -0.5;
const FACTOR = 19 / 81;
const S_MIN = 0.01;
const S_MAX = 36_500;

/** The reference rounds intermediate values to 8 decimals; doing the same keeps intervals identical. */
function round8(value: number): number {
  return +value.toFixed(8);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function constrainDifficulty(value: number): number {
  return clamp(round8(value), 1, 10);
}

function initDifficulty(grade: number): number {
  return constrainDifficulty(W[4] - Math.exp((grade - 1) * W[5]) + 1);
}

function initStability(grade: 1 | 2 | 3 | 4): number {
  return Math.max(W[grade - 1] ?? 0, 0.1);
}

function nextDifficulty(difficulty: number, grade: number): number {
  const delta = -W[6] * (grade - 3);
  const damped = difficulty + round8((delta * (10 - difficulty)) / 9);
  return constrainDifficulty(round8(W[7] * initDifficulty(4) + (1 - W[7]) * damped));
}

/** Probability of recall after `elapsedDays` for a card with `stability`. */
export function retrievability(elapsedDays: number, stability: number): number {
  return round8(Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY));
}

function recallStability(difficulty: number, stability: number, recall: number, grade: number): number {
  const hardPenalty = grade === 2 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) *
    (11 - difficulty) *
    Math.pow(stability, -W[9]) *
    (Math.exp((1 - recall) * W[10]) - 1) *
    hardPenalty *
    easyBonus;
  return round8(clamp(stability * (1 + growth), S_MIN, S_MAX));
}

function forgetStability(difficulty: number, stability: number, recall: number): number {
  const value =
    W[11] * Math.pow(difficulty, -W[12]) * (Math.pow(stability + 1, W[13]) - 1) * Math.exp((1 - recall) * W[14]);
  return round8(clamp(value, S_MIN, S_MAX));
}

export function normalizeSettings(settings: Partial<SrsSettings> = {}): SrsSettings {
  const retention = Number(settings.requestRetention);
  const maximum = Number(settings.maximumInterval);
  return {
    requestRetention: Number.isFinite(retention)
      ? clamp(retention, MIN_RETENTION, MAX_RETENTION)
      : DEFAULT_SRS_SETTINGS.requestRetention,
    maximumInterval: Number.isFinite(maximum)
      ? clamp(Math.round(maximum), 1, S_MAX)
      : DEFAULT_SRS_SETTINGS.maximumInterval
  };
}

function nextInterval(stability: number, settings: SrsSettings): number {
  const modifier = round8((Math.pow(settings.requestRetention, 1 / DECAY) - 1) / FACTOR);
  return Math.min(Math.max(1, Math.round(stability * modifier)), settings.maximumInterval);
}

export function createSrsMemory(): SrsMemory {
  return {
    state: 'new',
    stability: 0,
    difficulty: 0,
    dueDay: null,
    lastReviewDay: null,
    scheduledDays: 0,
    reps: 0,
    lapses: 0
  };
}

type Outcome = { stability: number; difficulty: number; interval: number };

/** Outcomes for all four ratings; intervals are forced into again ≤ hard < good < easy order. */
function outcomes(memory: SrsMemory, elapsedDays: number, settings: SrsSettings): Record<SrsRating, Outcome> {
  let next: Record<SrsRating, { stability: number; difficulty: number }>;
  if (memory.state === 'new') {
    next = {
      again: { stability: initStability(1), difficulty: initDifficulty(1) },
      hard: { stability: initStability(2), difficulty: initDifficulty(2) },
      good: { stability: initStability(3), difficulty: initDifficulty(3) },
      easy: { stability: initStability(4), difficulty: initDifficulty(4) }
    };
  } else {
    const { stability: s, difficulty: d } = memory;
    const recall = retrievability(elapsedDays, s);
    next = {
      again: { stability: clamp(s, S_MIN, forgetStability(d, s, recall)), difficulty: nextDifficulty(d, 1) },
      hard: { stability: recallStability(d, s, recall, 2), difficulty: nextDifficulty(d, 2) },
      good: { stability: recallStability(d, s, recall, 3), difficulty: nextDifficulty(d, 3) },
      easy: { stability: recallStability(d, s, recall, 4), difficulty: nextDifficulty(d, 4) }
    };
  }
  let again = nextInterval(next.again.stability, settings);
  let hard = nextInterval(next.hard.stability, settings);
  let good = nextInterval(next.good.stability, settings);
  let easy = nextInterval(next.easy.stability, settings);
  again = Math.min(again, hard);
  hard = Math.max(hard, again + 1);
  good = Math.max(good, hard + 1);
  easy = Math.max(easy, good + 1);
  return {
    again: { ...next.again, interval: again },
    hard: { ...next.hard, interval: hard },
    good: { ...next.good, interval: good },
    easy: { ...next.easy, interval: easy }
  };
}

function elapsedSince(memory: SrsMemory, today: string): number {
  if (memory.state === 'new' || !memory.lastReviewDay) return 0;
  return Math.max(0, dayNumber(today) - dayNumber(memory.lastReviewDay));
}

/** Interval in days each rating would give today, for the rating buttons. */
export function previewIntervals(
  memory: SrsMemory,
  at: Date,
  timeZone: string,
  settings: Partial<SrsSettings> = {}
): Record<SrsRating, number> {
  const today = dayKey(at, timeZone);
  const all = outcomes(memory, elapsedSince(memory, today), normalizeSettings(settings));
  return { again: all.again.interval, hard: all.hard.interval, good: all.good.interval, easy: all.easy.interval };
}

export function reviewCard(
  memory: SrsMemory,
  rating: SrsRating,
  at: Date,
  timeZone: string,
  settings: Partial<SrsSettings> = {}
): SrsMemory {
  const today = dayKey(at, timeZone);
  const outcome = outcomes(memory, elapsedSince(memory, today), normalizeSettings(settings))[rating];
  return {
    state: 'review',
    stability: outcome.stability,
    difficulty: outcome.difficulty,
    dueDay: addDays(today, outcome.interval),
    lastReviewDay: today,
    scheduledDays: outcome.interval,
    reps: memory.reps + 1,
    lapses: memory.lapses + (rating === 'again' && memory.state === 'review' ? 1 : 0)
  };
}

export function isDue(memory: SrsMemory, at: Date, timeZone: string): boolean {
  return memory.dueDay === null || dayNumber(memory.dueDay) <= dayNumber(dayKey(at, timeZone));
}

/**
 * Daily review queue: due review cards first (most overdue first), then up to `newLimit` new cards
 * in their given order.
 */
export function reviewQueue<T extends { memory: SrsMemory }>(
  cards: readonly T[],
  at: Date,
  timeZone: string,
  newLimit = 20
): T[] {
  const due = cards
    .filter((card) => card.memory.state === 'review' && isDue(card.memory, at, timeZone))
    .sort((a, b) => dayNumber(a.memory.dueDay ?? '') - dayNumber(b.memory.dueDay ?? ''));
  const fresh = cards.filter((card) => card.memory.state === 'new').slice(0, Math.max(0, Math.floor(newLimit)));
  return [...due, ...fresh];
}

/** Runtime guard for stored or imported scheduling state. */
export function isSrsMemory(input: unknown): input is SrsMemory {
  if (!input || typeof input !== 'object') return false;
  const m = input as Record<string, unknown>;
  const count = (value: unknown) => Number.isInteger(value) && (value as number) >= 0;
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
  if (!count(m.reps) || !count(m.lapses) || !count(m.scheduledDays)) return false;
  if (!finite(m.stability) || !finite(m.difficulty)) return false;
  if (m.state === 'new') return m.dueDay === null && m.lastReviewDay === null;
  if (m.state !== 'review' || !isDayKey(m.dueDay) || !isDayKey(m.lastReviewDay)) return false;
  const s = m.stability as number;
  const d = m.difficulty as number;
  return s >= S_MIN && s <= S_MAX && d >= 1 && d <= 10;
}
