/**
 * Assessment guard (ML-022, docs/04_MOODLE_ADAPTER.md §4). Fail-closed: if unsure, the page is treated
 * as an active assessment, and study help (AI, practice capture, answer-related UI) stays paused.
 *
 * Selector status: every DOM marker below is unverified (no quiz, assignment or SEB fixture yet).
 * Path rules follow Moodle's standard module scripts and match under a subdirectory install
 * (`https://host/moodle/mod/quiz/attempt.php`).
 */

export type GuardReason =
  | 'quiz-attempt'
  | 'quiz-review-unfinished'
  | 'timer'
  | 'safe-exam-browser'
  | 'assign-editing'
  | 'lesson'
  | 'h5p-activity'
  | 'parse-error';

export interface GuardState {
  /** True when any rule matched or the page could not be evaluated. */
  active: boolean;
  reasons: GuardReason[];
  /** True only on a finished quiz review page with no other rule matched (D-009). */
  practiceCaptureAllowed: boolean;
}

const REASONS: readonly GuardReason[] = [
  'quiz-attempt',
  'quiz-review-unfinished',
  'timer',
  'safe-exam-browser',
  'assign-editing',
  'lesson',
  'h5p-activity',
  'parse-error'
];

const QUIZ_ATTEMPT_PATH = /\/mod\/quiz\/(attempt|startattempt|processattempt|summary)\.php$/;
const QUIZ_REVIEW_PATH = /\/mod\/quiz\/review\.php$/;
const ASSIGN_VIEW_PATH = /\/mod\/assign\/view\.php$/;
// Unverified: Moodle 4.x quiz timer markup (`#quiz-timer-wrapper > #quiz-timer > #quiz-time-left`).
const TIMER_SELECTOR = '#quiz-timer-wrapper, #quiz-timer, #quiz-time-left';
// Unverified: Safe Exam Browser appends `SEB/<version>` to the user agent.
const SEB_USER_AGENT = /\bSEB\/\d/;
// Unverified: review summary row labels and the finished state, English and Indonesian language packs.
const STATE_LABEL = /^(state|status|keadaan)$/i;
const FINISHED_STATE = /^(finished|selesai)$/i;

const ACTIVE_ON_ERROR: GuardState = { active: true, reasons: ['parse-error'], practiceCaptureAllowed: false };

function normalizedText(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Finished-state evidence on `review.php`: the review summary table has a state row that reads
 * "Finished", and at least one question is rendered. Anything else counts as unfinished.
 */
function hasFinishedReviewEvidence(root: Document): boolean {
  const summary = root.querySelector('table.quizreviewsummary');
  if (!summary || !root.querySelector('.que')) return false;
  return Array.from(summary.querySelectorAll('tr')).some(
    (row) =>
      STATE_LABEL.test(normalizedText(row.querySelector('th'))) &&
      FINISHED_STATE.test(normalizedText(row.querySelector('td')))
  );
}

function isAssignEditing(root: Document, url: URL): boolean {
  if (!ASSIGN_VIEW_PATH.test(url.pathname)) return false;
  return (
    url.searchParams.get('action') === 'editsubmission' ||
    // Unverified: the submission form posts `action=savesubmission`.
    root.querySelector('form input[name="action"][value="savesubmission"]') !== null
  );
}

export function evaluateGuard(root: Document, href: string, userAgent: string = navigator.userAgent): GuardState {
  try {
    const url = new URL(href);
    const path = url.pathname;
    const reasons: GuardReason[] = [];
    const isReview = QUIZ_REVIEW_PATH.test(path);

    if (QUIZ_ATTEMPT_PATH.test(path)) reasons.push('quiz-attempt');
    if (isReview && !hasFinishedReviewEvidence(root)) reasons.push('quiz-review-unfinished');
    if (root.querySelector(TIMER_SELECTOR)) reasons.push('timer');
    if (SEB_USER_AGENT.test(userAgent)) reasons.push('safe-exam-browser');
    if (isAssignEditing(root, url)) reasons.push('assign-editing');
    // Every lesson and H5P page counts as an attempt state until fixtures show otherwise.
    if (path.includes('/mod/lesson/')) reasons.push('lesson');
    if (path.includes('/mod/h5pactivity/')) reasons.push('h5p-activity');

    const active = reasons.length > 0;
    return { active, reasons, practiceCaptureAllowed: isReview && !active };
  } catch {
    return { ...ACTIVE_ON_ERROR, reasons: [...ACTIVE_ON_ERROR.reasons] };
  }
}

/** Runtime guard for a guard state sent by a content script; the page is untrusted input. */
export function isGuardState(input: unknown): input is GuardState {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<GuardState>;
  if (typeof value.active !== 'boolean' || typeof value.practiceCaptureAllowed !== 'boolean') return false;
  if (!Array.isArray(value.reasons) || value.reasons.length > REASONS.length) return false;
  if (!value.reasons.every((reason) => REASONS.includes(reason))) return false;
  if (new Set(value.reasons).size !== value.reasons.length) return false;
  return value.active === value.reasons.length > 0 && !(value.active && value.practiceCaptureAllowed);
}

/**
 * Background-side reading of a reported state: anything that fails validation is treated as active,
 * so a malformed or missing report can never unlock study help.
 */
export function guardFromReport(input: unknown): GuardState {
  return isGuardState(input) ? input : { ...ACTIVE_ON_ERROR, reasons: [...ACTIVE_ON_ERROR.reasons] };
}
