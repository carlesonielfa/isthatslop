// Cookie-based auth for Chrome extension (MV3)
// Extension service workers bypass CORS with host_permissions — no server CORS config needed.

import { API_BASE } from "./env";

const COOKIE_URL = API_BASE;
const COOKIE_NAME_PROD = "__Secure-better-auth.session_token";
const COOKIE_NAME_DEV = "better-auth.session_token";

export interface AuthData {
  authToken: string;
  userId: string;
  username: string;
}

/** Read the better-auth session cookie. Tries __Secure- (prod HTTPS) then plain (dev HTTP). */
export async function readAuthCookie(): Promise<string | null> {
  const prod = await chrome.cookies.get({
    url: COOKIE_URL,
    name: COOKIE_NAME_PROD,
  });
  if (prod?.value) return prod.value;
  const dev = await chrome.cookies.get({
    url: COOKIE_URL,
    name: COOKIE_NAME_DEV,
  });
  return dev?.value ?? null;
}

/** Fetch userId and username from better-auth get-session endpoint. */
export async function fetchUserData(
  token: string,
): Promise<{ userId: string; username: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      user: { id: string; username?: string; displayUsername?: string };
    };
    return {
      userId: data.user.id,
      username: data.user.displayUsername ?? data.user.username ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Check auth state on popup open.
 * - Reads cookie; if absent, returns null (unauthenticated).
 * - If cookie matches stored authToken, returns token (cache hit — no extra API call).
 * - Otherwise re-hydrates from get-session and updates chrome.storage.local.
 */
export async function checkAuth(): Promise<string | null> {
  const token = await readAuthCookie();
  if (!token) return null;

  const stored = (await chrome.storage.local.get([
    "authToken",
    "username",
    "userId",
  ])) as {
    authToken?: string;
    username?: string;
    userId?: string;
  };

  if (stored.authToken === token) return token; // cache hit

  // Fresh or changed token — hydrate user data
  const userData = await fetchUserData(token);
  if (!userData) return null;

  await chrome.storage.local.set({ authToken: token, ...userData });
  return token;
}

/**
 * Authenticated fetch wrapper (AUTH-03).
 * Reads authToken from chrome.storage.local and attaches it as Authorization: Bearer
 * to every outgoing request. Phase 14 claim submission uses this instead of raw fetch.
 *
 * Usage: const res = await authenticatedFetch("/api/v1/claims", { method: "POST", body: ... })
 */
export async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const stored = (await chrome.storage.local.get(["authToken"])) as {
    authToken?: string;
  };
  const headers = new Headers(init.headers);
  if (stored.authToken) {
    headers.set("Authorization", `Bearer ${stored.authToken}`);
  }
  return fetch(url, { ...init, headers });
}
