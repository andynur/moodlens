import { useState } from 'react';
import { Ban, Check, Globe, Sparkles, X } from 'lucide-react';
import type { TranslationKey } from '../../shared/i18n';
import { Button, Card, cx, type Tone } from '../ui';

export const ONBOARDED_KEY = 'onboarded';

/** `never` screens list refusals, so their points get a cross instead of a check. */
const screens: {
  icon: typeof Sparkles;
  tone: Tone;
  title: TranslationKey;
  points: TranslationKey[];
  never?: boolean;
}[] = [
  {
    icon: Sparkles,
    tone: 'lavender',
    title: 'onboardingDoesTitle',
    points: ['onboardingDoes1', 'onboardingDoes2', 'onboardingDoes3']
  },
  {
    icon: Ban,
    tone: 'rose',
    title: 'onboardingNeverTitle',
    points: ['onboardingNever1', 'onboardingNever2', 'onboardingNever3'],
    never: true
  },
  {
    icon: Globe,
    tone: 'sky',
    title: 'onboardingEnableTitle',
    points: ['onboardingEnable1', 'onboardingEnable2', 'onboardingEnable3']
  }
];

const heroTone: Record<Tone, string> = {
  brand: 'bg-accent-soft text-accent-ink',
  neutral: 'bg-well text-ink-2',
  peach: 'bg-tint-peach text-on-peach',
  rose: 'bg-tint-rose text-on-rose',
  mint: 'bg-tint-mint text-on-mint',
  lavender: 'bg-tint-lavender text-on-lavender',
  sky: 'bg-tint-sky text-on-sky',
  yellow: 'bg-tint-yellow text-on-yellow'
};

/** First-run screens (PRD-007): what Moodlens does, what it never does, how to enable a site. */
export function Onboarding(props: { translate: (key: TranslationKey) => string; onDone: () => void }) {
  const { translate } = props;
  const [step, setStep] = useState(0);
  const screen = screens[step] ?? screens[0]!;
  const last = step === screens.length - 1;
  return (
    <Card aria-labelledby="onboarding-title" className="space-y-5">
      <div className={cx('grid h-12 w-12 place-items-center rounded-xl', heroTone[screen.tone])}>
        <screen.icon size={24} aria-hidden="true" />
      </div>
      <h2 id="onboarding-title" className="text-xl leading-snug font-semibold tracking-tight">
        {translate(screen.title)}
      </h2>
      <ul className="space-y-3 text-sm leading-relaxed">
        {screen.points.map((point) => (
          <li key={point} className="flex gap-2.5">
            {screen.never ? (
              <X size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-error-ink" />
            ) : (
              <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-accent-ink" />
            )}
            <span>{translate(point)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {screens.map((item, index) => (
          <span
            key={item.title}
            className={cx(
              'h-1.5 rounded-full transition-all duration-200',
              index === step ? 'w-5 bg-brand-700' : 'w-1.5 bg-line-strong'
            )}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {translate('onboardingStep')} {step + 1} / {screens.length}
      </p>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={props.onDone}>
          {translate('onboardingSkip')}
        </Button>
        <div className="flex gap-2">
          {step > 0 && (
            <Button size="md" onClick={() => setStep(step - 1)}>
              {translate('onboardingBack')}
            </Button>
          )}
          <Button variant="primary" size="md" onClick={() => (last ? props.onDone() : setStep(step + 1))}>
            {translate(last ? 'onboardingDone' : 'onboardingNext')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
