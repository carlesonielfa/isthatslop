"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { authClient } from "@/app/lib/auth.client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token");
      setIsLoading(false);
      return;
    }

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (error) {
      setError(error.message || "Failed to reset password");
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-3">
          Reset link expired
        </div>
        <div className="space-y-2">
          <p className="text-xs">This reset link has expired or is invalid.</p>
          <p className="text-xs">
            To request a new password reset link, visit the forgot password
            page.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request new reset link</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {success ? (
        <div className="space-y-4">
          <div className="bg-green-100 border border-green-600 text-green-800 text-xs p-3">
            Your password has been changed
          </div>
          <div className="space-y-2">
            <p className="text-xs">
              Your password has been updated. You can now sign in with your new
              password.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
                {error}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="password">New Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter new password"
                required
                minLength={8}
                disabled={isLoading}
              />
              <FieldDescription>Minimum 8 characters</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">
                Confirm New Password
              </FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                required
                disabled={isLoading}
              />
            </Field>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>

            <div className="text-center text-xs">
              <Link href="/login" className="text-accent hover:underline">
                Back to login
              </Link>
            </div>
          </FieldGroup>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardTitleBar>Reset Password - IsThatSlop.com</CardTitleBar>
        <CardContent className="py-6">
          <Suspense
            fallback={<div className="text-center text-xs">Loading...</div>}
          >
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
