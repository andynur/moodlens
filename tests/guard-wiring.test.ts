// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChromeStub } from './chrome-stub';

const A = 'https://moodle-a.example.edu';
const stub = createChromeStub();
const page: chrome.runtime.MessageSender = { id: 'moodlens-test' };

beforeAll(async () => {
  vi.stubGlobal('chrome', stub.chromeStub);
  await import('../src/background/index');
});
beforeEach(() => stub.reset());

async function enable(origin: string) {
  stub.granted.add(`${origin}/*`);
  return stub.send({ type: 'ENABLE_SITE', origin }, page);
}
function fromTab(id: number, url: string): chrome.runtime.MessageSender {
  return { id: 'moodlens-test', tab: { id } as chrome.tabs.Tab, url, origin: new URL(url).origin };
}
function report(url: string, reasons: string[], tabId = 11) {
  return stub.send(
    {
      type: 'GUARD_STATE',
      payload: { active: reasons.length > 0, reasons, practiceCaptureAllowed: false }
    },
    fromTab(tabId, url)
  );
}
const guard = () => stub.send({ type: 'GET_GUARD' }, page);

describe('guard reports', () => {
  it('refuses reports from tabs of sites that are not registered', async () => {
    await expect(report(`${A}/course/view.php?id=5`, [])).resolves.toEqual({ ok: false });
  });

  it('refuses GET_GUARD from anything but a trusted extension page', async () => {
    await enable(A);
    await expect(guard()).resolves.toMatchObject({ ok: true });
    await expect(stub.send({ type: 'GET_GUARD' }, fromTab(11, `${A}/my/`))).resolves.toEqual({ ok: false });
  });

  it('reports a quiz attempt page of an open tab as active', async () => {
    await enable(A);
    const url = `${A}/mod/quiz/attempt.php?attempt=4`;
    stub.state.tabs = [{ id: 11, url } as chrome.tabs.Tab];
    await report(url, ['quiz-attempt']);
    await expect(guard()).resolves.toEqual({ ok: true, active: true, reasons: ['quiz-attempt'] });
  });

  it('stays inactive for an ordinary course page', async () => {
    await enable(A);
    const url = `${A}/course/view.php?id=5`;
    stub.state.tabs = [{ id: 11, url } as chrome.tabs.Tab];
    await report(url, []);
    await expect(guard()).resolves.toEqual({ ok: true, active: false, reasons: [] });
  });

  it('judges a tab by its address when no report matches it', async () => {
    await enable(A);
    stub.state.tabs = [{ id: 12, url: `${A}/mod/lesson/view.php?id=3` } as chrome.tabs.Tab];
    await expect(guard()).resolves.toEqual({ ok: true, active: true, reasons: ['lesson'] });
  });

  it('ignores a report once its tab navigated away, and drops it', async () => {
    await enable(A);
    const attempt = `${A}/mod/quiz/attempt.php?attempt=4`;
    stub.state.tabs = [{ id: 11, url: attempt } as chrome.tabs.Tab];
    await report(attempt, ['quiz-attempt']);
    stub.state.tabs = [{ id: 11, url: `${A}/my/` } as chrome.tabs.Tab];
    await expect(guard()).resolves.toEqual({ ok: true, active: false, reasons: [] });
    stub.state.tabs = [{ id: 11, url: attempt } as chrome.tabs.Tab];
    // The stale report is gone, so only the address decides, which keeps the page paused.
    await expect(guard()).resolves.toEqual({ ok: true, active: true, reasons: ['quiz-attempt'] });
  });

  it('pauses study help while any site tab is in an assessment, not only the active one', async () => {
    await enable(A);
    stub.state.tabs = [
      { id: 11, url: `${A}/my/` } as chrome.tabs.Tab,
      { id: 12, url: `${A}/mod/quiz/review.php?attempt=4` } as chrome.tabs.Tab
    ];
    await report(`${A}/my/`, [], 11);
    await expect(guard()).resolves.toEqual({ ok: true, active: true, reasons: ['quiz-review-unfinished'] });
  });

  it('treats a malformed report as an active assessment', async () => {
    await enable(A);
    const url = `${A}/my/`;
    stub.state.tabs = [{ id: 11, url } as chrome.tabs.Tab];
    await stub.send({ type: 'GUARD_STATE', payload: { active: false, reasons: ['nope'] } }, fromTab(11, url));
    await expect(guard()).resolves.toEqual({ ok: true, active: true, reasons: ['parse-error'] });
  });

  it('forgets reports when all local data is cleared', async () => {
    await enable(A);
    const url = `${A}/mod/quiz/attempt.php?attempt=4`;
    stub.state.tabs = [{ id: 11, url } as chrome.tabs.Tab];
    await report(url, ['quiz-attempt']);
    await stub.send({ type: 'CLEAR_LOCAL_DATA' }, page);
    stub.state.tabs = [{ id: 11, url: `${A}/my/` } as chrome.tabs.Tab];
    await expect(guard()).resolves.toEqual({ ok: true, active: false, reasons: [] });
  });
});

describe('guard banner', () => {
  it('renders nothing while the guard is inactive and names every reason while it is active', async () => {
    const { act, createElement } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { GuardBanner } = await import('../src/sidepanel/components/GuardBanner');
    const { t } = await import('../src/shared/i18n');
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const translate = (key: Parameters<typeof t>[1]) => t('id', key);

    act(() => root.render(createElement(GuardBanner, { guard: { active: false, reasons: [] }, translate })));
    expect(container.textContent).toBe('');

    act(() =>
      root.render(
        createElement(GuardBanner, { guard: { active: true, reasons: ['quiz-attempt', 'timer'] }, translate })
      )
    );
    expect(container.textContent).toContain(t('id', 'guardPaused'));
    expect(container.textContent).toContain(t('id', 'guardReasonQuizAttempt'));
    expect(container.textContent).toContain(t('id', 'guardReasonTimer'));
    expect(container.querySelectorAll('button')).toHaveLength(0);
    act(() => root.unmount());
  });
});
