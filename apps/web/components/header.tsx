"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "@/components/user-menu";
import { SourceSearch } from "@/components/source-search";
import { authClient, useSession } from "@/app/lib/auth.client";
import { type SearchSourcesResult } from "@/data/actions";
import {
  HouseIcon,
  FolderOpenIcon,
  TrophyIcon,
  SkullIcon,
  ListIcon,
  UserIcon,
  SignInIcon,
  SignOutIcon,
  UserPlusIcon,
  ClockIcon,
  FireIcon,
  WarningIcon,
} from "@phosphor-icons/react";

function DesktopSearch() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState<SearchSourcesResult | null>(
    null,
  );

  function handleSourceSelect(source: SearchSourcesResult | null) {
    if (source) {
      setSearchValue(null);
      router.push(`/sources/${source.slug}`);
    }
  }

  function handleSubmit(query: string) {
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  return (
    <SourceSearch
      value={searchValue}
      onChange={handleSourceSelect}
      onSubmit={handleSubmit}
      placeholder="Search..."
      className="w-32 lg:w-48"
    />
  );
}

function MobileNav() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mobileSearchValue, setMobileSearchValue] =
    useState<SearchSourcesResult | null>(null);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  function handleMobileSourceSelect(source: SearchSourcesResult | null) {
    if (source) {
      setMobileSearchValue(null);
      router.push(`/sources/${source.slug}`);
    }
  }

  const user = session?.user as
    | {
        name?: string;
        username?: string;
        displayUsername?: string;
      }
    | undefined;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className="md:hidden">
          <ListIcon className="size-4 mr-1" />
          Start
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[min(16rem,calc(100vw-2rem))]"
      >
        <div className="px-2 py-2" onKeyDown={(e) => e.stopPropagation()}>
          <SourceSearch
            value={mobileSearchValue}
            onChange={handleMobileSourceSelect}
            placeholder="Search sources..."
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" className="flex items-center gap-2">
            <HouseIcon className="size-4" />
            Home
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/browse" className="flex items-center gap-2">
            <FolderOpenIcon className="size-4" />
            Browse
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/hall-of-fame" className="flex items-center gap-2">
            <TrophyIcon className="size-4" />
            Hall of Fame
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/hall-of-shame" className="flex items-center gap-2">
            <SkullIcon className="size-4" />
            Hall of Shame
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/browse/recently-added"
            className="flex items-center gap-2"
          >
            <ClockIcon className="size-4" />
            Recently Added
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/browse/most-controversial"
            className="flex items-center gap-2"
          >
            <FireIcon className="size-4" />
            Most Controversial
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/browse/disputed" className="flex items-center gap-2">
            <WarningIcon className="size-4" />
            Disputed
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isPending ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">Loading...</span>
          </DropdownMenuItem>
        ) : user ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <UserIcon className="size-4" />@
                {user.displayUsername || user.username || "user"}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <SignOutIcon className="size-4" />
              Logout
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/login" className="flex items-center gap-2">
                <SignInIcon className="size-4" />
                Login
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/signup" className="flex items-center gap-2">
                <UserPlusIcon className="size-4" />
                Register
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopNav() {
  return (
    <nav className="hidden md:flex items-center gap-1">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">Home</Link>
      </Button>
      <span>|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/browse">Browse</Link>
      </Button>
      <span>|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/hall-of-fame">Hall of Fame</Link>
      </Button>
      <span>|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/hall-of-shame">Hall of Shame</Link>
      </Button>
      <span>|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/browse/recently-added">Recently Added</Link>
      </Button>
      <span>|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/browse/most-controversial">Most Controversial</Link>
      </Button>
      <span>|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/browse/disputed">Disputed</Link>
      </Button>
    </nav>
  );
}

export function Header() {
  return (
    <header className="ring text-secondary">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
        {/* Left side: Logo + Nav */}
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg hover:opacity-90">
            [IsThatSlop.com]
          </Link>
          <DesktopNav />
        </div>

        {/* Right side: Mobile menu or Search + User (desktop) */}
        <MobileNav />
        <div className="hidden md:flex items-center gap-2">
          <DesktopSearch />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
