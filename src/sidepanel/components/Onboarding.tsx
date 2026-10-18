import { useState } from 'react';
import { Ban, Globe, Sparkles } from 'lucide-react';
import type { TranslationKey } from '../../shared/i18n';

export const ONBOARDED_KEY = 'onboarded';

const screens: { icon: typeof Sparkles; title: TranslationKey; points: TranslationKey[] }[] = [
  {
    icon: Sparkles,
    title: 'onboardingDoesTitle',
    points: ['onboardingDoes1', 'onboardingDoes2', 'onboardingDoes3']
  },
  {
    icon: Ban,
    title: 'onboardingNeverTitle',
    points: ['onboardingNever1', 'onboardingNever2', 'onboardingNever3']
  },
  {
    icon: Globe,
    title: 'onboardingEnableTitle',
    points: ['onboardingEnable1', 'onboardingEnable2', 'onboardingEnable3']
  }
];

/** First-run screens (PRD-007): what Moodlens does, what it never does, how to enable a site. */
export function Onboarding(props: { translate: (key: TranslationKey) => string; onDone: () => void }) {
  const { translate } = props;
  const [step, setStep] = useState(0);
  const screen = screens[step] ?? screens[0]!;
  const last = step === screens.length - 1;
  const button = 'rounded-lg px-3 py-2 text-xs font-semibold';
  return (
    <section
      aria-labelledby="onboarding-title"
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-2">
        <screen.icon size={20} className="text-blue-700 dark:text-blue-300" />
        <h2 id="onboarding-title" className="text-base font-bold">
          {translate(screen.title)}
        </h2>
      </div>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        {screen.points.map((point) => (
          <li key={point}>{translate(point)}</li>
        ))}
      </ul>
      <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {translate('onboardingStep')} {step + 1} / {screens.length}
      </p>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={props.onDone} className={`${button} text-slate-500 dark:text-slate-400`}>
          {translate('onboardingSkip')}
        </button>
        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className={`${button} border border-slate-200 dark:border-slate-700`}
            >
              {translate('onboardingBack')}
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? props.onDone() : setStep(step + 1))}
            className={`${button} bg-blue-700 text-white`}
          >
            {translate(last ? 'onboardingDone' : 'onboardingNext')}
          </button>
        </div>
      </div>
    </section>
  );
}
