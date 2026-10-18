// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectMoodle, isDetection } from '../src/content/moodle/detect';

const DIR = join(process.cwd(), 'tests/fixtures/sibermu-2026-10');
function html(content: string): Document {
  return new DOMParser().parseFromString(content, 'text/html');
}

describe('Moodle detection', () => {
  for (const name of ['course-1.html', 'course-5.html', 'dashboard.html', 'my-courses.html']) {
    it(`detects SiberMu ${name} with high confidence and a 4.x hint`, () => {
      expect(detectMoodle(html(readFileSync(join(DIR, name), 'utf8')))).toEqual({
        isMoodle: true,
        confidence: 'high',
        versionHint: '4.x'
      });
    });
  }
  it('detects a login page from body markers and asset URLs', () => {
    const doc = html(`<html><head><script src="/lib/javascript.php/1/lib/javascript-static.js"></script></head>
      <body id="page-login-index" class="pagelayout-login path-login"></body></html>`);
    expect(detectMoodle(doc)).toEqual({ isMoodle: true, confidence: 'high' });
  });
  it('reports low confidence for a single strong marker', () => {
    expect(detectMoodle(html('<body><a href="/login/logout.php?sesskey=abc">Log out</a></body>'))).toEqual({
      isMoodle: true,
      confidence: 'low'
    });
  });
  it('reports none for an ordinary page', () => {
    const doc = html('<body id="page-home" class="home"><main id="content">News</main></body>');
    expect(detectMoodle(doc)).toEqual({ isMoodle: false, confidence: 'none' });
  });
  it('guards the value returned by executeScript', () => {
    expect(isDetection({ isMoodle: true, confidence: 'high', versionHint: '4.x' })).toBe(true);
    expect(isDetection({ isMoodle: true, confidence: 'none' })).toBe(false);
    expect(isDetection({ isMoodle: true, confidence: 'low', versionHint: '<img>' })).toBe(false);
    expect(isDetection(null)).toBe(false);
  });
  it('stays self-contained for chrome.scripting.executeScript', () => {
    // executeScript serializes the function source; it must not reference module-level bindings.
    const source = detectMoodle.toString();
    expect(source).not.toMatch(/\bimport\b|require\(|__vite|_detect/);
    expect(new Function(`return (${source})`)()(html('<body></body>'))).toEqual({
      isMoodle: false,
      confidence: 'none'
    });
  });
});
