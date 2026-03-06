"use client";

import * as React from "react";
import { useSession } from "@/app/lib/auth.client";

/**
 * Hook to check if the current user has verified their email.
 * Returns verification status, logged-in status, and loading state.
 */
export function useVerificationCheck() {
  const { data: session } = useSession();
  const user = session?.user;
  const emailVerified = user
    ? (user as Record<string, unknown>).emailVerified
    : undefined;
  return {
    isVerified: emailVerified === true,
    isLoggedIn: !!user,
    isPending: !session && user === undefined,
  };
}

/**
 * Verification gate component.
 * Renders children if user is verified, shows fallback if not verified.
 * If user is not logged in, renders nothing (auth check handles this separately).
 */
export function VerificationGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isVerified, isLoggedIn } = useVerificationCheck();

  if (!isLoggedIn) {
    return null;
  }

  if (isVerified) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
