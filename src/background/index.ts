import type { CourseSnapshot, SnapshotResponse } from '../shared/types';
import { isCourseSnapshot, isCourseUrl, canonicalCourseUrl } from '../shared/validation';

const SNAPSHOT_KEY = 'lastCourseSnapshot';

// Keep extension local/session storage inaccessible to lower-trust content scripts.
void chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
void chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse: (value: SnapshotResponse) => void) => {
  if (!raw || typeof raw !== 'object') return false;
  const type = (raw as { type?: unknown }).type;

  if (type === 'COURSE_SNAPSHOT') {
    // Only accept content-script messages from the exact authorized LMS course URL.
    if (!sender.tab || !sender.url || !isCourseUrl(sender.url)) {
      sendResponse({ ok: false, snapshot: null });
      return false;
    }
    const payload = (raw as { payload?: unknown }).payload;
    if (!isCourseSnapshot(payload) || payload.sourceUrl !== canonicalCourseUrl(sender.url)) {
      sendResponse({ ok: false, snapshot: null });
      return false;
    }
    void chrome.storage.local.set({ [SNAPSHOT_KEY]: payload }).then(() => {
      sendResponse({ ok: true, snapshot: payload });
    }).catch(() => sendResponse({ ok: false, snapshot: null }));
    return true;
  }
  if (type === 'GET_COURSE_SNAPSHOT') {
    // Requests must originate from a trusted extension page, never from LMS content scripts.
    if (sender.tab || sender.id !== chrome.runtime.id) {
      sendResponse({ ok: false, snapshot: null });
      return false;
    }
    void chrome.storage.local.get(SNAPSHOT_KEY).then((value) => {
      const snapshot: CourseSnapshot | null = isCourseSnapshot(value[SNAPSHOT_KEY])
        ? value[SNAPSHOT_KEY] : null;
      sendResponse({ ok: true, snapshot });
    }).catch(() => sendResponse({ ok: false, snapshot: null }));
    return true;
  }
  return false;
});
