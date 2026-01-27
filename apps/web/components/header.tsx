"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "@/components/user-menu";
import {
  HouseIcon,
  FolderOpenIcon,
  TrophyIcon,
  SkullIcon,
  MagnifyingGlassIcon,
  ListIcon,
} from "@phosphor-icons/react";

function SearchForm({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/browse");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex items-center gap-1">
        <Input
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-32 lg:w-48 text-foreground"
        />
        <Button type="submit" size="icon-sm" variant="secondary">
          <MagnifyingGlassIcon className="size-4" />
          <span className="sr-only">Search</span>
        </Button>
      </div>
    </form>
  );
}

function MobileNav() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className="md:hidden">
          <ListIcon className="size-4 mr-1" />
          Start
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
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
      <span className="text-muted-foreground">|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/browse">Browse</Link>
      </Button>
      <span className="text-muted-foreground">|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/hall-of-fame">Hall of Fame</Link>
      </Button>
      <span className="text-muted-foreground">|</span>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/hall-of-shame">Hall of Shame</Link>
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
          <MobileNav />
          <DesktopNav />
        </div>

        {/* Right side: Search + User */}
        <div className="flex items-center gap-2">
          <SearchForm className="hidden sm:block" />
          {/* Mobile search button that links to browse */}
          <Button
            variant="secondary"
            size="icon-sm"
            className="sm:hidden"
            asChild
          >
            <Link href="/browse">
              <MagnifyingGlassIcon className="size-4" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
