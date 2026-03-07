// PUBLIC API EXCEPTION: This route is the explicit exception to the DAL "no API routes"
// rule. It exists to serve the browser extension and third-party developers.
// See: .planning/STATE.md Decisions.
import { auth } from "@/app/lib/auth";
import type { NextRequest } from "next/server";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

/**
 * Unified auth helper for /api/v1/* route handlers.
 * Accepts both browser session cookies and Authorization: Bearer tokens.
 * The bearer plugin in auth.ts converts the Bearer header to a session cookie
 * before getSession runs — one call handles both auth mechanisms transparently.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId: session.user.id };
}
