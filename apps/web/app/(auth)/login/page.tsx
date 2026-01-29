"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field";
import { authClient } from "@/app/lib/auth.client";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      setError(error.message || "Failed to sign in");
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleOAuthLogin(provider: "google" | "github" | "discord") {
    setIsLoading(true);
    setError(null);

    await authClient.signIn.social({
      provider,
      callbackURL: "/",
      newUserCallbackURL: "/onboarding/username",
    });
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardTitleBar>Login - IsThatSlop.com</CardTitleBar>
        <CardContent className="py-6">
          <form onSubmit={handleEmailLogin}>
            <FieldGroup>
              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
                  {error}
                </div>
              )}

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

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-accent hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </Field>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <FieldSeparator>or continue with</FieldSeparator>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  onClick={() => handleOAuthLogin("google")}
                  disabled={isLoading}
                >
                  Google
                </Button>
                <Button
                  type="button"
                  onClick={() => handleOAuthLogin("github")}
                  disabled={isLoading}
                >
                  GitHub
                </Button>
                <Button
                  type="button"
                  onClick={() => handleOAuthLogin("discord")}
                  disabled={isLoading}
                >
                  Discord
                </Button>
              </div>

              <div className="text-center text-xs">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-accent hover:underline">
                  Register here
                </Link>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
