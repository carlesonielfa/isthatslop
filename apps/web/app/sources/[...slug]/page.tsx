import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitleBar } from "@/components/ui/card";
import { TierBadge } from "@/components/tier-badge";
import {
  getSourceBreadcrumbsDTO,
  getSourceChildrenSummaryDTO,
  getSourceDetailByIdDTO,
  getSourceDetailBySlugPathDTO,
  getSourceClaimsDTO,
  getClaimCommentsDTO,
  tiers,
  type SourceClaimSort,
} from "@/data/sources";
import { formatTimeAgo } from "@/lib/date";
import { isUuid, uuidPattern } from "@/lib/validation";
import { SourceClaimCard } from "@/components/source-claim-card";
import { FlagButton } from "@/components/flag-button";

const CLAIMS_PER_PAGE = 10;
const CHILDREN_PREVIEW_LIMIT = 20;

const slugIdRegex = new RegExp(`^(.*)-(${uuidPattern})$`, "i");

function parseSourceId(segments: string[]): {
  sourceId: string | null;
  slugPath: string[];
} {
  if (segments.length === 0) return { sourceId: null, slugPath: [] };

  const first = segments[0]!;
  if (isUuid(first)) {
    return { sourceId: first, slugPath: segments.slice(1) };
  }

  const last = segments[segments.length - 1]!;
  if (isUuid(last)) {
    return { sourceId: last, slugPath: segments.slice(0, -1) };
  }

  const slugIdMatch = first.match(slugIdRegex);
  if (slugIdMatch) {
    return { sourceId: slugIdMatch[2] ?? null, slugPath: [slugIdMatch[1]!] };
  }

  return { sourceId: null, slugPath: segments };
}

function TierLadder({ currentTier }: { currentTier: number | null }) {
  return (
    <div className="space-y-1">
      {tiers.map((tier) => {
        const isActive = currentTier === tier.tier;
        return (
          <div
            key={tier.tier}
            className={`flex items-center gap-2 px-2 py-1 border ${isActive ? "bg-muted border-border-dark/60" : "border-transparent"}`}
          >
            <TierBadge tier={tier.tier} size="sm" />
          </div>
        );
      })}
      {currentTier === null && (
        <div className="text-xs text-muted-foreground px-2">
          No claims yet — tier not calculated.
        </div>
      )}
    </div>
  );
}

function buildSearchParams(
  params: Record<string, string | number | undefined>,
) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

interface SourcePageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export async function generateMetadata({ params }: SourcePageProps) {
  const { slug } = await params;
  const { sourceId, slugPath } = parseSourceId(slug ?? []);
  const source = sourceId
    ? await getSourceDetailByIdDTO(sourceId)
    : await getSourceDetailBySlugPathDTO(slugPath);

  if (!source) {
    return {
      title: "Source Not Found - IsThatSlop",
    };
  }

  const tierLabel =
    source.tier !== null
      ? `${source.tier} (${tiers[source.tier]?.name})`
      : "Unrated";

  return {
    title: `${source.name} - IsThatSlop`,
    description: `${source.claimCount} claims • Tier: ${tierLabel}`,
  };
}

export default async function SourcePage({
  params,
  searchParams,
}: SourcePageProps) {
  const { slug } = await params;
  const { page: pageParam, sort: sortParam } = await searchParams;
  const { sourceId, slugPath } = parseSourceId(slug ?? []);

  const sort: SourceClaimSort = sortParam === "helpful" ? "helpful" : "recent";
  const requestedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;

  const source = sourceId
    ? await getSourceDetailByIdDTO(sourceId)
    : await getSourceDetailBySlugPathDTO(slugPath);

  if (!source) {
    notFound();
  }

  const [breadcrumbs, childrenSummary, claimsPage] = await Promise.all([
    getSourceBreadcrumbsDTO(source.path),
    getSourceChildrenSummaryDTO(source.id, CHILDREN_PREVIEW_LIMIT),
    getSourceClaimsDTO(source.id, sort, requestedPage, CLAIMS_PER_PAGE),
  ]);

  const breadcrumbItems = breadcrumbs.map((crumb) => ({
    label: crumb.name,
    href: `/sources/${crumb.id}/${crumb.slug}`,
  }));

  const claims = claimsPage.claims;
  const hasPrev = claimsPage.page > 1;
  const hasNext = claimsPage.page < claimsPage.totalPages;
  const creatorLabel =
    source.createdByUsername || source.createdByHandle || "anonymous";

  const claimComments = claims.length
    ? await Promise.all(claims.map((claim) => getClaimCommentsDTO(claim.id)))
    : [];
  const commentsByClaimId = new Map(
    claims.map((claim, index) => [claim.id, claimComments[index] ?? []]),
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <Card>
          <CardTitleBar>Source Overview</CardTitleBar>
          <CardContent className="py-4 space-y-4">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TierBadge tier={source.tier} />
                  <h1 className="text-lg font-semibold truncate">
                    {source.name}
                  </h1>
                  {source.type && (
                    <Badge variant="secondary">{source.type}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {source.claimCount} claims
                  <span className="mx-2">·</span>
                  Added {formatTimeAgo(source.createdAt)}
                  <span className="mx-2">·</span>
                  by{" "}
                  {source.createdByHandle ? (
                    <Link
                      href={`/users/${source.createdByHandle}`}
                      className="text-accent hover:underline"
                    >
                      {creatorLabel}
                    </Link>
                  ) : (
                    <span>{creatorLabel}</span>
                  )}
                </div>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent hover:underline break-all"
                  >
                    {source.url}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" asChild>
                  <Link href={`/claims/new?source=${source.id}`}>
                    + Submit Claim
                  </Link>
                </Button>
                <FlagButton targetType="source" targetId={source.id} />
              </div>
            </div>

            {source.description && (
              <p className="text-sm text-muted-foreground">
                {source.description}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardTitleBar>Tier Ladder</CardTitleBar>
          <CardContent className="py-3">
            <TierLadder currentTier={source.tier} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardTitleBar>Official AI Policy</CardTitleBar>
        <CardContent className="py-4 space-y-2">
          {source.officialAiPolicy ? (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {source.officialAiPolicy}
              </p>
              {source.officialAiPolicyUrl && (
                <a
                  href={source.officialAiPolicyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent hover:underline break-all"
                >
                  {source.officialAiPolicyUrl}
                </a>
              )}
              {source.officialAiPolicyUpdatedAt && (
                <div className="text-xs text-muted-foreground">
                  Updated {formatTimeAgo(source.officialAiPolicyUpdatedAt)}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No official AI policy disclosed.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardTitleBar>Claims</CardTitleBar>
        <CardContent className="py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {claimsPage.total} total claims
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Sort:</span>
              <Link
                href={`/sources/${source.id}/${source.slug}${buildSearchParams({
                  sort: "recent",
                  page: 1,
                })}`}
                className={
                  sort === "recent"
                    ? "text-accent font-medium"
                    : "hover:underline"
                }
              >
                Recent
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link
                href={`/sources/${source.id}/${source.slug}${buildSearchParams({
                  sort: "helpful",
                  page: 1,
                })}`}
                className={
                  sort === "helpful"
                    ? "text-accent font-medium"
                    : "hover:underline"
                }
              >
                Helpful
              </Link>
            </div>
          </div>

          {claims.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground space-y-2">
              <p>No claims yet.</p>
              <Link
                href={`/claims/new?source=${source.id}`}
                className="text-accent hover:underline"
              >
                Be the first to add one &rarr;
              </Link>
            </div>
          ) : (
            <div>
              {claims.map((claim) => (
                <SourceClaimCard
                  key={claim.id}
                  claim={claim}
                  comments={commentsByClaimId.get(claim.id) ?? []}
                />
              ))}
            </div>
          )}

          {claimsPage.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Page {claimsPage.page} of {claimsPage.totalPages}
              </span>
              <div className="flex items-center gap-2">
                {hasPrev ? (
                  <Link
                    href={`/sources/${source.id}/${source.slug}${buildSearchParams(
                      {
                        sort,
                        page: claimsPage.page - 1,
                      },
                    )}`}
                    className="text-accent hover:underline"
                  >
                    Prev
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Prev</span>
                )}
                <span className="text-muted-foreground">|</span>
                {hasNext ? (
                  <Link
                    href={`/sources/${source.id}/${source.slug}${buildSearchParams(
                      {
                        sort,
                        page: claimsPage.page + 1,
                      },
                    )}`}
                    className="text-accent hover:underline"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Next</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardTitleBar>Downstream Sources</CardTitleBar>
        <CardContent className="py-3">
          {childrenSummary.total === 0 ? (
            <div className="text-xs text-muted-foreground">
              No downstream sources yet.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">
                Showing{" "}
                {Math.min(childrenSummary.total, CHILDREN_PREVIEW_LIMIT)} of{" "}
                {childrenSummary.total} direct downstream sources
              </div>
              {childrenSummary.children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-2 border-b border-border-dark/20 py-1.5 last:border-b-0"
                >
                  <TierBadge tier={child.tier} size="sm" />
                  <Link
                    href={`/sources/${child.id}/${child.slug}`}
                    className="text-accent hover:underline text-sm flex-1 truncate"
                  >
                    {child.name}
                  </Link>
                  {child.type && (
                    <Badge variant="secondary" className="text-xs">
                      {child.type}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {child.claimCount} claims
                  </span>
                  {child.childCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      +{child.childCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
