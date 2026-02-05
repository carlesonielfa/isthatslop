"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field";
import { authClient } from "@/app/lib/auth.client";
import { useOAuthProviders } from "@/components/oauth-provider-context";

export default function SignupPage() {
  const router = useRouter();
  const providers = useOAuthProviders();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkUsername = useCallback(async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const result = await authClient.isUsernameAvailable({ username });
      if (result.error) {
        setUsernameAvailable(null);
      } else if (result.data && typeof result.data.available === "boolean") {
        setUsernameAvailable(result.data.available);
      } else {
        setUsernameAvailable(null);
      }
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  function handleUsernameChange(username: string) {
    // Clear any pending check
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Reset state immediately if too short
    if (username.length < 3) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    // Show checking state and debounce the actual API call
    setCheckingUsername(true);
    debounceTimeoutRef.current = setTimeout(() => {
      checkUsername(username);
    }, 300);
  }

  async function handleEmailSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
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

    const { error } = await authClient.signUp.email({
      email,
      password,
      name: username, // Use username as name for email signups
      username,
      displayUsername: username,
    });

    if (error) {
      setError(error.message || "Failed to create account");
      setIsLoading(false);
      return;
    }

    // Redirect to profile setup after signup
    router.push("/onboarding/profile");
    router.refresh();
  }

  async function handleOAuthSignup(provider: "google" | "github" | "discord") {
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
        <CardTitleBar>Register - IsThatSlop.com</CardTitleBar>
        <CardContent className="py-6">
          <form onSubmit={handleEmailSignup}>
            <FieldGroup>
              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
                  {error}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="your_username"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="^[a-zA-Z0-9_\.]+$"
                  disabled={isLoading}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                />
                <FieldDescription>
                  3-30 characters. Letters, numbers, underscores, and dots only.
                  {checkingUsername && (
                    <span className="ml-1 text-muted-foreground">
                      Checking...
                    </span>
                  )}
                  {usernameAvailable === true && (
                    <span className="ml-1 text-green-600">Available!</span>
                  )}
                  {usernameAvailable === false && (
                    <span className="ml-1 text-destructive">
                      Username taken
                    </span>
                  )}
                </FieldDescription>
              </Field>

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
                  placeholder="Choose a password"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <FieldDescription>Minimum 8 characters</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm Password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                />
              </Field>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || usernameAvailable === false}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>

              <FieldSeparator>or register with</FieldSeparator>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    providers.google && handleOAuthSignup("google")
                  }
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
                  variant="outline"
                  onClick={() =>
                    providers.github && handleOAuthSignup("github")
                  }
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
                  variant="outline"
                  onClick={() =>
                    providers.discord && handleOAuthSignup("discord")
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
                Already have an account?{" "}
                <Link href="/login" className="text-accent hover:underline">
                  Sign in here
                </Link>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
