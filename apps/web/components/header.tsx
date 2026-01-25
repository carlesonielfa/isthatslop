import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="ring text-secondary">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg hover:opacity-90">
            [IsThatSlop.com]
          </Link>
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
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
