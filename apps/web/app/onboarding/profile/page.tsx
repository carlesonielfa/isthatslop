"use client";

import { useState, useEffect } from "react";
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

export default function ProfileSetupPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Redirect OAuth users without username to username setup first
  useEffect(() => {
    if (!isPending && session?.user) {
      const user = session.user as { username?: string };
      if (!user.username) {
        router.push("/onboarding/username");
      }
    }
  }, [session, isPending, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("displayName") as string;
    const avatarUrl = formData.get("avatarUrl") as string;

    const updateData: { name?: string; image?: string } = {};
    if (name) updateData.name = name;
    if (avatarUrl) updateData.image = avatarUrl;

    if (Object.keys(updateData).length > 0) {
      const { error } = await authClient.updateUser(updateData);

      if (error) {
        setError(error.message || "Failed to update profile");
        setIsLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  async function handleSkip() {
    router.push("/");
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

  const user = session?.user as
    | {
        name?: string;
        username?: string;
        image?: string;
      }
    | undefined;

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardTitleBar>Complete Your Profile - IsThatSlop.com</CardTitleBar>
        <CardContent className="py-6">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-3 bg-muted border-2 border-border flex items-center justify-center">
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">
                      {user?.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">@{user?.username}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add some details to your profile (optional)
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2">
                  {error}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="Your display name"
                  defaultValue={user?.name || ""}
                  maxLength={50}
                  disabled={isLoading}
                />
                <FieldDescription>
                  This is how your name will appear on your reviews
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  defaultValue={user?.image || ""}
                  disabled={isLoading}
                />
                <FieldDescription>
                  Direct link to an image (PNG, JPG, GIF)
                </FieldDescription>
              </Field>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Skip for now
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Complete Setup"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                You can always update your profile later in settings.
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
