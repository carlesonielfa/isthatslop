"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { useSession } from "@/app/lib/auth.client";
import { UserAvatar } from "@/components/user-avatar";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <Card>
          <CardTitleBar>Loading...</CardTitleBar>
          <CardContent className="py-6 text-center">
            <p className="text-xs">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user as {
    id: string;
    name?: string;
    username?: string;
    displayUsername?: string;
    image?: string;
    reputation?: number;
    role?: string;
  };

  const displayUsername = user.displayUsername || user.username || "user";

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Card>
        <CardTitleBar>My Profile</CardTitleBar>
        <CardContent className="py-6 space-y-6">
          {/* User info */}
          <div className="flex flex-col items-center gap-3">
            <UserAvatar
              username={displayUsername}
              avatarUrl={user.image}
              size="lg"
            />
            <div className="text-center">
              <h1 className="text-lg font-bold">@{displayUsername}</h1>
              {user.name && user.name !== displayUsername && (
                <p className="text-sm ">{user.name}</p>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="ring ring-inset p-3">
              <div className="text-xl font-bold text-accent">
                {user.reputation ?? 0}
              </div>
              <div className="text-xs ">Reputation</div>
            </div>
            <div className="ring ring-inset p-3">
              <div className="text-xl font-bold text-accent capitalize">
                {user.role || "member"}
              </div>
              <div className="text-xs ">Role</div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full" asChild>
              <Link href={`/users/${user.username}`}>View Public Profile</Link>
            </Button>
            <Button className="w-full" variant="secondary" asChild>
              <Link href="/profile/settings">Edit Settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
