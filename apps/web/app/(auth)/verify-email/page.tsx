"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Check if there's an error or invalid state
  const hasError = error !== null;

  if (hasError) {
    // EXPIRED/ERROR state
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-3">
          Verification link expired
        </div>
        <div className="space-y-2">
          <p className="text-xs">
            This verification link has expired or is invalid. To get a new one:
          </p>
          <ol className="list-decimal list-inside text-xs space-y-1 pl-2">
            <li>Log in to your account</li>
            <li>Go to your profile settings</li>
            <li>Click &quot;Resend verification email&quot;</li>
          </ol>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  // SUCCESS state
  return (
    <div className="space-y-4">
      <div className="bg-green-100 border border-green-600 text-green-800 text-xs p-3">
        Your email has been verified!
      </div>
      <div className="space-y-2">
        <p className="text-xs">
          Your account is now fully active. You can submit sources, create
          claims, and vote on content.
        </p>
      </div>
      <Button asChild className="w-full">
        <Link href="/">Continue to Homepage</Link>
      </Button>
      <div className="text-center text-xs">
        <Link href="/profile" className="text-accent hover:underline">
          Go to Profile
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardTitleBar>Email Verified - IsThatSlop.com</CardTitleBar>
        <CardContent className="py-6">
          <Suspense
            fallback={<div className="text-center text-xs">Loading...</div>}
          >
            <VerifyEmailContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
