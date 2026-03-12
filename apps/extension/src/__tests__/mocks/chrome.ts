// Chrome API mock shim for extension unit tests
// Covers: chrome.storage.local, chrome.runtime, chrome.action, chrome.alarms, chrome.cookies

export const chromeMock = {
  storage: {
    local: {
      get: async (_keys: string | string[] | Record<string, unknown>) =>
        ({}) as Record<string, unknown>,
      set: async (_items: Record<string, unknown>) => {},
      remove: async (_keys: string | string[]) => {},
    },
  },
  runtime: {
    sendMessage: async (_message: unknown) => null as unknown,
    onMessage: {
      addListener: (_fn: unknown) => {},
    },
    onInstalled: {
      addListener: (_fn: unknown) => {},
    },
  },
  action: {
    setIcon: async (_details: {
      tabId?: number;
      path: Record<string, string>;
    }) => {},
  },
  alarms: {
    create: async (_name: string, _config: unknown) => {},
    get: async (_name: string) => null,
    onAlarm: {
      addListener: (_fn: unknown) => {},
    },
  },
  cookies: {
    get: async (_details: { url: string; name: string }) =>
      null as { value: string } | null,
  },
};

// Install as global for tests that import chrome directly
(globalThis as unknown as Record<string, unknown>).chrome = chromeMock;
