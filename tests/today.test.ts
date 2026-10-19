// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t, type TranslationKey } from '../src/shared/i18n';
import type { MoodleTask, Site } from '../src/shared/types';
import type { CourseEntry } from '../src/sidepanel/courseEntries';
import { Today } from '../src/sidepanel/components/Today';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function site(id: string, label: string): Site {
  return { id, label, origin: `https://${id}.example`, enabledAt: '2026-10-19T00:00:00.000Z' };
}

function entry(owner: Site, courseId: string): CourseEntry {
  return {
    key: `${owner.id}/${courseId}`,
    site: owner,
    courseId,
    changes: [],
    prefs: { pinned: true },
    snapshot: {
      courseId,
      courseName: 'Shared course name',
      sourceUrl: `${owner.origin}/course/view.php?id=${courseId}`,
      capturedAt: '2026-10-19T00:00:00.000Z',
      activities: [
        {
          id: `${courseId}-activity`,
          courseId,
          title: 'Reading',
          type: 'resource',
          url: `${owner.origin}/mod/resource/view.php?id=1`,
          restricted: false,
          completion: 'incomplete'
        }
      ]
    }
  };
}

function renderToday(sites: Site[], entries: CourseEntry[]) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const tasks: MoodleTask[] = entries.map((item, index) => ({
    siteId: item.site.id,
    courseId: item.courseId,
    title: `Task ${index + 1}`,
    dueAt: new Date(Date.now() + (index + 1) * 60_000).toISOString(),
    url: `${item.site.origin}/mod/assign/view.php?id=${index + 1}`,
    kind: 'assign',
    status: 'open',
    source: 'ajax'
  }));
  act(() =>
    root.render(
      createElement(Today, {
        sites,
        entries,
        tasks,
        locale: 'en',
        translate: (key: TranslationKey) => t('en', key),
        onSelect: vi.fn(),
        onError: vi.fn(),
        onNotice: vi.fn()
      })
    )
  );
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Today multi-site labels', () => {
  it('disambiguates matching course names with each site label', () => {
    const first = site('first', 'First Moodle');
    const second = site('second', 'Second Moodle');
    renderToday([first, second], [entry(first, '10'), entry(second, '20')]);

    const text = container.textContent ?? '';
    expect(text.match(/First Moodle/g)?.length).toBeGreaterThanOrEqual(3);
    expect(text.match(/Second Moodle/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('does not repeat a site label when only one site is enabled', () => {
    const only = site('only', 'Only Moodle');
    renderToday([only], [entry(only, '10')]);

    expect(container.textContent).not.toContain('Only Moodle');
  });
});
