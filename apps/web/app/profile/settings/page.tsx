"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { authClient, useSession } from "@/app/lib/auth.client";
import { UserAvatar } from "@/components/user-avatar";
import {
  ReputationBadge,
  ReputationProgress,
} from "@/components/reputation-badge";
import { formatMonthYear } from "@/lib/date";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("displayName") as string;
    const avatarUrl = formData.get("avatarUrl") as string;

    const updateData: { name?: string; image?: string } = {};
    if (name) updateData.name = name;
    updateData.image = avatarUrl || undefined;

    const { error } = await authClient.updateUser(updateData);

    if (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile",
      });
    } else {
      setMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
      router.refresh();
    }

    setIsLoading(false);
  }

  if (isPending) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <Card>
          <CardTitleBar>Loading...</CardTitleBar>
          <CardContent className="py-6 text-center">
            <p className="text-xs">Loading settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user as unknown as {
    id: string;
    name?: string;
    email?: string;
    username?: string;
    displayUsername?: string;
    image?: string;
    reputation?: number;
    role?: string;
    createdAt?: string;
  };

  const displayUsername = user.displayUsername || user.username || "user";
  const reputation = user.reputation ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Back link */}
      <Link
        href="/profile"
        className="text-xs text-accent hover:underline inline-flex items-center gap-1"
      >
        &larr; Back to Profile
      </Link>

      {/* Profile Settings Card */}
      <Card>
        <CardTitleBar>Profile Settings</CardTitleBar>
        <CardContent className="py-4">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {/* Current avatar preview */}
              <div className="flex items-center gap-4 pb-2">
                <UserAvatar
                  username={displayUsername}
                  avatarUrl={user.image}
                  size="lg"
                />
                <div>
                  <p className="font-bold">@{displayUsername}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {message && (
                <div
                  className={`text-xs p-2 ${
                    message.type === "error"
                      ? "bg-destructive/10 border border-destructive text-destructive"
                      : "bg-green-500/10 border border-green-500 text-green-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Separator />

              <Field>
                <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="Your display name"
                  defaultValue={user.name || ""}
                  maxLength={50}
                  disabled={isLoading}
                />
                <FieldDescription>
                  This appears on your claims and profile
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="avatarUrl">Avatar URL</FieldLabel>
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  defaultValue={user.image || ""}
                  disabled={isLoading}
                />
                <FieldDescription>
                  Direct link to an image (PNG, JPG, GIF)
                </FieldDescription>
              </Field>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Reputation Card */}
      <Card>
        <CardTitleBar>Reputation</CardTitleBar>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <ReputationBadge reputation={reputation} />
            <span className="text-2xl font-bold">{reputation}</span>
          </div>

          <ReputationProgress reputation={reputation} />

          <Separator />

          <div className="space-y-2 text-xs">
            <p className="font-medium">How to earn reputation:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>+10 when your claim gets 10+ helpful votes</li>
              <li>+5 when a source you added gets 5+ claims</li>
              <li>+2 for each source you add</li>
              <li>+1 for each verified claim you submit</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card>
        <CardTitleBar>Account Info</CardTitleBar>
        <CardContent className="py-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Username</p>
              <p className="font-medium">@{displayUsername}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{user.role || "member"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {user.createdAt ? formatMonthYear(user.createdAt) : "Unknown"}
              </p>
            </div>
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground">
            Username changes are not currently supported. Contact support if you
            need to change your username.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
