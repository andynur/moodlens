import { describe, expect, it } from 'vitest';
import {
  exportCardsCsv,
  exportCardsJson,
  importCards,
  isDeck,
  isFlashcard,
  isReviewLog,
  MAX_CARD_TEXT,
  MAX_IMPORT_BYTES,
  normalizeRetention,
  reviewLogCutoff,
  newStudentCard,
  parseCsv,
  toPortableCard,
  type Flashcard
} from '../src/shared/cards';
import { createSrsMemory, reviewCard } from '../src/shared/srs';

const DECKS = { d1: 'Biology', d2: 'Quiz mistakes' };

function card(id: string, overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    siteId: 'moodle.example.edu',
    deckId: 'd1',
    front: `Synthetic front ${id}`,
    back: `Synthetic back ${id}`,
    origin: 'student',
    memory: createSrsMemory(),
    createdAt: '2026-10-19T03:00:00.000Z',
    ...overrides
  };
}

const QUIZ_CARD = card('q', { deckId: 'd2', origin: 'quiz-review', front: 'QUIZ-DERIVED-TEXT', back: 'QUIZ-ANSWER' });

describe('card export never includes quiz-derived cards (D-009)', () => {
  it('drops them from JSON', () => {
    const json = exportCardsJson([card('a'), QUIZ_CARD], DECKS);
    expect(json).not.toContain('QUIZ-');
    expect(JSON.parse(json)).toEqual({
      format: 'moodlens-cards',
      version: 1,
      cards: [{ deck: 'Biology', front: 'Synthetic front a', back: 'Synthetic back a' }]
    });
  });
  it('drops them from CSV', () => {
    const csv = exportCardsCsv([QUIZ_CARD, card('a')], DECKS);
    expect(csv).not.toContain('QUIZ-');
    expect(csv).toBe('deck,front,back,source\nBiology,Synthetic front a,Synthetic back a,\n');
  });
  it('exports no scheduling state or ids', () => {
    const reviewed = card('a', { memory: reviewCard(createSrsMemory(), 'good', new Date(), 'UTC') });
    const json = exportCardsJson([reviewed], DECKS);
    expect(json).not.toMatch(/stability|memory|"id"|origin|siteId|createdAt/);
  });
});

describe('CSV', () => {
  it('quotes commas, quotes and newlines, and round-trips', () => {
    const tricky = card('a', {
      front: 'Mitosis, "phase" one',
      back: 'Line 1\nLine 2',
      sourceUrl: 'https://moodle.example.edu/mod/page/view.php?id=1'
    });
    const csv = exportCardsCsv([tricky], DECKS);
    expect(csv).toContain('"Mitosis, ""phase"" one"');
    expect(importCards(csv, 'csv')).toEqual({
      cards: [
        {
          deck: 'Biology',
          front: 'Mitosis, "phase" one',
          back: 'Line 1\nLine 2',
          source: 'https://moodle.example.edu/mod/page/view.php?id=1'
        }
      ],
      skipped: 0
    });
  });
  it('neutralizes spreadsheet formulas on export and restores the text on import', () => {
    const csv = exportCardsCsv([card('a', { front: '=HYPERLINK("x")', back: '+1' })], DECKS);
    expect(csv).toContain(`"'=HYPERLINK(""x"")",'+1`);
    expect(importCards(csv, 'csv').cards[0]).toMatchObject({ front: '=HYPERLINK("x")', back: '+1' });
  });
  it('reads CRLF, a BOM, extra columns and any column order', () => {
    const text = '﻿back,extra,front,deck\r\nB1,x,F1,D\r\n\r\n';
    expect(importCards(text, 'csv').cards).toEqual([{ deck: 'D', front: 'F1', back: 'B1' }]);
  });
  it('rejects malformed quoting', () => {
    expect(parseCsv('a,"b')).toBeNull();
    expect(parseCsv('a,"b"c')).toBeNull();
    expect(parseCsv('a,b"c"')).toBeNull();
  });
  it('rejects a file without the required columns', () => {
    expect(importCards('question,answer\nq,a\n', 'csv').error).toBe('unreadable');
  });
});

describe('import validation', () => {
  it('skips rows with missing, oversized or unsafe fields', () => {
    const long = 'x'.repeat(MAX_CARD_TEXT + 1);
    const text = [
      'deck,front,back,source',
      'D,F,B,',
      'D,,B,',
      `D,${long},B,`,
      'D,F,B,javascript:alert(1)',
      'D,F,B,http://insecure.example/'
    ].join('\n');
    expect(importCards(text, 'csv')).toEqual({ cards: [{ deck: 'D', front: 'F', back: 'B' }], skipped: 4 });
  });
  it('strips control characters', () => {
    expect(toPortableCard({ deck: 'D\u0007', front: 'F\u0000', back: 'B' })).toEqual({
      deck: 'D',
      front: 'F',
      back: 'B'
    });
  });
  it('reads JSON exports and rejects other JSON', () => {
    const json = exportCardsJson([card('a')], DECKS);
    expect(importCards(json, 'json').cards).toHaveLength(1);
    expect(importCards('{"cards":[]}', 'json').error).toBe('unreadable');
    expect(importCards('not json', 'json').error).toBe('unreadable');
  });
  it('ignores origin and scheduling fields in imported JSON', () => {
    const json = JSON.stringify({
      format: 'moodlens-cards',
      version: 1,
      cards: [{ deck: 'D', front: 'F', back: 'B', origin: 'quiz-review', memory: { reps: 9 } }]
    });
    const [portable] = importCards(json, 'json').cards;
    expect(portable).toEqual({ deck: 'D', front: 'F', back: 'B' });
    const ids = { id: 'n1', siteId: 'moodle.example.edu', deckId: 'd1' };
    expect(portable && newStudentCard(ids, portable, '2026-10-19T03:00:00.000Z')).toEqual({
      ...ids,
      createdAt: '2026-10-19T03:00:00.000Z',
      front: 'F',
      back: 'B',
      origin: 'student',
      memory: createSrsMemory()
    });
  });
  it('validates stored records', () => {
    expect(isFlashcard(card('a'))).toBe(true);
    expect(isFlashcard(QUIZ_CARD)).toBe(true);
    expect(isFlashcard({ ...card('a'), origin: 'shared' })).toBe(false);
    expect(isFlashcard({ ...card('a'), front: '' })).toBe(false);
    expect(isFlashcard({ ...card('a'), id: 'has space' })).toBe(false);
    expect(isFlashcard({ ...card('a'), sourceUrl: 'http://insecure.example/' })).toBe(false);
    expect(isDeck({ id: 'd1', siteId: 's', name: 'Biology', createdAt: '2026-10-19T03:00:00Z' })).toBe(true);
    expect(isDeck({ id: 'd1', siteId: 's', name: ' ', createdAt: '2026-10-19T03:00:00Z' })).toBe(false);
    const log = {
      siteId: 's',
      cardId: 'a',
      rating: 'good',
      reviewedAt: '2026-10-19T03:00:00.000Z',
      day: '2026-10-19',
      scheduledDays: 3
    };
    expect(isReviewLog(log)).toBe(true);
    expect(isReviewLog({ ...log, rating: 'perfect' })).toBe(false);
    expect(isReviewLog({ ...log, day: 'today' })).toBe(false);
    expect(isReviewLog({ ...log, reviewedAt: '2026-10-19T03:00:00Z' })).toBe(false);
  });
  it('keeps review-log retention to the offered choices', () => {
    expect(normalizeRetention(90)).toBe(90);
    expect(normalizeRetention(7)).toBe(365);
    expect(normalizeRetention('730')).toBe(365);
    expect(reviewLogCutoff(new Date('2026-10-19T03:00:00.000Z'), 90)).toBe('2026-07-21T03:00:00.000Z');
  });
  it('refuses oversized input', () => {
    expect(importCards('x'.repeat(MAX_IMPORT_BYTES + 1), 'csv').error).toBe('too-large');
  });
});
