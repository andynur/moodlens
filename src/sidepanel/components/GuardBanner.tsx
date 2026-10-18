import { ShieldAlert } from 'lucide-react';
import type { GuardReason } from '../../content/moodle/guard';
import type { TranslationKey } from '../../shared/i18n';
import type { GuardView } from '../useGuard';
import { Alert } from '../ui';

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
    <Alert tone="warning" icon={ShieldAlert} role="status">
      <p className="font-semibold">{translate('guardPaused')}</p>
      {guard.reasons.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          {guard.reasons.map((reason) => (
            <li key={reason}>{translate(REASON_KEYS[reason])}</li>
          ))}
        </ul>
      )}
      <p className="mt-1.5">{translate('guardOpenTabs')}</p>
    </Alert>
  );
}
