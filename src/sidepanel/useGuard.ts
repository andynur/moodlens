import { useEffect, useState } from 'react';
import type { GuardReason } from '../content/moodle/guard';
import type { GuardStatusResponse } from '../shared/types';
import { hasChrome } from './useSites';

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
/** The panel cannot observe the page, so it asks again while it is open. */
const POLL_MS = 10_000;

export interface GuardView {
  active: boolean;
  reasons: GuardReason[];
}

const INACTIVE: GuardView = { active: false, reasons: [] };

function fromResponse(response: GuardStatusResponse | null): GuardView {
  if (!response?.ok) return INACTIVE;
  const reasons = response.reasons.filter((reason): reason is GuardReason => REASONS.includes(reason as GuardReason));
  return { active: response.active === true, reasons };
}

/** Assessment guard verdict for the open Moodle tabs (ML-022); study help stays paused while active. */
export function useGuard(): GuardView {
  const [view, setView] = useState<GuardView>(INACTIVE);
  useEffect(() => {
    if (!hasChrome) return;
    let live = true;
    const ask = () => {
      void chrome.runtime
        .sendMessage({ type: 'GET_GUARD' })
        .then((response) => live && setView(fromResponse(response as GuardStatusResponse | null)))
        .catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') ask();
    };
    ask();
    const timer = window.setInterval(ask, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return view;
}
