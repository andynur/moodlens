// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  APPEARANCE_CLASS,
  applyAppearance,
  cleanAppearance,
  HIDE_ATTRIBUTE,
  HIDEABLE_BLOCKS,
  isAppearancePrefs,
  type AppearancePrefs
} from '../src/shared/appearance';

describe('appearance prefs (ML-018)', () => {
  it('cleans prefs and rejects unknown options or blocks', () => {
    expect(cleanAppearance({ dark: true, largeText: false, hideBlocks: ['badges', 'online_users'] })).toEqual({
      dark: true,
      hideBlocks: ['online_users', 'badges']
    });
    expect(cleanAppearance({ hideBlocks: [] })).toEqual({});
    expect(cleanAppearance({ hideBlocks: ['timeline'] })).toBeNull();
    expect(cleanAppearance({ hideBlocks: ['news_items'] })).toBeNull();
    expect(cleanAppearance({ customCss: 'body{}' })).toBeNull();
    expect(cleanAppearance({ dark: 'yes' })).toBeNull();
    expect(isAppearancePrefs({ dark: true })).toBe(true);
    expect(isAppearancePrefs({ dark: false })).toBe(false);
  });
  it('is idempotent and fully reversible on the root element', () => {
    const root = document.createElement('html');
    root.className = 'theme-own';
    root.setAttribute('lang', 'id');
    const before = root.outerHTML;
    const prefs: AppearancePrefs = {
      dark: true,
      largeText: true,
      comfortableWidth: true,
      hideBlocks: [...HIDEABLE_BLOCKS]
    };
    applyAppearance(root, prefs);
    const once = root.outerHTML;
    applyAppearance(root, prefs);
    expect(root.outerHTML).toBe(once);
    expect(root.classList.contains(APPEARANCE_CLASS.dark)).toBe(true);
    expect(root.getAttribute(HIDE_ATTRIBUTE)).toBe(HIDEABLE_BLOCKS.join(' '));
    applyAppearance(root, {});
    expect(root.outerHTML).toBe(before);
    expect(root.className).toBe('theme-own');
    expect(root.hasAttribute(HIDE_ATTRIBUTE)).toBe(false);
  });
  it('stylesheet scopes every rule to a Moodlens class or attribute and never targets notice blocks', () => {
    const css = readFileSync('public/appearance.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].flatMap((match) =>
      match[1]!.replace(/\([^)]*\)/g, '()').split(',')
    );
    for (const selector of selectors) expect(selector.trim()).toMatch(/^html(\.moodlens-|\[data-moodlens-hide)/);
    for (const forbidden of ['block_timeline', 'block_calendar_upcoming', 'block_news_items', 'alert', 'notif']) {
      expect(css).not.toContain(forbidden);
    }
  });
});
