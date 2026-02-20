import { redirect } from "next/navigation";
import Link from "next/link";
import { isModerator } from "@/app/lib/auth.server";
import { Card, CardTitleBar, CardContent } from "@/components/ui/card";

export default async function ModLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mod = await isModerator();
  if (!mod) {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
      <Card>
        <CardTitleBar>Moderation Panel</CardTitleBar>
        <CardContent className="py-2">
          <nav className="flex items-center gap-4 text-xs">
            <Link
              href="/mod"
              className="text-accent hover:underline font-medium"
            >
              Overview
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/mod/flags" className="text-accent hover:underline">
              Flagged Items
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/mod/sources" className="text-accent hover:underline">
              Source Approvals
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/mod/logs" className="text-accent hover:underline">
              Action Log
            </Link>
          </nav>
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
