import { describe, expect, it } from 'vitest';
import { addDays, dayKey, isDayKey } from '../src/shared/days';
import {
  createSrsMemory,
  isDue,
  isSrsMemory,
  normalizeSettings,
  previewIntervals,
  reviewCard,
  reviewQueue,
  type SrsMemory,
  type SrsRating
} from '../src/shared/srs';

const UTC = 'UTC';
const JAKARTA = 'Asia/Jakarta';

interface Step {
  rating: SrsRating;
  /** Days after the due day the review happens (negative: early). */
  late?: number;
}

/** Reviews each step at 03:00 UTC on the due day plus `late`, starting 2026-10-01. */
function replay(steps: Step[], settings = {}) {
  let memory = createSrsMemory();
  const log: { day: string; interval: number; stability: number; difficulty: number; lapses: number }[] = [];
  for (const step of steps) {
    const day = memory.dueDay === null ? '2026-10-01' : addDays(memory.dueDay, step.late ?? 0);
    memory = reviewCard(memory, step.rating, new Date(`${day}T03:00:00Z`), UTC, settings);
    log.push({
      day,
      interval: memory.scheduledDays,
      stability: memory.stability,
      difficulty: memory.difficulty,
      lapses: memory.lapses
    });
  }
  return log;
}

// Reference values: ts-fsrs 4.7.1, fsrs({ enable_short_term: false, enable_fuzz: false }), generated
// outside the repo with the same review days. Not a dependency of Moodlens.
describe('FSRS-5 scheduling matches the reference implementation', () => {
  it('good, good, good, again, hard, good (3 days late), easy', () => {
    expect(
      replay([
        { rating: 'good' },
        { rating: 'good' },
        { rating: 'good' },
        { rating: 'again' },
        { rating: 'hard' },
        { rating: 'good', late: 3 },
        { rating: 'easy' }
      ])
    ).toEqual([
      { day: '2026-10-01', interval: 3, stability: 3.173, difficulty: 5.28243442, lapses: 0 },
      { day: '2026-10-04', interval: 11, stability: 10.73892592, difficulty: 5.27296793, lapses: 0 },
      { day: '2026-10-15', interval: 35, stability: 34.57762416, difficulty: 5.26354498, lapses: 0 },
      { day: '2026-11-19', interval: 4, stability: 3.8181743, difficulty: 6.78423209, lapses: 1 },
      { day: '2026-11-23', interval: 5, stability: 5.48529385, difficulty: 7.28726893, lapses: 1 },
      { day: '2026-12-01', interval: 17, stability: 17.15657655, difficulty: 7.2685802, lapses: 1 },
      { day: '2026-12-18', interval: 85, stability: 85.25427967, difficulty: 6.80879785, lapses: 1 }
    ]);
  });

  it('again, again, hard, easy, good (1 day early)', () => {
    expect(
      replay([
        { rating: 'again' },
        { rating: 'again' },
        { rating: 'hard' },
        { rating: 'easy' },
        { rating: 'good', late: -1 }
      ])
    ).toEqual([
      { day: '2026-10-01', interval: 1, stability: 0.40255, difficulty: 7.1949, lapses: 0 },
      { day: '2026-10-02', interval: 1, stability: 0.26194202, difficulty: 8.08279701, lapses: 1 },
      { day: '2026-10-03', interval: 2, stability: 0.57516596, difficulty: 8.37011594, lapses: 1 },
      { day: '2026-10-05', interval: 7, stability: 7.3876905, difficulty: 8.08318685, lapses: 1 },
      { day: '2026-10-11', interval: 14, stability: 14.46328961, difficulty: 8.0608369, lapses: 1 }
    ]);
  });

  it('easy three times', () => {
    expect(replay([{ rating: 'easy' }, { rating: 'easy' }, { rating: 'easy' }])).toEqual([
      { day: '2026-10-01', interval: 16, stability: 15.69105, difficulty: 3.22450159, lapses: 0 },
      { day: '2026-10-17', interval: 150, stability: 150.28356197, difficulty: 2.13012146, lapses: 0 },
      { day: '2027-03-16', interval: 1252, stability: 1252.22332554, difficulty: 1, lapses: 0 }
    ]);
  });

  it('previews new-card intervals 1, 2, 3, 16', () => {
    expect(previewIntervals(createSrsMemory(), new Date('2026-10-01T03:00:00Z'), UTC)).toEqual({
      again: 1,
      hard: 2,
      good: 3,
      easy: 16
    });
  });

  it('uses the requested retention', () => {
    const [, second] = replay([{ rating: 'good' }, { rating: 'good' }], { requestRetention: 0.8 });
    expect(second).toMatchObject({ interval: 49, stability: 20.62257535 });
  });
});

describe('SRS days and queue', () => {
  it('counts days in the student time zone', () => {
    // 17:30 UTC is already the next day in Jakarta, so the card is due there one local day later.
    const memory = reviewCard(createSrsMemory(), 'good', new Date('2026-10-01T17:30:00Z'), JAKARTA);
    expect(memory).toMatchObject({ lastReviewDay: '2026-10-02', dueDay: '2026-10-05' });
    expect(isDue(memory, new Date('2026-10-04T16:59:00Z'), JAKARTA)).toBe(false);
    expect(isDue(memory, new Date('2026-10-04T17:00:00Z'), JAKARTA)).toBe(true);
  });

  it('orders due cards by due day, then new cards up to the limit', () => {
    const at = new Date('2026-10-10T03:00:00Z');
    const review = (dueDay: string): SrsMemory => ({
      ...createSrsMemory(),
      state: 'review',
      stability: 3,
      difficulty: 5,
      dueDay,
      lastReviewDay: addDays(dueDay, -3),
      scheduledDays: 3,
      reps: 1
    });
    const cards = [
      { id: 'later', memory: review('2026-10-11') },
      { id: 'today', memory: review('2026-10-10') },
      { id: 'new-1', memory: createSrsMemory() },
      { id: 'overdue', memory: review('2026-10-02') },
      { id: 'new-2', memory: createSrsMemory() }
    ];
    expect(reviewQueue(cards, at, UTC, 1).map((card) => card.id)).toEqual(['overdue', 'today', 'new-1']);
    expect(reviewQueue(cards, at, UTC, 0).map((card) => card.id)).toEqual(['overdue', 'today']);
  });

  it('clamps settings to the allowed range', () => {
    expect(normalizeSettings({ requestRetention: 0.5, maximumInterval: 0 })).toEqual({
      requestRetention: 0.7,
      maximumInterval: 1
    });
    expect(normalizeSettings({ requestRetention: Number.NaN })).toEqual({
      requestRetention: 0.9,
      maximumInterval: 36_500
    });
  });

  it('caps intervals at the maximum interval', () => {
    const memory = reviewCard(createSrsMemory(), 'easy', new Date('2026-10-01T03:00:00Z'), UTC, {
      maximumInterval: 7
    });
    expect(memory.scheduledDays).toBe(7);
  });

  it('validates day keys', () => {
    expect(isDayKey('2026-10-19')).toBe(true);
    expect(isDayKey('2026-13-01')).toBe(false);
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(dayKey(new Date('2026-10-19T00:00:00Z'), UTC)).toBe('2026-10-19');
  });
});

describe('SRS memory validation', () => {
  it('accepts new and reviewed memory', () => {
    expect(isSrsMemory(createSrsMemory())).toBe(true);
    expect(isSrsMemory(reviewCard(createSrsMemory(), 'hard', new Date('2026-10-01T03:00:00Z'), UTC))).toBe(true);
  });
  const reviewed = reviewCard(createSrsMemory(), 'good', new Date('2026-10-01T03:00:00Z'), UTC);
  for (const [name, input] of [
    ['null', null],
    ['an unknown state', { ...reviewed, state: 'learning' }],
    ['a bad due day', { ...reviewed, dueDay: '2026-10-99' }],
    ['a new card with a due day', { ...createSrsMemory(), dueDay: '2026-10-01' }],
    ['negative reps', { ...reviewed, reps: -1 }],
    ['difficulty out of range', { ...reviewed, difficulty: 11 }],
    ['infinite stability', { ...reviewed, stability: Number.POSITIVE_INFINITY }]
  ] as const) {
    it(`rejects ${name}`, () => expect(isSrsMemory(input)).toBe(false));
  }
});
