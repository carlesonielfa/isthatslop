"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    if (error) {
      setError(error.message || "Failed to send reset email");
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardTitleBar>Forgot Password - IsThatSlop.com</CardTitleBar>
        <CardContent className="py-6">
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-100 border border-green-600 text-green-800 text-xs p-3">
                Password reset email sent! Check your inbox for further
                instructions.
              </div>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-accent hover:underline text-xs"
                >
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
                    {error}
                  </div>
                )}

                <FieldDescription>
                  Enter your email address and we&apos;ll send you a link to
                  reset your password.
                </FieldDescription>

                <Field>
                  <FieldLabel htmlFor="email">Email Address</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    required
                    disabled={isLoading}
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center text-xs">
                  Remember your password?{" "}
                  <Link href="/login" className="text-accent hover:underline">
                    Sign in here
                  </Link>
                </div>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
