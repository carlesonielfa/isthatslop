import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";
import { db, user as userTable } from "@repo/database";
import { eq } from "drizzle-orm";

/**
 * Get the current session on the server side.
 * Cached per request to avoid multiple database calls.
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
});

/**
 * Get the current user from the session.
 * Returns null if not authenticated.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  return session?.user ?? null;
});

/**
 * Check if the current user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

/**
 * Check if the current user has completed onboarding (has username set).
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return !!(user as { username?: string }).username;
}

/**
 * Get user role for authorization checks.
 */
export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return (user as { role?: string }).role ?? "member";
}

/**
 * Check if the current user is a moderator or admin.
 */
export async function isModerator(): Promise<boolean> {
  const role = await getUserRole();
  return role === "moderator" || role === "admin";
}

/**
 * Check if the current user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "admin";
}

/**
 * Check if the current user's email is verified.
 * Queries the user table directly rather than relying on session type,
 * since better-auth's session.user TypeScript type may not expose emailVerified.
 */
export const isEmailVerified = cache(async (): Promise<boolean> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;
  const [row] = await db
    .select({ emailVerified: userTable.emailVerified })
    .from(userTable)
    .where(eq(userTable.id, currentUser.id))
    .limit(1);
  return row?.emailVerified === true;
});
