import { ShieldAlert } from 'lucide-react';
import type { GuardReason } from '../../content/moodle/guard';
import type { TranslationKey } from '../../shared/i18n';
import type { GuardView } from '../useGuard';

const REASON_KEYS: Record<GuardReason, TranslationKey> = {
  'quiz-attempt': 'guardReasonQuizAttempt',
  'quiz-review-unfinished': 'guardReasonQuizReview',
  timer: 'guardReasonTimer',
  'safe-exam-browser': 'guardReasonSeb',
  'assign-editing': 'guardReasonAssign',
  lesson: 'guardReasonLesson',
  'h5p-activity': 'guardReasonH5p',
  'parse-error': 'guardReasonUnknown'
};

/**
 * Shown while the assessment guard is active (ML-022). It names the reasons so the student can see
 * which open page paused study help, and it never offers a way to switch the guard off.
 */
export function GuardBanner({ guard, translate }: { guard: GuardView; translate: (key: TranslationKey) => string }) {
  if (!guard.active) return null;
  return (
    <section
      role="status"
      className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      <p className="flex items-center gap-2 font-semibold">
        <ShieldAlert size={16} aria-hidden="true" />
        {translate('guardPaused')}
      </p>
      {guard.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {guard.reasons.map((reason) => (
            <li key={reason}>{translate(REASON_KEYS[reason])}</li>
          ))}
        </ul>
      )}
      <p className="mt-2">{translate('guardOpenTabs')}</p>
    </section>
  );
}
