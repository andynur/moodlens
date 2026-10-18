/**
 * Mistake capture from finished quiz review pages (ML-020, D-009).
 * Runs only when the assessment guard allows practice capture. Reads question text and the correct
 * answer exactly as the review page shows them; images, media, scripts and screen-reader-only labels
 * are dropped. Questions without a shown correct answer are skipped, never guessed.
 *
 * Selector status: unverified (no quiz review fixture yet). Markup follows Moodle core question
 * rendering: `.que.<state>` with `.qtext` and `.outcome .rightanswer`.
 */

import { MAX_CARD_TEXT } from '../../shared/cards';
import { evaluateGuard } from './guard';

export interface ReviewMistake {
  /** Question text as shown, whitespace-normalized. */
  question: string;
  /** Correct answer as shown, with the "The correct answer is:" label removed when recognized. */
  answer: string;
}

export interface ReviewCapture {
  mistakes: ReviewMistake[];
  /** Wrong questions dropped because no correct answer was shown, or text was empty or too long. */
  skipped: number;
  /** Moodle course module id from the URL, when present; the attempt id is never kept. */
  cmid?: string;
}

/** Question state classes that count as a mistake. Unanswered questions count too. */
const MISTAKE_STATES = ['incorrect', 'partiallycorrect', 'notanswered'] as const;
const DROPPED = 'img, picture, svg, video, audio, iframe, object, embed, canvas, script, style, noscript, .accesshide';
// Unverified: English and Indonesian language-pack labels in front of the right answer.
const ANSWER_LABEL = /^(the correct answers? (is|are)|jawaban yang benar( adalah)?)\s*:\s*/i;
export const MAX_REVIEW_QUESTIONS = 200;

function visibleText(element: Element | null): string {
  if (!element) return '';
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll(DROPPED).forEach((node) => node.remove());
  // Keep block and line breaks as spaces so words from adjacent paragraphs do not merge.
  copy.querySelectorAll('br, p, div, li, td').forEach((node) => node.append(' '));
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function fits(text: string): boolean {
  return text.length > 0 && text.length <= MAX_CARD_TEXT;
}

/**
 * Returns null when capture is not allowed on this page (attempt pages, unfinished reviews, timers,
 * Safe Exam Browser or any parse error), so callers cannot capture without the guard.
 */
export function captureReviewMistakes(
  root: Document,
  href: string,
  userAgent: string = navigator.userAgent
): ReviewCapture | null {
  if (!evaluateGuard(root, href, userAgent).practiceCaptureAllowed) return null;
  try {
    const mistakes: ReviewMistake[] = [];
    let skipped = 0;
    const seen = new Set<string>();
    for (const que of Array.from(root.querySelectorAll('.que'))) {
      if (!MISTAKE_STATES.some((state) => que.classList.contains(state))) continue;
      const question = visibleText(que.querySelector('.qtext'));
      const answer = visibleText(que.querySelector('.outcome .rightanswer, .rightanswer')).replace(ANSWER_LABEL, '');
      if (!fits(question) || !fits(answer) || mistakes.length >= MAX_REVIEW_QUESTIONS) {
        skipped++;
        continue;
      }
      const key = `${question}\n${answer}`;
      if (seen.has(key)) continue;
      seen.add(key);
      mistakes.push({ question, answer });
    }
    const cmid = new URL(href).searchParams.get('cmid');
    return { mistakes, skipped, ...(cmid && /^\d{1,12}$/.test(cmid) ? { cmid } : {}) };
  } catch {
    return null;
  }
}
