const API_BASE =
  typeof import.meta !== "undefined" &&
  typeof (import.meta as Record<string, unknown>).env !== "undefined"
    ? ((import.meta as Record<string, Record<string, unknown>>).env
        .VITE_API_BASE_URL ?? "https://isthatslop.com")
    : "https://isthatslop.com";

export function renderAuthState(
  token: string | null,
  username: string | null,
): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("auth-status");
  if (!el) return;
  if (token) {
    el.innerHTML = `
      <div>Signed in as <strong>@${username ?? ""}</strong></div>
      <button class="btn" id="sign-out-btn" style="margin-top:8px">Sign out</button>
    `;
    document.getElementById("sign-out-btn")?.addEventListener("click", () => {
      void signOut();
    });
  } else {
    el.innerHTML = `
      <div style="margin-bottom:8px">Not signed in</div>
      <a class="btn" href="${API_BASE}/login" target="_blank">Sign in</a>
    `;
  }
}

export async function signOut(): Promise<void> {
  await chrome.storage.local.remove(["authToken", "username", "userId"]);
  renderAuthState(null, null);
}

async function main(): Promise<void> {
  const stored = (await chrome.storage.local.get([
    "authToken",
    "username",
  ])) as {
    authToken?: string;
    username?: string;
  };
  renderAuthState(stored.authToken ?? null, stored.username ?? null);
}

// Only invoke main() in a browser environment (not during Bun unit tests)
if (typeof document !== "undefined" && typeof chrome !== "undefined") {
  void main();
}
