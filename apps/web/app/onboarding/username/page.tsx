"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { authClient, useSession } from "@/app/lib/auth.client";

export default function UsernameSetupPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [suggestedUsername, setSuggestedUsername] = useState("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a suggested username from the user's name
  useEffect(() => {
    if (session?.user?.name) {
      const base = session.user.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 20);
      const randomSuffix = Math.floor(Math.random() * 1000);
      setSuggestedUsername(`${base}_${randomSuffix}`);
    }
  }, [session?.user?.name]);

  // Redirect if user already has a username
  useEffect(() => {
    if (!isPending && session?.user) {
      const user = session.user as { username?: string };
      if (user.username) {
        router.push("/onboarding/profile");
      }
    }
  }, [session, isPending, router]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;

    if (username.length < 3 || username.length > 30) {
      setError("Username must be between 3 and 30 characters");
      setIsLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
      setError(
        "Username can only contain letters, numbers, underscores, and dots",
      );
      setIsLoading(false);
      return;
    }

    const { error } = await authClient.updateUser({
      username,
      displayUsername: username,
    });

    if (error) {
      setError(error.message || "Failed to set username");
      setIsLoading(false);
      return;
    }

    router.push("/onboarding/profile");
    router.refresh();
  }

  if (isPending) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardTitleBar>Loading...</CardTitleBar>
          <CardContent className="py-6 text-center">
            <p className="text-xs">Loading your account...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardTitleBar>Choose Your Username - IsThatSlop.com</CardTitleBar>
        <CardContent className="py-6">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="text-center mb-4">
                <p className="text-xs text-muted-foreground">
                  Welcome, {session?.user?.name}! Choose a username to complete
                  your registration.
                </p>
              </div>

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
                  defaultValue={suggestedUsername}
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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || usernameAvailable === false}
              >
                {isLoading ? "Saving..." : "Continue"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
