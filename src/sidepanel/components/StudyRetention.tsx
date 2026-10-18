import { useEffect, useState } from 'react';
import {
  DEFAULT_REVIEW_LOG_RETENTION,
  normalizeRetention,
  REVIEW_LOG_RETENTION_DAYS,
  STUDY_RETENTION_KEY,
  type ReviewLogRetention
} from '../../shared/cards';
import type { TranslationKey } from '../../shared/i18n';
import { hasChrome } from '../useSites';

const LABELS: Record<ReviewLogRetention, TranslationKey> = {
  90: 'studyRetention90',
  365: 'studyRetention365',
  730: 'studyRetention730'
};

/** Review-log retention control (D-014). Saving prunes older logs at once. */
export function StudyRetentionSettings({
  translate,
  onNotice,
  onError
}: {
  translate: (key: TranslationKey) => string;
  onNotice: (key: TranslationKey) => void;
  onError: (key: TranslationKey) => void;
}) {
  const [days, setDays] = useState<ReviewLogRetention>(DEFAULT_REVIEW_LOG_RETENTION);
  useEffect(() => {
    if (!hasChrome) return;
    void chrome.storage.local
      .get(STUDY_RETENTION_KEY)
      .then((values) => setDays(normalizeRetention(values[STUDY_RETENTION_KEY])))
      .catch(() => undefined);
    // Read once per mount; a read that fails leaves the default shown, and saving still works.
  }, []);

  async function save(next: ReviewLogRetention) {
    setDays(next);
    const response = (await chrome.runtime
      .sendMessage({ type: 'SET_STUDY_RETENTION', days: next })
      .catch(() => null)) as { ok?: boolean } | null;
    if (response?.ok) onNotice('studyRetentionSaved');
    else onError('siteActionError');
  }

  return (
    <label className="block text-xs font-semibold">
      {translate('studyRetention')}
      <select
        value={days}
        onChange={(event) => void save(normalizeRetention(Number(event.target.value)))}
        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"
      >
        {REVIEW_LOG_RETENTION_DAYS.map((option) => (
          <option key={option} value={option}>
            {translate(LABELS[option])}
          </option>
        ))}
      </select>
      <p className="mt-1 font-normal text-slate-500 dark:text-slate-400">{translate('studyRetentionHint')}</p>
    </label>
  );
}
