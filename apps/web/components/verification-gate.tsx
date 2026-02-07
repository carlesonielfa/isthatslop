"use client";

import * as React from "react";
import { useSession, authClient } from "@/app/lib/auth.client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

/**
 * Hook to check if the current user has verified their email.
 * Returns verification status, logged-in status, and loading state.
 */
export function useVerificationCheck() {
  const { data: session } = useSession();
  // better-auth includes emailVerified in session.user when emailVerification is enabled
  // Use optional chaining to safely access it regardless of TypeScript type
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
 * Standalone verification prompt dialog.
 * Shows when unverified user attempts a restricted action.
 */
export function VerificationPrompt({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const user = session?.user;
  const [isResending, setIsResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);
  const [resendError, setResendError] = React.useState<string | null>(null);
  const [lastResendTime, setLastResendTime] = React.useState<number>(0);

  const canResend = Date.now() - lastResendTime > 60000; // 60 seconds

  async function handleResendVerification() {
    if (!user || !canResend) return;

    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const email = (user as { email?: string }).email;
      if (!email) {
        throw new Error("Email not found");
      }

      // Use better-auth's sendVerificationEmail method
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to send email");
      }

      setResendSuccess(true);
      setLastResendTime(Date.now());
    } catch (error) {
      setResendError(
        error instanceof Error ? error.message : "Failed to send email",
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Email Verification Required</AlertDialogTitle>
          <AlertDialogDescription>
            You need to verify your email address before you can perform this
            action.
            <br />
            <br />
            Check your inbox for a verification email, or request a new one
            below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {resendSuccess && (
          <div className="bg-green-100 border border-green-600 text-green-800 text-xs p-2">
            Verification email sent! Check your inbox.
          </div>
        )}
        {resendError && (
          <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
            {resendError}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResendVerification}
            disabled={isResending || !canResend}
          >
            {isResending
              ? "Sending..."
              : !canResend
                ? "Wait 60s to resend"
                : "Resend Verification Email"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Verification gate component.
 * Renders children if user is verified, shows prompt dialog if not verified.
 * If user is not logged in, renders nothing (auth check should handle this separately).
 */
export function VerificationGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isVerified, isLoggedIn } = useVerificationCheck();
  const [showPrompt, setShowPrompt] = React.useState(false);

  // Effect to show prompt when user is logged in but not verified
  React.useEffect(() => {
    if (!isVerified && isLoggedIn) {
      setShowPrompt(true);
    }
  }, [isVerified, isLoggedIn]);

  // Not logged in - render nothing (let auth gate handle this)
  if (!isLoggedIn) {
    return null;
  }

  // Verified - render children
  if (isVerified) {
    return <>{children}</>;
  }

  // Not verified - show fallback or trigger prompt

  return (
    <>
      {fallback}
      <VerificationPrompt
        open={showPrompt}
        onClose={() => setShowPrompt(false)}
      />
    </>
  );
}
