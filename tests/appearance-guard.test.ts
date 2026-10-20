// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://moodle.example.test/course/view.php?id=7"}
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_CLASS, themeClass } from '../src/shared/appearance';

/** Loads the appearance content script fresh with a stubbed chrome runtime answering `appearance`. */
async function loadScript(appearance: unknown) {
  vi.resetModules();
  delete (globalThis as { moodlensAppearance?: true }).moodlensAppearance;
  document.documentElement.className = '';
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'moodlens',
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn().mockResolvedValue({ ok: true, appearance })
    }
  });
  await import('../src/content/appearance');
  await vi.waitFor(() => expect(chrome.runtime.sendMessage).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('appearance script and the assessment guard (PRD-009 AC 7)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('applies the preset on an ordinary course page', async () => {
    history.replaceState(null, '', '/course/view.php?id=7');
    await loadScript({ theme: 'clean', largeText: true });
    expect(document.documentElement.classList.contains(THEME_CLASS)).toBe(true);
    expect(document.documentElement.classList.contains(themeClass('clean'))).toBe(true);
  });

  it('keeps the preset off on a quiz attempt but keeps the other options', async () => {
    history.replaceState(null, '', '/mod/quiz/attempt.php?attempt=1');
    await loadScript({ theme: 'clean', largeText: true });
    expect(document.documentElement.classList.contains(THEME_CLASS)).toBe(false);
    expect(document.documentElement.classList.contains('moodlens-large-text')).toBe(true);
  });

  it('keeps the preset off when the page shows a quiz timer', async () => {
    history.replaceState(null, '', '/mod/quiz/view.php?id=3');
    document.body.innerHTML = '<div id="quiz-timer-wrapper"></div>';
    await loadScript({ theme: 'sepia' });
    expect(document.documentElement.classList.contains(themeClass('sepia'))).toBe(false);
    document.body.innerHTML = '';
  });
});
