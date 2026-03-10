const ALARM_NAME = "score-cache-refresh";
const PERIOD_MINUTES = 24 * 60; // 1440 minutes
const DUMP_URL = "https://isthatslop.com/api/v1/dump";

// In-memory read-through cache (lost on service worker termination, rebuilt on startup)
let memCache: Map<string, number> | null = null;

function normalizeUrl(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

async function computeUrlHash(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

async function refreshScoreCache(): Promise<void> {
  try {
    const res = await fetch(DUMP_URL);
    if (!res.ok) return;
    const data = (await res.json()) as {
      entries: Array<{ urlHash: string; tier: number }>;
    };
    const scoreCache: Record<string, number> = {};
    for (const entry of data.entries) {
      scoreCache[entry.urlHash] = entry.tier;
    }
    memCache = new Map(Object.entries(scoreCache));
    await chrome.storage.local.set({ scoreCache, scoreCacheUpdatedAt: Date.now() });
  } catch {
    // Silently keep stale cache on network error
  }
}

async function getTierForUrl(url: string): Promise<number | null> {
  const hash = await computeUrlHash(url);
  if (memCache) {
    return memCache.get(hash) ?? null;
  }
  const result = await chrome.storage.local.get("scoreCache");
  const cache = result.scoreCache as Record<string, number> | undefined;
  if (!cache) return null;
  memCache = new Map(Object.entries(cache));
  return cache[hash] ?? null;
}

// MUST be top-level — not inside any async callback
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void refreshScoreCache();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm) {
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: PERIOD_MINUTES,
      delayInMinutes: 0,
    });
  }
  await refreshScoreCache();
});

chrome.runtime.onStartup.addListener(async () => {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: PERIOD_MINUTES });
  }
});
