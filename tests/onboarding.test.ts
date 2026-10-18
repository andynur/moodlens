// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t, type TranslationKey } from '../src/shared/i18n';
import type { Locale } from '../src/shared/types';
import { Onboarding } from '../src/sidepanel/components/Onboarding';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
function render(locale: Locale, onDone: () => void) {
  container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(createElement(Onboarding, { translate: (key: TranslationKey) => t(locale, key), onDone })));
  return root;
}
function click(label: string) {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
  if (!button) throw new Error(`no button ${label}`);
  act(() => button.click());
}
const heading = () => container.querySelector('h2')?.textContent;

afterEach(() => container.remove());

describe('onboarding (PRD-007)', () => {
  it('walks through three screens and finishes', () => {
    const onDone = vi.fn();
    render('en', onDone);
    expect(heading()).toBe(t('en', 'onboardingDoesTitle'));
    click('Next');
    expect(heading()).toBe(t('en', 'onboardingNeverTitle'));
    click('Back');
    expect(heading()).toBe(t('en', 'onboardingDoesTitle'));
    click('Next');
    click('Next');
    expect(heading()).toBe(t('en', 'onboardingEnableTitle'));
    expect(onDone).not.toHaveBeenCalled();
    click('Get started');
    expect(onDone).toHaveBeenCalledOnce();
  });
  it('can be skipped and renders in Indonesian', () => {
    const onDone = vi.fn();
    render('id', onDone);
    expect(heading()).toBe('Apa yang dilakukan Moodlens');
    click('Lewati');
    expect(onDone).toHaveBeenCalledOnce();
  });
});
