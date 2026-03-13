import { getIconPaths } from "../src/lib/icon-state";
import { normalizeUrl } from "../src/lib/dispatch";
import { API_BASE } from "../src/lib/env";
import type {
  SubmitClaimMessage,
  SubmitClaimResponse,
  CreateSourceMessage,
  CreateSourceResponse,
} from "../src/lib/claim";

const ALARM_NAME = "score-cache-refresh";
const PERIOD_MINUTES = 24 * 60; // 1440 minutes
const DUMP_URL = `${API_BASE}/api/v1/dump`;

// In-memory read-through cache (lost on service worker termination, rebuilt on startup)
let memCache: Map<string, number> | null = null;

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
    await chrome.storage.local.set({
      scoreCache,
      scoreCacheUpdatedAt: Date.now(),
    });
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

// Try exact URL first, then fall back to root domain (e.g. reddit.com/r/art → reddit.com)
async function getTierWithFallback(rawUrl: string): Promise<number | null> {
  const normalized = normalizeUrl(rawUrl);
  const tier = await getTierForUrl(normalized);
  if (tier !== null) return tier;
  const slashIdx = normalized.indexOf("/");
  if (slashIdx === -1) return null;
  return getTierForUrl(normalized.slice(0, slashIdx));
}

// SUBMIT_CLAIM: popup asks background to POST a claim (survives popup close)
export async function submitClaimRequest(
  msg: Pick<SubmitClaimMessage, "sourceId" | "content" | "impact" | "confidence">,
): Promise<SubmitClaimResponse> {
  const { authToken } = await chrome.storage.local.get("authToken");
  if (!authToken) {
    return { ok: false, error: "Not authenticated" };
  }
  try {
    const res = await fetch(
      new Request(`${API_BASE}/api/v1/sources/${msg.sourceId}/claims`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken as string}`,
        },
        body: JSON.stringify({
          content: msg.content,
          impact: msg.impact,
          confidence: msg.confidence,
        }),
      }),
    );
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? 0);
      const data = (await res.json()) as { error?: string };
      return { ok: false, error: data.error ?? "Too many requests", retryAfter };
    }
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { claimId: string; sourceId: string };
    return { ok: true, claimId: data.claimId, sourceId: data.sourceId };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

// CREATE_SOURCE: popup asks background to POST a new source
export async function createSourceRequest(
  msg: Pick<CreateSourceMessage, "name" | "url">,
): Promise<CreateSourceResponse> {
  const { authToken } = await chrome.storage.local.get("authToken");
  if (!authToken) {
    return { ok: false, error: "Not authenticated" };
  }
  try {
    const res = await fetch(
      new Request(`${API_BASE}/api/v1/sources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken as string}`,
        },
        body: JSON.stringify({ name: msg.name, url: msg.url }),
      }),
    );
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { id: string; name: string };
    return { ok: true, id: data.id, name: data.name };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export default defineBackground(() => {
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
      await chrome.alarms.create(ALARM_NAME, {
        periodInMinutes: PERIOD_MINUTES,
      });
    }
  });

  // GET_TIER: content script asks background for tier of a URL
  // Request:  { type: 'GET_TIER', url: string }
  // Response: number | null  (tier index 0-4, or null if unscored)
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_TIER") {
      void getTierForUrl(msg.url as string).then(sendResponse);
      return true; // keep channel open for async response
    }
  });

  // SUBMIT_CLAIM: popup asks background to POST a claim (survives popup close)
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "SUBMIT_CLAIM") {
      void submitClaimRequest(msg as SubmitClaimMessage).then(sendResponse);
      return true;
    }
  });

  // CREATE_SOURCE: popup asks background to POST a new source
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "CREATE_SOURCE") {
      void createSourceRequest(msg as CreateSourceMessage).then(sendResponse);
      return true;
    }
  });

  // SET_ICON: content script tells background which icon to show on this tab
  // Request:  { type: 'SET_ICON', tier: number | null }
  // Response: void
  chrome.runtime.onMessage.addListener((msg, sender, _sendResponse) => {
    if (msg.type === "SET_ICON" && sender.tab?.id) {
      void chrome.action.setIcon({
        tabId: sender.tab.id,
        path: getIconPaths(msg.tier as number | null),
      });
    }
  });

  // Update icon on every completed tab navigation (handles link clicks, back/forward).
  // The content script covers SPA navigation; this covers full page loads.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      void getTierWithFallback(tab.url).then((tier) => {
        void chrome.action.setIcon({
          tabId,
          path: getIconPaths(tier),
        });
      });
    }
  });
});
