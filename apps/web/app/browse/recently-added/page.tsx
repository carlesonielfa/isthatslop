import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { TierBadge } from "@/components/tier-badge";
import { Pagination } from "@/components/pagination";
import { getRecentlyAddedPageDTO } from "@/data/sources";
import { formatTimeAgo } from "@/lib/date";

export const metadata: Metadata = {
  title: "Recently Added - IsThatSlop",
  description: "Browse the most recently added sources to IsThatSlop.com",
};

interface RecentlyAddedPageProps {
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export default async function RecentlyAddedPage({
  searchParams,
}: RecentlyAddedPageProps) {
  const { page: pageParam, sort: sortParam } = await searchParams;

  const sort = sortParam === "oldest" ? "oldest" : "newest";
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;

  const result = await getRecentlyAddedPageDTO(page, sort);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <Card>
        <CardTitleBar>Recently Added</CardTitleBar>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {result.total} sources
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Sort by:</span>
              {sort === "newest" ? (
                <span className="font-bold text-foreground">Newest</span>
              ) : (
                <Link
                  href="/browse/recently-added?sort=newest"
                  className="text-accent hover:underline"
                >
                  Newest
                </Link>
              )}
              <span className="text-muted-foreground">|</span>
              {sort === "oldest" ? (
                <span className="font-bold text-foreground">Oldest</span>
              ) : (
                <Link
                  href="/browse/recently-added?sort=oldest"
                  className="text-accent hover:underline"
                >
                  Oldest
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
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(source.createdAt)}
                  </span>
                  {source.addedBy && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                      by {source.addedBy}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={result.page}
            totalPages={result.totalPages}
            basePath="/browse/recently-added"
            sort={sort}
          />
        </CardContent>
      </Card>
    </div>
  );
}
