import { describe, expect, it } from 'vitest';
import { cleanLabel, isSite, normalizeSiteOrigin, siteIdFor } from '../src/shared/sites';

describe('site origins', () => {
  it('normalizes HTTPS addresses to an origin', () => {
    expect(normalizeSiteOrigin(' https://Moodle.Example.edu/course/view.php?id=1 ')).toBe('https://moodle.example.edu');
    expect(normalizeSiteOrigin('moodle.example.edu')).toBe('https://moodle.example.edu');
    expect(normalizeSiteOrigin('https://moodle.example.edu:8443/')).toBe('https://moodle.example.edu:8443');
  });
  it('refuses HTTP, credentials, other schemes and hosts without a domain', () => {
    for (const input of [
      'http://moodle.example.edu',
      'https://user:pw@moodle.example.edu',
      'chrome://extensions',
      'javascript:alert(1)',
      'https://localhost',
      ''
    ]) {
      expect(normalizeSiteOrigin(input), input).toBeNull();
    }
  });
  it('derives ids and validates registry entries', () => {
    expect(siteIdFor('https://moodle.example.edu:8443')).toBe('moodle.example.edu:8443');
    const site = {
      id: 'moodle.example.edu',
      origin: 'https://moodle.example.edu',
      label: 'Campus',
      enabledAt: '2026-10-18T00:00:00Z'
    };
    expect(isSite(site)).toBe(true);
    expect(isSite({ ...site, id: 'evil.example' })).toBe(false);
    expect(isSite({ ...site, origin: 'http://moodle.example.edu' })).toBe(false);
    expect(isSite({ ...site, detection: 'maybe' })).toBe(false);
    expect(cleanLabel('x'.repeat(61))).toBeNull();
  });
});
