import { vi } from 'vitest';

type Listener = (raw: unknown, sender: chrome.runtime.MessageSender, respond: (value: unknown) => void) => boolean;
type Script = chrome.scripting.RegisteredContentScript;

function area(store: Map<string, unknown>) {
  const pick = (keys: string | string[] | null) => {
    if (keys === null) return Object.fromEntries(store);
    const list = typeof keys === 'string' ? [keys] : keys;
    return Object.fromEntries(
      list.filter((key) => store.has(key)).map((key) => [key, structuredClone(store.get(key))])
    );
  };
  return {
    get: vi.fn((keys: string | string[] | null) => Promise.resolve(pick(keys))),
    set: vi.fn((items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) store.set(key, structuredClone(value));
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      for (const key of typeof keys === 'string' ? [keys] : keys) store.delete(key);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
    setAccessLevel: () => Promise.resolve()
  };
}

/** In-memory stand-in for the extension APIs the background uses. Install before importing it. */
export function createChromeStub() {
  const local = new Map<string, unknown>();
  const granted = new Set<string>();
  const scripts = new Map<string, Script>();
  const alarms = new Map<string, chrome.alarms.Alarm>();
  const state = {
    listener: undefined as Listener | undefined,
    activeTab: undefined as chrome.tabs.Tab | undefined,
    detection: { isMoodle: true, confidence: 'high', versionHint: '4.x' } as unknown
  };
  const executeScript = vi.fn((injection: { func?: unknown; files?: string[] }) =>
    Promise.resolve(injection.func ? [{ result: state.detection }] : [{ result: undefined }])
  );
  const chromeStub = {
    runtime: {
      id: 'moodlens-test',
      onInstalled: { addListener: () => undefined },
      onStartup: { addListener: () => undefined },
      onMessage: {
        addListener: (fn: Listener) => {
          state.listener = fn;
        }
      }
    },
    sidePanel: { setPanelBehavior: () => Promise.resolve() },
    alarms: {
      onAlarm: { addListener: () => undefined },
      getAll: () => Promise.resolve([...alarms.values()]),
      create: vi.fn((name: string, info: chrome.alarms.AlarmCreateInfo) => {
        alarms.set(name, { name, scheduledTime: info.when ?? Date.now(), persistAcrossSessions: true });
        return Promise.resolve();
      }),
      clear: vi.fn((name: string) => Promise.resolve(alarms.delete(name)))
    },
    notifications: { create: vi.fn(() => Promise.resolve('notification')) },
    storage: { local: area(local), session: area(new Map()) },
    permissions: {
      onAdded: { addListener: () => undefined },
      onRemoved: { addListener: () => undefined },
      contains: ({ origins = [] }: { origins?: string[]; permissions?: string[] }) =>
        Promise.resolve(origins.every((o) => granted.has(o))),
      remove: vi.fn(({ origins = [] }: { origins?: string[] }) => {
        for (const origin of origins) granted.delete(origin);
        return Promise.resolve(true);
      }),
      getAll: () => Promise.resolve({ origins: [...granted] })
    },
    scripting: {
      getRegisteredContentScripts: () => Promise.resolve([...scripts.values()]),
      registerContentScripts: vi.fn((list: Script[]) => {
        for (const script of list) scripts.set(script.id, script);
        return Promise.resolve();
      }),
      unregisterContentScripts: vi.fn(({ ids = [] }: { ids?: string[] }) => {
        for (const id of ids) scripts.delete(id);
        return Promise.resolve();
      }),
      executeScript
    },
    tabs: { query: () => Promise.resolve(state.activeTab ? [state.activeTab] : []) }
  };
  function send(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
    return new Promise((resolve) => {
      if (!state.listener!(message, sender, resolve)) resolve(undefined);
    });
  }
  function reset() {
    local.clear();
    granted.clear();
    scripts.clear();
    alarms.clear();
    state.activeTab = undefined;
    state.detection = { isMoodle: true, confidence: 'high', versionHint: '4.x' };
    vi.clearAllMocks();
  }
  return { chromeStub, local, granted, scripts, state, send, reset, executeScript };
}
