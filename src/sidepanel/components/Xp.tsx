import { useEffect, useState, type ReactNode } from 'react';
import { Flame, Trophy } from 'lucide-react';
import type { XpView } from '../../shared/types';
import { MAX_WEEKLY_GOAL } from '../../shared/xp';
import { hasChrome } from '../useSites';
import { Button, Card, CardTitle, Field, Hint, Input, ProgressBar } from '../ui';
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

  const stats: { label: string; value: ReactNode }[] = [
    { label: translate('xpToday'), value: view.today },
    {
      label: translate('xpStreak'),
      value: (
        <span className="inline-flex items-center gap-1">
          <Flame size={14} className="text-warning" aria-hidden="true" />
          {view.streak}
        </span>
      )
    },
    { label: translate('xpLongest'), value: view.longestStreak }
  ];

  return (
    <Card className="space-y-3">
      <CardTitle
        icon={Trophy}
        tone="yellow"
        actions={
          <span className="text-xs text-ink-2 tabular-nums">
            {view.totalXp} {translate('xpTotal')}
          </span>
        }
      >
        {translate('xpLevel')} {view.level}
      </CardTitle>
      <ProgressBar value={levelPercent} label={translate('xpLevel')} />
      <Hint faint>{translate('xpLabel')}</Hint>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse rounded-lg bg-well px-2 py-2">
            <dt className="text-[11px] text-ink-2">{stat.label}</dt>
            <dd className="text-lg leading-tight font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-xs">
          {translate('xpWeekProgress')}: <span className="font-semibold">{view.weeklyEarned}</span>
          {view.weeklyGoal > 0 ? `/${view.weeklyGoal} (${goalPercent}%)` : ` · ${translate('xpNoGoal')}`}
        </p>
        {view.weeklyGoal > 0 && <ProgressBar value={goalPercent} tone="success" label={translate('xpWeekProgress')} />}
        <Field label={translate('xpWeeklyGoal')}>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={MAX_WEEKLY_GOAL}
              step={10}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              className="flex-1"
            />
            <Button size="md" onClick={() => void save()}>
              {translate('xpGoalSave')}
            </Button>
          </div>
        </Field>
      </div>
    </Card>
  );
}
