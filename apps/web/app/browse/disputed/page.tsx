import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { TierBadge } from "@/components/tier-badge";
import { Pagination } from "@/components/pagination";
import { getDisputedPageDTO } from "@/data/sources";

export const metadata: Metadata = {
  title: "Disputed Sources | IsThatSlop",
  description:
    "Browse the most disputed sources on IsThatSlop.com — sources whose claims have received the most dispute comments.",
};

interface DisputedPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function DisputedPage({
  searchParams,
}: DisputedPageProps) {
  const { page: pageParam } = await searchParams;

  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;

  const result = await getDisputedPageDTO(page, "disputes");

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <Card>
        <CardTitleBar>Disputed Sources</CardTitleBar>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {result.total} sources
            </span>
          </div>

          {result.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No disputed sources found yet. Sources appear here when their
              claims receive dispute comments.
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
                  <span className="text-xs text-destructive whitespace-nowrap">
                    {source.disputeCount} disputes
                  </span>
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={result.page}
            totalPages={result.totalPages}
            basePath="/browse/disputed"
          />
        </CardContent>
      </Card>
    </div>
  );
}
