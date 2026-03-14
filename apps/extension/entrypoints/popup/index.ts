import { TIER_COLORS, TIER_NAMES } from "../../src/lib/tiers";
import { normalizeUrl } from "../../src/lib/dispatch";
import { checkAuth } from "../../src/lib/auth";
import { API_BASE } from "../../src/lib/env";

/** Returns the auth action HTML snippet — sign-in link or submit-claim link. Exported for tests. */
export function authActionHtml(showSignIn: boolean, sourceId?: string, tabUrl?: string): string {
  if (showSignIn) {
    return `<a class="sign-in-btn" href="${API_BASE}/login" target="_blank">Sign in to submit claims</a>`;
  }
  if (sourceId) {
    const claimUrl = `${API_BASE}/claims/new?source=${encodeURIComponent(sourceId)}`;
    return `<a class="sign-in-btn" href="${claimUrl}" target="_blank">Submit a claim</a>`;
  }
  // Unscored source — forward to new source page with URL pre-filled
  const newSourceUrl = tabUrl
    ? `${API_BASE}/sources/new?url=${encodeURIComponent(tabUrl)}`
    : `${API_BASE}/sources/new`;
  return `<a class="sign-in-btn" href="${newSourceUrl}" target="_blank">Add source &amp; claim</a>`;
}

function renderScored(
  tier: number,
  sourceName: string,
  claimCount: number,
  sourceId: string,
  showSignIn: boolean,
): void {
  if (typeof document === "undefined") return;

  const content = document.getElementById("content")!;
  content.innerHTML = `
    <div>
      <span class="tier-badge" style="background:${TIER_COLORS[tier]}">${TIER_NAMES[tier]}</span>
    </div>
    <div style="margin-top:8px; color: var(--muted-foreground); font-size:11px">${claimCount} claim${claimCount !== 1 ? "s" : ""}</div>
    <a class="source-link" href="${API_BASE}/sources/${sourceId}" target="_blank">${sourceName}</a>
    ${authActionHtml(showSignIn, sourceId)}
  `;
}

function renderUnscored(showSignIn: boolean, tabUrl?: string): void {
  if (typeof document === "undefined") return;

  const content = document.getElementById("content")!;
  content.innerHTML = `
    <div style="color: var(--muted-foreground)">This source hasn't been rated yet.</div>
    ${authActionHtml(showSignIn, undefined, tabUrl)}
  `;
}

async function main(): Promise<void> {
  const token = await checkAuth();
  const showSignIn = !token;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab?.url) {
      renderUnscored(showSignIn);
    } else {
      const normalized = normalizeUrl(tab.url);
      const tier = (await chrome.runtime.sendMessage({
        type: "GET_TIER",
        url: normalized,
      })) as number | null;

      if (tier === null) {
        renderUnscored(showSignIn, tab.url);
      } else {
        // Render tier immediately from cache (no API needed)
        renderScored(tier, normalized, 0, "", showSignIn);

        // Fetch source details from API for name and claim count
        try {
          const resp = await fetch(
            `${API_BASE}/api/v1/sources?url=${encodeURIComponent(normalized)}`,
          );
          if (resp.ok) {
            const data = (await resp.json()) as {
              id: string;
              name: string;
              claimCount: number;
            };
            renderScored(tier, data.name, data.claimCount, data.id, showSignIn);
          } else {
            renderScored(tier, normalized, 0, "", showSignIn);
          }
        } catch {
          renderScored(tier, normalized, 0, "", showSignIn);
        }
      }
    }
  } catch {
    const content = document.getElementById("content");
    if (content) content.textContent = "Unable to load data.";
  }
}

// Only invoke main() in a browser environment (not during Bun unit tests)
if (typeof document !== "undefined") {
  void main();
}
