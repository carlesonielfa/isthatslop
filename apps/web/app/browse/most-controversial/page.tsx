import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { TierBadge } from "@/components/tier-badge";
import { Pagination } from "@/components/pagination";
import { getMostControversialPageDTO } from "@/data/sources";

export const metadata: Metadata = {
  title: "Most Controversial | IsThatSlop",
  description:
    "Browse the most controversial sources on IsThatSlop.com — sources whose claims receive evenly split helpful and not-helpful votes.",
};

interface MostControversialPageProps {
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export default async function MostControversialPage({
  searchParams,
}: MostControversialPageProps) {
  const { page: pageParam, sort: sortParam } = await searchParams;

  const sort = sortParam === "votes" ? "votes" : "controversy";
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;

  const result = await getMostControversialPageDTO(page, sort);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <Card>
        <CardTitleBar>Most Controversial</CardTitleBar>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {result.total} sources
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Sort by:</span>
              {sort === "controversy" ? (
                <span className="font-bold text-foreground">
                  Controversy Score
                </span>
              ) : (
                <Link
                  href="/browse/most-controversial?sort=controversy"
                  className="text-accent hover:underline"
                >
                  Controversy Score
                </Link>
              )}
              <span className="text-muted-foreground">|</span>
              {sort === "votes" ? (
                <span className="font-bold text-foreground">Total Votes</span>
              ) : (
                <Link
                  href="/browse/most-controversial?sort=votes"
                  className="text-accent hover:underline"
                >
                  Total Votes
                </Link>
              )}
            </div>
          </div>

          {result.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No controversial sources found yet. Sources appear here when their
              claims receive mixed helpful/not helpful votes.
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
                    Controversy: {source.controversyScore}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {source.totalVotes} votes
                  </span>
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={result.page}
            totalPages={result.totalPages}
            basePath="/browse/most-controversial"
            sort={sort}
          />
        </CardContent>
      </Card>
    </div>
  );
}
