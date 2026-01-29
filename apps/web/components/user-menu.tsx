"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient, useSession } from "@/app/lib/auth.client";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/signup">Register</Link>
        </Button>
      </div>
    );
  }

  const user = session.user as {
    name?: string;
    username?: string;
    displayUsername?: string;
    image?: string;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs">
        @{user.displayUsername || user.username || "user"}
      </span>
      <Button variant="outline" size="sm" asChild>
        <Link href="/profile">Profile</Link>
      </Button>
      <Button variant="secondary" size="sm" onClick={handleSignOut}>
        Logout
      </Button>
    </div>
  );
}
