import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardTitleBar, CardContent } from "@/components/ui/card";
import { getModDashboardStatsDTO } from "@/data/moderation";

export const metadata: Metadata = {
  title: "Moderation Dashboard - IsThatSlop",
};

export default async function ModDashboardPage() {
  const stats = await getModDashboardStatsDTO();

  return (
    <div className="space-y-4">
      <Card>
        <CardTitleBar>Dashboard Overview</CardTitleBar>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pending Flags */}
            <Link href="/mod/flags" className="block group">
              <div className="border-2 border-inset bg-[#c0c0c0] p-4 text-center hover:bg-[#b0b0b0] transition-colors">
                <div className="text-3xl font-bold text-foreground">
                  {stats.pendingFlagsCount}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pending Flags
                </div>
                {stats.pendingFlagsCount > 0 && (
                  <div className="text-xs text-destructive mt-1 font-medium">
                    Needs attention
                  </div>
                )}
              </div>
            </Link>

            {/* Pending Sources */}
            <Link href="/mod/sources" className="block group">
              <div className="border-2 border-inset bg-[#c0c0c0] p-4 text-center hover:bg-[#b0b0b0] transition-colors">
                <div className="text-3xl font-bold text-foreground">
                  {stats.pendingSourcesCount}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pending Sources
                </div>
                {stats.pendingSourcesCount > 0 && (
                  <div className="text-xs text-destructive mt-1 font-medium">
                    Needs attention
                  </div>
                )}
              </div>
            </Link>

            {/* Recent Actions */}
            <Link href="/mod/logs" className="block group">
              <div className="border-2 border-inset bg-[#c0c0c0] p-4 text-center hover:bg-[#b0b0b0] transition-colors">
                <div className="text-3xl font-bold text-foreground">
                  {stats.recentModActionsCount}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Actions (7 days)
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
