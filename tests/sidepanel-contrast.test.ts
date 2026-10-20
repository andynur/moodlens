import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// WCAG 2.2 AA (1.4.3) for the side panel's own text tokens, light and dark (v0.9 accessibility pass).
const css = readFileSync('src/sidepanel/styles.css', 'utf8');
const darkStart = css.indexOf('.dark {');
const lightCss = css.slice(0, darkStart);
const darkCss = css.slice(darkStart, css.indexOf('}', darkStart));

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--color-([\w-]+): (#[0-9a-f]{6});/g)].map((m) => [m[1]!, m[2]!]));
}
const light = tokens(lightCss);
const dark = { ...light, ...tokens(darkCss) };

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

const pairs: [string, string][] = [
  ...['ink', 'ink-2', 'ink-3'].flatMap((text) =>
    ['canvas', 'surface', 'well', 'accent-soft'].map((bg): [string, string] => [text, bg])
  ),
  ['accent-ink', 'canvas'],
  ['accent-ink', 'accent-soft'],
  ...['success', 'warning', 'error'].flatMap((tone): [string, string][] => [
    [`${tone}-ink`, 'canvas'],
    [`${tone}-ink`, `${tone}-soft`]
  ]),
  ...['peach', 'rose', 'mint', 'lavender', 'sky', 'yellow'].map((tint): [string, string] => [
    `on-${tint}`,
    `tint-${tint}`
  ])
];

describe('side panel colour tokens', () => {
  it.each([
    ['light', light],
    ['dark', dark]
  ])('meet 4.5:1 for every text and background pair (%s)', (_name, set) => {
    for (const [text, bg] of pairs) {
      expect(set[text], `--color-${text}`).toMatch(/^#[0-9a-f]{6}$/);
      expect(set[bg], `--color-${bg}`).toMatch(/^#[0-9a-f]{6}$/);
      expect(ratio(set[text]!, set[bg]!), `${text} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
