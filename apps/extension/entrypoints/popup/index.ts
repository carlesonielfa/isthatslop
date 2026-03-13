import { TIER_COLORS, TIER_NAMES } from "../../src/lib/tiers";
import { normalizeUrl } from "../../src/lib/dispatch";
import { checkAuth } from "../../src/lib/auth";
import { API_BASE } from "../../src/lib/env";
import {
  validateClaimContent,
  validateImpact,
  validateConfidence,
} from "@isthatslop/validation";
import type {
  SubmitClaimResponse,
  CreateSourceResponse,
} from "../../src/lib/claim";

// ─── State ───────────────────────────────────────────────────────────────────

type PopupView = "score" | "claim-form" | "new-source-confirm";
let currentView: PopupView = "score";
let currentSourceId: string | undefined;
let currentSourceName: string | undefined;
let currentTier: number | undefined;
let currentClaimCount: number | undefined;
let currentShowSignIn: boolean = true;
let currentTabUrl: string | undefined;
let currentTabTitle: string | undefined;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderSegmentedSelector(name: string, value: number): string {
  return `<div class="segmented-row" data-field="${name}">
    ${[1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<button class="seg-btn${value === n ? " active" : ""}" data-value="${n}">${n}</button>`,
      )
      .join("")}
  </div>`;
}

/** Returns the auth action HTML snippet — sign-in link or submit-claim button. Exported for tests. */
export function authActionHtml(showSignIn: boolean, sourceId?: string): string {
  if (showSignIn) {
    return `<a class="sign-in-btn" href="${API_BASE}/login" target="_blank">Sign in to submit claims</a>`;
  }
  return `<button class="sign-in-btn" data-action="submit-claim" data-source-id="${sourceId ?? ""}">Submit a claim</button>`;
}

// ─── Views ────────────────────────────────────────────────────────────────────

function renderScored(
  tier: number,
  sourceName: string,
  claimCount: number,
  sourceId: string,
  showSignIn: boolean,
): void {
  currentView = "score";
  currentTier = tier;
  currentSourceName = sourceName;
  currentClaimCount = claimCount;
  currentSourceId = sourceId;
  currentShowSignIn = showSignIn;

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

  content.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-action='submit-claim']",
    );
    if (!btn) return;
    const sid = btn.dataset.sourceId;
    if (sid) {
      renderClaimForm(sid, sourceName);
    }
  });
}

function renderUnscored(showSignIn: boolean): void {
  currentView = "score";
  currentShowSignIn = showSignIn;

  if (typeof document === "undefined") return;

  const content = document.getElementById("content")!;
  content.innerHTML = `
    <div style="color: var(--muted-foreground)">This source hasn't been rated yet.</div>
    <a class="source-link" href="${API_BASE}" target="_blank">Submit on IsThatSlop</a>
    ${authActionHtml(showSignIn)}
  `;

  content.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-action='submit-claim']",
    );
    if (!btn) return;
    renderNewSourceConfirm(
      currentTabUrl ?? window.location.href,
      currentTabTitle ?? document.title,
    );
  });
}

export function renderClaimForm(sourceId: string, sourceName: string): void {
  currentView = "claim-form";
  currentSourceId = sourceId;
  currentSourceName = sourceName;

  if (typeof document === "undefined") return;

  const content = document.getElementById("content")!;
  const truncatedName =
    sourceName.length > 40 ? sourceName.slice(0, 40) + "…" : sourceName;

  let selectedImpact = 3;
  let selectedConfidence = 3;
  let isSubmitting = false;

  content.innerHTML = `
    <div style="min-height:200px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <button id="claim-back-btn" class="seg-btn">← Back</button>
        <span style="font-size:11px;color:var(--muted-foreground)">${truncatedName}</span>
      </div>
      <div style="font-size:11px;margin-bottom:4px">Impact (1=minimal, 5=definitive)</div>
      ${renderSegmentedSelector("impact", selectedImpact)}
      <div style="font-size:11px;margin:8px 0 4px">Confidence (1=guessing, 5=certain)</div>
      ${renderSegmentedSelector("confidence", selectedConfidence)}
      <textarea id="claim-content" placeholder="Describe the evidence... (100–2000 chars)" rows="5" maxlength="2000" style="width:100%;margin-top:8px;box-sizing:border-box"></textarea>
      <div id="char-count" style="font-size:10px;text-align:right;color:var(--muted-foreground)">0 / 2000</div>
      <button id="submit-claim-btn" disabled style="margin-top:8px;width:100%">Submit Claim</button>
      <div id="claim-error" style="color:red;font-size:11px;margin-top:4px"></div>
    </div>
  `;

  const textarea = content.querySelector<HTMLTextAreaElement>("#claim-content")!;
  const charCount = content.querySelector<HTMLElement>("#char-count")!;
  const submitBtn = content.querySelector<HTMLButtonElement>("#submit-claim-btn")!;
  const errorDiv = content.querySelector<HTMLElement>("#claim-error")!;

  // Segmented button click handler
  content.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".seg-btn[data-value]");
    if (!btn) return;
    const row = btn.closest<HTMLElement>(".segmented-row");
    if (!row) return;
    const field = row.dataset.field;
    const val = Number(btn.dataset.value);
    if (field === "impact") selectedImpact = val;
    if (field === "confidence") selectedConfidence = val;
    row.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });

  // Textarea character count + submit enable/disable
  textarea.addEventListener("input", () => {
    const len = textarea.value.length;
    charCount.textContent = `${len} / 2000`;
    const valid = validateClaimContent(textarea.value).valid;
    submitBtn.disabled = !valid;
  });

  // Back button
  content.querySelector("#claim-back-btn")!.addEventListener("click", () => {
    if (currentView !== "claim-form") return;
    if (currentTier !== undefined && currentSourceId) {
      renderScored(
        currentTier,
        currentSourceName ?? "",
        currentClaimCount ?? 0,
        currentSourceId,
        currentShowSignIn,
      );
    } else {
      renderUnscored(currentShowSignIn);
    }
  });

  // Submit button
  submitBtn.addEventListener("click", async () => {
    if (isSubmitting) return;
    const contentVal = textarea.value;
    const impactResult = validateImpact(selectedImpact);
    const confidenceResult = validateConfidence(selectedConfidence);
    const contentResult = validateClaimContent(contentVal);
    if (!impactResult.valid || !confidenceResult.valid || !contentResult.valid) {
      errorDiv.textContent =
        impactResult.error ?? confidenceResult.error ?? contentResult.error ?? "Invalid input";
      return;
    }
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    errorDiv.textContent = "";

    try {
      const response = (await chrome.runtime.sendMessage({
        type: "SUBMIT_CLAIM",
        sourceId,
        content: contentVal,
        impact: selectedImpact,
        confidence: selectedConfidence,
      })) as SubmitClaimResponse;

      if (response.ok) {
        content.innerHTML = `<div style="text-align:center;padding:20px;font-weight:bold">Claim submitted! ✓</div>`;
        setTimeout(() => {
          if (currentTier !== undefined && currentSourceId) {
            renderScored(
              currentTier,
              currentSourceName ?? "",
              currentClaimCount ?? 0,
              currentSourceId,
              currentShowSignIn,
            );
          } else {
            renderUnscored(currentShowSignIn);
          }
        }, 2000);
      } else {
        errorDiv.textContent = response.error ?? "Submission failed";
        if (response.retryAfter) {
          errorDiv.textContent += ` (retry in ${response.retryAfter}s)`;
        }
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Claim";
        isSubmitting = false;
      }
    } catch {
      errorDiv.textContent = "Network error. Please try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Claim";
      isSubmitting = false;
    }
  });
}

export function renderNewSourceConfirm(
  tabUrl: string,
  tabTitle: string,
): void {
  currentView = "new-source-confirm";

  if (typeof document === "undefined") return;

  const content = document.getElementById("content")!;
  const truncatedUrl = tabUrl.length > 60 ? tabUrl.slice(0, 60) + "…" : tabUrl;

  content.innerHTML = `
    <div style="min-height:200px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <button id="new-source-back-btn" class="seg-btn">← Back</button>
      </div>
      <div style="margin-bottom:8px;font-size:12px">This source isn't in our database yet.</div>
      <div style="font-size:11px;margin-bottom:4px">Source name</div>
      <input id="new-source-name" type="text" value="${tabTitle.replace(/"/g, "&quot;")}" style="width:100%;box-sizing:border-box" />
      <div style="font-size:10px;color:var(--muted-foreground);margin-top:4px">${truncatedUrl}</div>
      <button id="add-source-btn" style="margin-top:12px;width:100%">Add source &amp; submit claim</button>
      <div id="new-source-error" style="color:red;font-size:11px;margin-top:4px"></div>
    </div>
  `;

  content.querySelector("#new-source-back-btn")!.addEventListener("click", () => {
    renderUnscored(currentShowSignIn);
  });

  content.querySelector("#add-source-btn")!.addEventListener("click", async () => {
    const addBtn = content.querySelector<HTMLButtonElement>("#add-source-btn")!;
    const errorDiv = content.querySelector<HTMLElement>("#new-source-error")!;
    const nameInput = content.querySelector<HTMLInputElement>("#new-source-name")!;

    addBtn.disabled = true;
    addBtn.textContent = "Creating source...";
    errorDiv.textContent = "";

    try {
      const response = (await chrome.runtime.sendMessage({
        type: "CREATE_SOURCE",
        name: nameInput.value.trim(),
        url: tabUrl,
      })) as CreateSourceResponse;

      if (response.ok) {
        renderClaimForm(response.id, response.name);
      } else {
        errorDiv.textContent = response.error ?? "Failed to create source";
        addBtn.disabled = false;
        addBtn.textContent = "Add source & submit claim";
      }
    } catch {
      errorDiv.textContent = "Network error. Please try again.";
      addBtn.disabled = false;
      addBtn.textContent = "Add source & submit claim";
    }
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const token = await checkAuth();
  const showSignIn = !token;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    currentTabUrl = tab?.url;
    currentTabTitle = tab?.title;

    if (!tab?.url) {
      renderUnscored(showSignIn);
    } else {
      const normalized = normalizeUrl(tab.url);
      const tier = (await chrome.runtime.sendMessage({
        type: "GET_TIER",
        url: normalized,
      })) as number | null;

      if (tier === null) {
        renderUnscored(showSignIn);
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
