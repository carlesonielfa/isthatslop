import { TIER_COLORS, TIER_NAMES } from "../../src/lib/tiers";
import { normalizeUrl } from "../../src/lib/dispatch";
import { checkAuth } from "../../src/lib/auth";
import { API_BASE } from "../../src/lib/env";

/**
 * Returns a plain-object descriptor for the sign-in button.
 * Kept as a pure helper so it can be unit-tested in Bun without a DOM.
 * The actual DOM element is built in appendSignInButton().
 */
export function createSignInButton(): {
  href: string;
  target: string;
  textContent: string;
  className: string;
} {
  return {
    href: `${API_BASE}/login`,
    target: "_blank",
    textContent: "Sign in to submit claims",
    className: "sign-in-btn",
  };
}

function appendSignInButton(container: HTMLElement): void {
  const descriptor = createSignInButton();
  const btn = document.createElement("a");
  btn.href = descriptor.href;
  btn.target = descriptor.target;
  btn.textContent = descriptor.textContent;
  btn.className = descriptor.className;
  container.appendChild(btn);
}

function renderScored(
  tier: number,
  sourceName: string,
  claimCount: number,
  sourceId: string,
): void {
  const content = document.getElementById("content")!;
  content.innerHTML = `
    <div>
      <span class="tier-badge" style="background:${TIER_COLORS[tier]}">${TIER_NAMES[tier]}</span>
    </div>
    <div style="margin-top:8px; color: var(--muted-foreground); font-size:11px">${claimCount} claim${claimCount !== 1 ? "s" : ""}</div>
    <a class="source-link" href="${API_BASE}/sources/${sourceId}" target="_blank">${sourceName}</a>
  `;
}

function renderUnscored(): void {
  const content = document.getElementById("content")!;
  content.innerHTML = `
    <div style="color: var(--muted-foreground)">This source hasn't been rated yet.</div>
    <a class="source-link" href="${API_BASE}" target="_blank">Submit on IsThatSlop</a>
  `;
}

async function main(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.url) {
      renderUnscored();
    } else {
      const normalized = normalizeUrl(tab.url);
      const tier = (await chrome.runtime.sendMessage({
        type: "GET_TIER",
        url: normalized,
      })) as number | null;

      if (tier === null) {
        renderUnscored();
      } else {
        // Render tier immediately from cache (no API needed)
        renderScored(tier, normalized, 0, "");

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
            renderScored(tier, data.name, data.claimCount, data.id);
          } else {
            renderScored(tier, normalized, 0, "");
          }
        } catch {
          renderScored(tier, normalized, 0, "");
        }
      }
    }
  } catch {
    const content = document.getElementById("content");
    if (content) content.textContent = "Unable to load data.";
  }

  // Auth check — show sign-in button for unauthenticated users
  const token = await checkAuth();
  if (!token) {
    const content = document.getElementById("content");
    if (content) {
      appendSignInButton(content);
    }
  }
}

// Only invoke main() in a browser environment (not during Bun unit tests)
if (typeof document !== "undefined") {
  void main();
}
