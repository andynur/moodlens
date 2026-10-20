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

function renderToday(
  sites: Site[],
  entries: CourseEntry[],
  extra: { tasks?: MoodleTask[]; courseNames?: Map<string, string>; onOpenTasks?: () => void } = {}
) {
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
  tasks.push(...(extra.tasks ?? []));
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
        onNotice: vi.fn(),
        courseNames: extra.courseNames ?? new Map(),
        onOpenTasks: extra.onOpenTasks ?? vi.fn()
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

function task(owner: Site, courseId: string, hours: number, title: string): MoodleTask {
  return {
    siteId: owner.id,
    courseId,
    title,
    dueAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
    url: `${owner.origin}/mod/assign/view.php?id=9`,
    kind: 'assign',
    status: hours < 0 ? 'overdue' : 'open',
    source: 'ajax'
  };
}

describe('Today due soon', () => {
  it('shows a get-started guide instead of empty widgets when no site is enabled', () => {
    renderToday([], []);

    expect(container.textContent).toContain(t('en', 'startTitle'));
    expect(container.textContent).not.toContain(t('en', 'dueSoon'));
  });

  it('links overdue tasks to the Tasks page', () => {
    const only = site('only', 'Only Moodle');
    const onOpenTasks = vi.fn();
    renderToday([only], [], { tasks: [task(only, '10', -5, 'Late report')], onOpenTasks });

    const link = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(t('en', 'viewTasks'))
    );
    expect(link?.textContent).toContain(`${t('en', 'overdueLabel')}: 1`);
    act(() => link?.click());
    expect(onOpenTasks).toHaveBeenCalledOnce();
  });

  it('names the course from task data when no snapshot exists', () => {
    const only = site('only', 'Only Moodle');
    renderToday([only], [], {
      tasks: [task(only, '30', 48, 'Quiz two')],
      courseNames: new Map([['only/30', 'Databases']])
    });

    expect(container.textContent).toContain('Quiz two');
    expect(container.textContent).toContain('Databases');
  });
});
