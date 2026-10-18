// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { evaluateGuard, guardFromReport, isGuardState } from '../src/content/moodle/guard';

const ORIGIN = 'https://moodle.example.edu';
const CHROME_UA = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0 Safari/537.36';

function page(body = ''): Document {
  return new DOMParser().parseFromString(`<html><body>${body}</body></html>`, 'text/html');
}

function reviewSummary(label: string, state: string): string {
  return `<table class="generaltable generalbox quizreviewsummary"><tbody>
    <tr><th class="cell" scope="row">Started on</th><td class="cell">Synthetic date</td></tr>
    <tr><th class="cell" scope="row"> ${label} </th><td class="cell"> ${state} </td></tr>
  </tbody></table>`;
}
const QUESTION = '<div class="que multichoice deferredfeedback incorrect">Synthetic question</div>';
const FINISHED_REVIEW = reviewSummary('State', 'Finished') + QUESTION;

function guard(path: string, body = '', userAgent = CHROME_UA) {
  return evaluateGuard(page(body), `${ORIGIN}${path}`, userAgent);
}

describe('assessment guard: quiz attempt paths', () => {
  for (const script of ['attempt', 'startattempt', 'processattempt', 'summary']) {
    it(`is active on /mod/quiz/${script}.php`, () => {
      expect(guard(`/mod/quiz/${script}.php?attempt=1&cmid=2`)).toEqual({
        active: true,
        reasons: ['quiz-attempt'],
        practiceCaptureAllowed: false
      });
    });
    it(`is active on /mod/quiz/${script}.php under a subdirectory install`, () => {
      expect(guard(`/moodle/mod/quiz/${script}.php?attempt=1`).active).toBe(true);
    });
  }
  it('blocks practice capture on attempt pages even with review markup', () => {
    const state = guard('/mod/quiz/attempt.php?attempt=1', FINISHED_REVIEW);
    expect(state.active).toBe(true);
    expect(state.practiceCaptureAllowed).toBe(false);
  });
});

describe('assessment guard: quiz review', () => {
  it('allows practice capture on a finished review', () => {
    expect(guard('/mod/quiz/review.php?attempt=1', FINISHED_REVIEW)).toEqual({
      active: false,
      reasons: [],
      practiceCaptureAllowed: true
    });
  });
  it('accepts the Indonesian finished state', () => {
    expect(guard('/mod/quiz/review.php?attempt=1', reviewSummary('Status', 'Selesai') + QUESTION).active).toBe(false);
  });
  it('is active when the attempt is still in progress', () => {
    const state = guard('/mod/quiz/review.php?attempt=1', reviewSummary('State', 'In progress') + QUESTION);
    expect(state).toEqual({ active: true, reasons: ['quiz-review-unfinished'], practiceCaptureAllowed: false });
  });
  it('is active when the summary table is missing', () => {
    expect(guard('/mod/quiz/review.php?attempt=1', QUESTION).reasons).toEqual(['quiz-review-unfinished']);
  });
  it('is active when no question is rendered', () => {
    expect(guard('/mod/quiz/review.php?attempt=1', reviewSummary('State', 'Finished')).active).toBe(true);
  });
  it('is active when the state row has an unknown label', () => {
    expect(guard('/mod/quiz/review.php?attempt=1', reviewSummary('Grade', 'Finished') + QUESTION).active).toBe(true);
  });
  it('is active on a finished review that still shows a timer', () => {
    const state = guard('/mod/quiz/review.php?attempt=1', FINISHED_REVIEW + '<div id="quiz-timer"></div>');
    expect(state).toEqual({ active: true, reasons: ['timer'], practiceCaptureAllowed: false });
  });
});

describe('assessment guard: other states', () => {
  for (const selector of ['quiz-timer-wrapper', 'quiz-timer', 'quiz-time-left']) {
    it(`is active when #${selector} is present on any page`, () => {
      expect(guard('/course/view.php?id=7', `<div id="${selector}"></div>`).reasons).toEqual(['timer']);
    });
  }
  it('is active in Safe Exam Browser', () => {
    expect(guard('/course/view.php?id=7', '', `${CHROME_UA} SEB/3.5.0`).reasons).toEqual(['safe-exam-browser']);
  });
  it('is active on an assignment editing form by URL', () => {
    expect(guard('/mod/assign/view.php?id=3&action=editsubmission').reasons).toEqual(['assign-editing']);
  });
  it('is active on an assignment editing form by form marker', () => {
    const form = '<form><input type="hidden" name="action" value="savesubmission"></form>';
    expect(guard('/mod/assign/view.php?id=3', form).reasons).toEqual(['assign-editing']);
  });
  it('is not active on a plain assignment view', () => {
    expect(guard('/mod/assign/view.php?id=3').active).toBe(false);
  });
  it('is active on any lesson page', () => {
    expect(guard('/mod/lesson/view.php?id=4').reasons).toEqual(['lesson']);
  });
  it('is active on any H5P activity page', () => {
    expect(guard('/mod/h5pactivity/view.php?id=5').reasons).toEqual(['h5p-activity']);
  });
  it('is not active on a course page and never allows capture there', () => {
    expect(guard('/course/view.php?id=7')).toEqual({ active: false, reasons: [], practiceCaptureAllowed: false });
  });
  it('is not active on the quiz overview page', () => {
    expect(guard('/mod/quiz/view.php?id=2').active).toBe(false);
  });
  it('collects every matching reason', () => {
    expect(guard('/mod/quiz/attempt.php', '<div id="quiz-timer"></div>', `${CHROME_UA} SEB/3.5`).reasons).toEqual([
      'quiz-attempt',
      'timer',
      'safe-exam-browser'
    ]);
  });
});

describe('assessment guard: fail closed', () => {
  it('is active when the URL cannot be parsed', () => {
    expect(evaluateGuard(page(), 'not a url', CHROME_UA)).toEqual({
      active: true,
      reasons: ['parse-error'],
      practiceCaptureAllowed: false
    });
  });
  it('is active when the document throws', () => {
    const broken = {
      querySelector: () => {
        throw new Error('detached');
      }
    } as unknown as Document;
    expect(evaluateGuard(broken, `${ORIGIN}/course/view.php?id=7`, CHROME_UA).reasons).toEqual(['parse-error']);
  });
});

describe('guard state validation', () => {
  it('accepts states the guard produces', () => {
    expect(isGuardState(guard('/mod/quiz/review.php', FINISHED_REVIEW))).toBe(true);
    expect(isGuardState(guard('/mod/quiz/attempt.php'))).toBe(true);
  });
  for (const [name, input] of [
    ['null', null],
    ['an unknown reason', { active: true, reasons: ['nope'], practiceCaptureAllowed: false }],
    ['inactive with reasons', { active: false, reasons: ['timer'], practiceCaptureAllowed: false }],
    ['active without reasons', { active: true, reasons: [], practiceCaptureAllowed: false }],
    ['active with capture allowed', { active: true, reasons: ['timer'], practiceCaptureAllowed: true }],
    ['duplicate reasons', { active: true, reasons: ['timer', 'timer'], practiceCaptureAllowed: false }],
    ['a string flag', { active: 'false', reasons: [], practiceCaptureAllowed: false }]
  ] as const) {
    it(`rejects ${name}`, () => expect(isGuardState(input)).toBe(false));
  }
  it('reads a missing or malformed report as active', () => {
    expect(guardFromReport(undefined)).toEqual({
      active: true,
      reasons: ['parse-error'],
      practiceCaptureAllowed: false
    });
    expect(guardFromReport({ active: false, reasons: ['timer'], practiceCaptureAllowed: true }).active).toBe(true);
  });
});
