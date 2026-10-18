import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup, parseBackupText } from '../src/shared/backup';
import type { CourseSnapshot, Site } from '../src/shared/types';

const ORIGIN = 'https://moodle.example.edu';
const site: Site = { id: 'moodle.example.edu', origin: ORIGIN, label: 'Campus', enabledAt: '2026-10-01T00:00:00.000Z' };
const snapshot: CourseSnapshot = {
  courseId: '7',
  courseName: 'Course',
  sourceUrl: `${ORIGIN}/course/view.php?id=7`,
  capturedAt: '2026-10-02T00:00:00.000Z',
  activities: []
};
const stored = {
  schemaVersion: 2,
  locale: 'id',
  theme: 'dark',
  dashboard: { order: ['progress', 'whatsNew', 'pinned'], hidden: [] },
  sites: [site],
  'site:moodle.example.edu:lastCourseSnapshot': snapshot,
  'site:moodle.example.edu:snapshots': { '7': { history: [snapshot], seen: true } },
  'site:moodle.example.edu:courses': { '7': { pinned: true, color: 'green' } },
  apiKey: 'sk-never-exported',
  'site:other.example.edu:courses': {}
};
const NOW = new Date('2026-10-19T00:00:00.000Z');

describe('backup (ML-023 part 2)', () => {
  it('exports only allowlisted, valid keys', () => {
    const backup = createBackup(stored, NOW);
    expect(backup).toMatchObject({ format: 'moodlens-backup', version: 1, exportedAt: NOW.toISOString() });
    expect(Object.keys(backup.data).sort()).toEqual([
      'dashboard',
      'locale',
      'site:moodle.example.edu:courses',
      'site:moodle.example.edu:lastCourseSnapshot',
      'site:moodle.example.edu:snapshots',
      'sites',
      'theme'
    ]);
  });
  it('round-trips through JSON to the same data', () => {
    const backup = createBackup(stored, NOW);
    const parsed = parseBackupText(JSON.stringify(backup));
    expect(parsed?.data).toEqual(backup.data);
    expect(parsed?.preview).toEqual({ exportedAt: NOW.toISOString(), sites: 1, courses: 1 });
  });
  it('rejects invalid files', () => {
    const backup = createBackup(stored, NOW);
    expect(parseBackupText('not json')).toBeNull();
    expect(parseBackupText('x'.repeat(5_000_001))).toBeNull();
    expect(parseBackup({ ...backup, format: 'other' })).toBeNull();
    expect(parseBackup({ ...backup, version: 2 })).toBeNull();
    expect(parseBackup({ ...backup, data: { ...backup.data, apiKey: 'x' } })).toBeNull();
    expect(parseBackup({ ...backup, data: { ...backup.data, theme: 'neon' } })).toBeNull();
    expect(parseBackup({ ...backup, data: { ...backup.data, 'site:unknown.example:courses': {} } })).toBeNull();
    const foreign = { ...snapshot, sourceUrl: 'https://evil.example/course/view.php?id=7' };
    expect(
      parseBackup({ ...backup, data: { ...backup.data, 'site:moodle.example.edu:lastCourseSnapshot': foreign } })
    ).toBeNull();
    expect(parseBackup({ ...backup, data: { ...backup.data, sites: [site, site] } })).toBeNull();
  });
});
