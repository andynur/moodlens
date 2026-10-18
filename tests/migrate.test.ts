// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { migrateStorage, SCHEMA_VERSION } from '../src/background/migrate';
import { parseCourse } from '../src/content/moodle/adapter';
import { createChromeStub } from './chrome-stub';

const LEGACY = 'https://solusi.sibermu.ac.id';
const NOW = new Date('2026-10-18T00:00:00Z');

function legacySnapshot() {
  const doc = new DOMParser().parseFromString(
    `<h1>Course</h1><li class="activity"><a href="${LEGACY}/mod/quiz/view.php?id=9">Quiz</a></li>`,
    'text/html'
  );
  return parseCourse(doc, `${LEGACY}/course/view.php?id=5`)!;
}

describe('storage migration from v0.2', () => {
  it('makes SiberMu the first site when v0.2 data exists and keeps preferences', async () => {
    const { chromeStub, local } = createChromeStub();
    const snapshot = legacySnapshot();
    local.set('lastCourseSnapshot', snapshot);
    local.set('locale', 'id');
    await migrateStorage(chromeStub.storage.local, NOW);
    expect(local.get('schemaVersion')).toBe(SCHEMA_VERSION);
    expect(local.get('sites')).toEqual([
      { id: 'solusi.sibermu.ac.id', origin: LEGACY, label: 'solusi.sibermu.ac.id', enabledAt: NOW.toISOString() }
    ]);
    expect(local.get('site:solusi.sibermu.ac.id:lastCourseSnapshot')).toEqual(snapshot);
    expect(local.has('lastCourseSnapshot')).toBe(false);
    expect(local.get('locale')).toBe('id');
  });
  it('starts with no site on a fresh install or with invalid v0.2 data', async () => {
    const { chromeStub, local } = createChromeStub();
    local.set('lastCourseSnapshot', { courseId: 'x' });
    await migrateStorage(chromeStub.storage.local, NOW);
    expect(local.get('sites')).toEqual([]);
    expect(local.has('lastCourseSnapshot')).toBe(false);
  });
  it('is idempotent once the schema is current', async () => {
    const { chromeStub, local } = createChromeStub();
    await migrateStorage(chromeStub.storage.local, NOW);
    local.set('lastCourseSnapshot', legacySnapshot());
    await migrateStorage(chromeStub.storage.local, NOW);
    expect(local.get('sites')).toEqual([]);
  });
});
