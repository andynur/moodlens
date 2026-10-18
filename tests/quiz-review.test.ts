// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { captureReviewMistakes, MAX_REVIEW_QUESTIONS } from '../src/content/moodle/quiz-review';
import { exportCardsCsv, exportCardsJson, newQuizReviewCard } from '../src/shared/cards';

// Synthetic markup modeled on Moodle core question rendering; no real quiz content.
const ORIGIN = 'https://moodle.example.edu';
const CHROME_UA = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0 Safari/537.36';

function summary(state: string): string {
  return `<table class="generaltable generalbox quizreviewsummary"><tbody>
    <tr><th class="cell" scope="row">State</th><td class="cell">${state}</td></tr>
  </tbody></table>`;
}

function question(state: string, text: string, rightAnswer?: string): string {
  const outcome =
    rightAnswer === undefined ? '' : `<div class="outcome"><div class="rightanswer">${rightAnswer}</div></div>`;
  return `<div class="que multichoice deferredfeedback ${state}">
    <div class="content"><div class="formulation"><h4 class="accesshide">Question text</h4>
      <div class="qtext">${text}</div></div>${outcome}</div></div>`;
}

function capture(body: string, path = '/mod/quiz/review.php?attempt=7&cmid=42', userAgent = CHROME_UA) {
  const root = new DOMParser().parseFromString(`<html><body>${body}</body></html>`, 'text/html');
  return captureReviewMistakes(root, `${ORIGIN}${path}`, userAgent);
}

const WRONG = question('incorrect', '<p>Synthetic question one?</p>', 'The correct answer is: Synthetic answer A');

describe('quiz review capture is unavailable outside finished reviews (PRD-010 AC 2)', () => {
  it('returns null on attempt pages', () => {
    for (const script of ['attempt', 'startattempt', 'processattempt', 'summary'])
      expect(capture(summary('Finished') + WRONG, `/mod/quiz/${script}.php?attempt=7`)).toBeNull();
  });
  it('returns null on an unfinished review', () => {
    expect(capture(summary('In progress') + WRONG)).toBeNull();
  });
  it('returns null when the review summary is missing', () => {
    expect(capture(WRONG)).toBeNull();
  });
  it('returns null with a running timer or Safe Exam Browser', () => {
    expect(capture(summary('Finished') + WRONG + '<div id="quiz-timer"></div>')).toBeNull();
    expect(capture(summary('Finished') + WRONG, undefined, `${CHROME_UA} SEB/3.5`)).toBeNull();
  });
});

describe('quiz review capture on a finished review', () => {
  it('keeps wrong, partially correct and unanswered questions with a shown answer', () => {
    const result = capture(
      summary('Finished') +
        WRONG +
        question('correct', 'Synthetic right question', 'The correct answer is: Ignored') +
        question('partiallycorrect', 'Synthetic question two', 'The correct answers are: B, C') +
        question('notanswered', 'Synthetic question three', 'Jawaban yang benar adalah: D')
    );
    expect(result).toEqual({
      mistakes: [
        { question: 'Synthetic question one?', answer: 'Synthetic answer A' },
        { question: 'Synthetic question two', answer: 'B, C' },
        { question: 'Synthetic question three', answer: 'D' }
      ],
      skipped: 0,
      cmid: '42'
    });
  });
  it('skips wrong questions whose correct answer is hidden', () => {
    expect(capture(summary('Finished') + question('incorrect', 'Synthetic hidden'))).toEqual({
      mistakes: [],
      skipped: 1,
      cmid: '42'
    });
  });
  it('drops images, media, scripts and screen-reader labels', () => {
    const result = capture(
      summary('Finished') +
        question(
          'incorrect',
          'Look at <img src="https://moodle.example.edu/pluginfile.php/1/x.png" alt="diagram">this<script>alert(1)</script><br>shape',
          'The correct answer is: <span class="accesshide">Answer</span>Square<svg><text>s</text></svg>'
        )
    );
    expect(result?.mistakes).toEqual([{ question: 'Look at this shape', answer: 'Square' }]);
  });
  it('skips over-long text and removes duplicates', () => {
    const result = capture(summary('Finished') + WRONG + WRONG + question('incorrect', 'x'.repeat(2001), 'y'));
    expect(result?.mistakes).toHaveLength(1);
    expect(result?.skipped).toBe(1);
  });
  it('caps the number of captured questions', () => {
    const many = Array.from({ length: MAX_REVIEW_QUESTIONS + 5 }, (_, i) =>
      question('incorrect', `Synthetic question ${i}`, `Synthetic answer ${i}`)
    ).join('');
    const result = capture(summary('Finished') + many);
    expect(result?.mistakes).toHaveLength(MAX_REVIEW_QUESTIONS);
    expect(result?.skipped).toBe(5);
  });
  it('never keeps the attempt id and ignores a malformed cmid', () => {
    expect(capture(summary('Finished') + WRONG, '/mod/quiz/review.php?attempt=7&cmid=4x')).not.toHaveProperty('cmid');
  });
});

describe('quiz-review cards (D-009)', () => {
  const ids = { id: 'c1', siteId: 's1', deckId: 'd1' };
  it('builds a private card and never exports it', () => {
    const card = newQuizReviewCard(
      ids,
      { question: 'Synthetic question', answer: 'Synthetic answer' },
      '2026-10-19T00:00:00.000Z',
      `${ORIGIN}/mod/quiz/view.php?id=42`
    );
    expect(card).toMatchObject({ origin: 'quiz-review', front: 'Synthetic question', back: 'Synthetic answer' });
    if (!card) return;
    expect(exportCardsCsv([card], { d1: 'Deck' })).toBe('deck,front,back,source\n');
    expect(JSON.parse(exportCardsJson([card], { d1: 'Deck' })).cards).toEqual([]);
  });
  it('rejects empty text and drops a non-https source', () => {
    expect(newQuizReviewCard(ids, { question: ' ', answer: 'a' }, '2026-10-19T00:00:00.000Z')).toBeNull();
    const card = newQuizReviewCard(ids, { question: 'q', answer: 'a' }, '2026-10-19T00:00:00.000Z', 'http://x.test/');
    expect(card).not.toHaveProperty('sourceUrl');
  });
});
