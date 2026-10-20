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
  THEME_CLASS,
  THEME_PRESETS,
  themeClass,
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

describe('theme presets (ML-018, PRD-009 AC 7)', () => {
  it('accepts only the fixed presets', () => {
    expect(cleanAppearance({ theme: 'sepia', dark: true })).toEqual({ dark: true, theme: 'sepia' });
    expect(cleanAppearance({ theme: 'neon' })).toBeNull();
    expect(cleanAppearance({ theme: 1 })).toBeNull();
    expect(isAppearancePrefs({ theme: 'contrast' })).toBe(true);
  });
  it('switches presets idempotently and restores the root exactly', () => {
    const root = document.createElement('html');
    root.className = 'theme-own';
    const before = root.outerHTML;
    applyAppearance(root, { theme: 'clean' });
    applyAppearance(root, { theme: 'clean' });
    expect(root.className).toBe(`theme-own ${THEME_CLASS} ${themeClass('clean')}`);
    applyAppearance(root, { theme: 'contrast' });
    expect(root.classList.contains(themeClass('clean'))).toBe(false);
    expect(root.classList.contains(themeClass('contrast'))).toBe(true);
    applyAppearance(root, {});
    expect(root.outerHTML).toBe(before);
  });
  it('keeps the preset off while the assessment guard is active, other options unchanged', () => {
    const root = document.createElement('html');
    applyAppearance(root, { theme: 'sepia', largeText: true }, true);
    expect(root.classList.contains(THEME_CLASS)).toBe(false);
    expect(root.classList.contains(themeClass('sepia'))).toBe(false);
    expect(root.classList.contains(APPEARANCE_CLASS.largeText)).toBe(true);
    applyAppearance(root, { theme: 'sepia', largeText: true }, false);
    expect(root.classList.contains(themeClass('sepia'))).toBe(true);
  });
  it('defines every token per preset with AA contrast for text, links and buttons', () => {
    const css = readFileSync('public/appearance.css', 'utf8');
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi! + 0.05) / (lo! + 0.05);
    };
    for (const preset of THEME_PRESETS) {
      const block = new RegExp(`html\\.${themeClass(preset)} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      const token = (name: string) => new RegExp(`--ml-${name}: (#[0-9a-f]{6});`).exec(block)?.[1] ?? '';
      for (const name of ['bg', 'surface', 'ink', 'ink-2', 'line', 'accent', 'on-accent']) {
        expect(token(name), `${preset} --ml-${name}`).toMatch(/^#[0-9a-f]{6}$/);
      }
      for (const surface of [token('bg'), token('surface')]) {
        for (const text of ['ink', 'ink-2', 'accent']) {
          expect(ratio(token(text), surface), `${preset} ${text}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(ratio(token('on-accent'), token('accent')), `${preset} button`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
