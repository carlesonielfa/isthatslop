import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { TierBadge } from "@/components/tier-badge";
import { Pagination } from "@/components/pagination";
import { getHallOfShamePageDTO } from "@/data/sources";

export const metadata: Metadata = {
  title: "Hall of Shame - IsThatSlop",
  description:
    "Browse the most AI-generated sources on IsThatSlop.com (Tier 3-4)",
};

interface HallOfShamePageProps {
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export default async function HallOfShamePage({
  searchParams,
}: HallOfShamePageProps) {
  const { page: pageParam, sort: sortParam } = await searchParams;

  const sort = sortParam === "claims" ? "claims" : "tier";
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;

  const result = await getHallOfShamePageDTO(page, sort);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <Card>
        <CardTitleBar>Hall of Shame</CardTitleBar>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {result.total} sources (Tier 3-4)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Sort by:</span>
              {sort === "tier" ? (
                <span className="font-bold text-foreground">Tier</span>
              ) : (
                <Link
                  href="/hall-of-shame?sort=tier"
                  className="text-accent hover:underline"
                >
                  Tier
                </Link>
              )}
              <span className="text-muted-foreground">|</span>
              {sort === "claims" ? (
                <span className="font-bold text-foreground">Claims</span>
              ) : (
                <Link
                  href="/hall-of-shame?sort=claims"
                  className="text-accent hover:underline"
                >
                  Claims
                </Link>
              )}
            </div>
          </div>

          {result.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No sources found.
            </p>
          ) : (
            <div className="space-y-0">
              {result.sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 border-b border-border-dark/20 py-1.5 last:border-b-0"
                >
                  <TierBadge tier={source.tier} size="sm" />
                  <Link
                    href={`/sources/${source.id}/${source.slug}`}
                    className="text-accent hover:underline text-sm flex-1 truncate"
                  >
                    {source.name}
                  </Link>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {source.claimCount} claims
                  </span>
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={result.page}
            totalPages={result.totalPages}
            basePath="/hall-of-shame"
            sort={sort}
          />
        </CardContent>
      </Card>
    </div>
  );
}
