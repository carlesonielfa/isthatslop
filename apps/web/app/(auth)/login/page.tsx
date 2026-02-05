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
import { useOAuthProviders } from "@/components/oauth-provider-context";

export default function LoginPage() {
  const router = useRouter();
  const providers = useOAuthProviders();
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
                  onClick={() => providers.google && handleOAuthLogin("google")}
                  disabled={isLoading || !providers.google}
                  className={
                    !providers.google
                      ? "opacity-60 cursor-not-allowed flex flex-col items-center gap-0.5 py-1"
                      : ""
                  }
                >
                  {providers.google ? (
                    "Google"
                  ) : (
                    <>
                      <span>Google</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Coming soon
                      </span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => providers.github && handleOAuthLogin("github")}
                  disabled={isLoading || !providers.github}
                  className={
                    !providers.github
                      ? "opacity-60 cursor-not-allowed flex flex-col items-center gap-0.5 py-1"
                      : ""
                  }
                >
                  {providers.github ? (
                    "GitHub"
                  ) : (
                    <>
                      <span>GitHub</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Coming soon
                      </span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    providers.discord && handleOAuthLogin("discord")
                  }
                  disabled={isLoading || !providers.discord}
                  className={
                    !providers.discord
                      ? "opacity-60 cursor-not-allowed flex flex-col items-center gap-0.5 py-1"
                      : ""
                  }
                >
                  {providers.discord ? (
                    "Discord"
                  ) : (
                    <>
                      <span>Discord</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Coming soon
                      </span>
                    </>
                  )}
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
