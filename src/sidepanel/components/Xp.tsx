import { useEffect, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import type { XpView } from '../../shared/types';
import { MAX_WEEKLY_GOAL } from '../../shared/xp';
import { hasChrome } from '../useSites';
import { smallButton } from './CourseDetail';
import type { Feedback } from './Sites';

/** XP state, reloaded whenever `refresh` changes (after a review, a session or a saved goal). */
export function useXpView(refresh: number): XpView | null {
  const [view, setView] = useState<XpView | null>(null);
  useEffect(() => {
    if (!hasChrome) return;
    let live = true;
    void chrome.runtime
      .sendMessage({ type: 'XP_STATE' })
      .then((response) => {
        const next = response as XpView | null;
        if (live && next?.ok) setView(next);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [refresh]);
  return view;
}

/** Local XP, level, streak and weekly goal (ML-021). Labeled as Moodlens XP, never a Moodle grade. */
export function XpCard({ view, refreshed, ...feedback }: Feedback & { view: XpView; refreshed: () => void }) {
  const { translate } = feedback;
  const [goal, setGoal] = useState(String(view.weeklyGoal));
  const span = Math.max(1, view.nextLevelXp - view.levelStartXp);
  const levelPercent = Math.min(100, Math.round(((view.totalXp - view.levelStartXp) / span) * 100));
  const goalPercent = view.weeklyGoal > 0 ? Math.min(100, Math.round((view.weeklyEarned / view.weeklyGoal) * 100)) : 0;

  async function save() {
    const parsed = Number(goal);
    if (!Number.isFinite(parsed)) return;
    const response = (await chrome.runtime
      .sendMessage({ type: 'SET_WEEKLY_GOAL', goal: Math.min(MAX_WEEKLY_GOAL, Math.max(0, Math.round(parsed))) })
      .catch(() => null)) as { ok?: boolean } | null;
    if (response?.ok) {
      feedback.onNotice('xpGoalSaved');
      refreshed();
    } else feedback.onError('siteActionError');
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Trophy size={16} className="text-blue-600" />
        <h3 className="text-sm font-bold">
          {translate('xpLevel')} {view.level}
        </h3>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          {view.totalXp} {translate('xpTotal')}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={levelPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={translate('xpLevel')}
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div className="h-full bg-blue-600 motion-safe:transition-all" style={{ width: `${levelPercent}%` }} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{translate('xpLabel')}</p>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{translate('xpToday')}</dt>
          <dd className="font-semibold">{view.today}</dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{translate('xpStreak')}</dt>
          <dd className="flex items-center gap-1 font-semibold">
            <Flame size={13} className="text-amber-600" />
            {view.streak}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{translate('xpLongest')}</dt>
          <dd className="font-semibold">{view.longestStreak}</dd>
        </div>
      </dl>
      <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <p className="text-xs">
          {translate('xpWeekProgress')}: {view.weeklyEarned}
          {view.weeklyGoal > 0 ? `/${view.weeklyGoal} (${goalPercent}%)` : ` · ${translate('xpNoGoal')}`}
        </p>
        <label className="block text-xs font-semibold">
          {translate('xpWeeklyGoal')}
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min={0}
              max={MAX_WEEKLY_GOAL}
              step={10}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"
            />
            <button type="button" className={smallButton} onClick={() => void save()}>
              {translate('xpGoalSave')}
            </button>
          </div>
        </label>
      </div>
    </section>
  );
}
