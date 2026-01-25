import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";

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
