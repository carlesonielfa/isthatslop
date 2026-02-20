import "server-only";

import { cache } from "react";
import {
  db,
  sources,
  sourceScoreCache,
  claims,
  claimComments,
  claimVotes,
  commentVotes,
  user,
} from "@repo/database";
import { getCurrentUser } from "@/app/lib/auth.server";
import { desc, eq, isNull, count, and, or, sql, asc, inArray } from "drizzle-orm";
import { formatTimeAgo } from "@/lib/date";

/**
 * Wrapper for database queries that handles connection errors gracefully.
 * Returns a fallback value if the query fails, preventing page crashes.
 */
async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  context: string,
): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    // Log error for debugging but don't crash the page
    console.error(`[Database Error] ${context}:`, error);
    return fallback;
  }
}

// DTOs - Data Transfer Objects (safe to pass to client components)
export interface SourceDTO {
  id: string;
  rank: number;
  name: string;
  slug: string;
  type: string | null;
  tier: number | null;
  claims: number;
  addedBy: string;
  timeAgo: string;
}

export interface SourceCompactDTO {
  id: string;
  name: string;
  slug: string;
  tier: number | null;
  claims: number;
}

export interface SourceDetailDTO {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  description: string | null;
  url: string | null;
  parentId: string | null;
  path: string;
  depth: number;
  createdAt: string;
  createdByUsername: string | null;
  createdByHandle: string | null;
  tier: number | null;
  claimCount: number;
  rawScore: number | null;
  normalizedScore: number | null;
  // Official AI policy fields
  officialAiPolicy: string | null;
  officialAiPolicyUrl: string | null;
  officialAiPolicyUpdatedAt: string | null;
}

export interface SourceBreadcrumbDTO {
  id: string;
  slug: string;
  name: string;
  depth: number;
}

export interface SourceChildDTO {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  tier: number | null;
  claimCount: number;
  childCount: number;
}

export type SourceClaimSort = "recent" | "helpful";

export interface SourceClaimDTO {
  id: string;
  impact: number;
  confidence: number;
  content: string;
  helpfulVotes: number;
  notHelpfulVotes: number;
  commentCount: number;
  disputeCount: number;
  createdAt: string;
  isEdited: boolean;
  userVote: boolean | null; // true = helpful, false = not helpful, null = no vote
  user: {
    id: string;
    username: string | null;
    displayUsername: string | null;
    avatarUrl: string | null;
    reputation: number;
  };
}

export interface ClaimCommentDTO {
  id: string;
  claimId: string;
  content: string;
  isDispute: boolean;
  helpfulVotes: number;
  createdAt: string;
  isEdited: boolean;
  userVote: boolean | null; // true = helpful, false = not helpful, null = no vote
  user: {
    id: string;
    username: string | null;
    displayUsername: string | null;
    avatarUrl: string | null;
    reputation: number;
  };
}

export interface SourceClaimsPageDTO {
  claims: SourceClaimDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: SourceClaimSort;
}

export interface SiteStatsDTO {
  sources: number;
  claims: number;
  users: number;
}

// Re-export tiers from shared location for backwards compatibility
export { tiers, type TierInfo } from "@/lib/tiers";

/**
 * Get recent sources with their scores and claim counts.
 * Returns a DTO with only public, safe-to-display data.
 */
export const getRecentSourcesDTO = cache(
  async (limit = 8): Promise<SourceDTO[]> => {
    return safeQuery(
      async () => {
        const result = await db
          .select({
            id: sources.id,
            name: sources.name,
            slug: sources.slug,
            type: sources.type,
            createdAt: sources.createdAt,
            addedByUsername: user.username,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
          })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .leftJoin(user, eq(sources.createdByUserId, user.id))
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          )
          .orderBy(desc(sources.createdAt))
          .limit(limit);

        return result.map((row, index) => ({
          id: row.id,
          rank: index + 1,
          name: row.name,
          slug: row.slug,
          type: row.type,
          tier: row.tier ?? null,
          claims: row.claimCount ?? 0,
          addedBy: row.addedByUsername ?? "anonymous",
          timeAgo: formatTimeAgo(row.createdAt),
        }));
      },
      [],
      "getRecentSourcesDTO",
    );
  },
);

/**
 * Get sources with lowest tier scores (most human-created).
 * Returns a compact DTO for sidebar display.
 */
export const getHallOfFameDTO = cache(
  async (limit = 3): Promise<SourceCompactDTO[]> => {
    return safeQuery(
      async () => {
        const result = await db
          .select({
            name: sources.name,
            id: sources.id,
            slug: sources.slug,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
          })
          .from(sources)
          .innerJoin(
            sourceScoreCache,
            eq(sources.id, sourceScoreCache.sourceId),
          )
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          )
          .orderBy(sourceScoreCache.tier, desc(sourceScoreCache.claimCount))
          .limit(limit);

        return result.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          tier: row.tier ?? null,
          claims: row.claimCount ?? 0,
        }));
      },
      [],
      "getHallOfFameDTO",
    );
  },
);

/**
 * Get sources with highest tier scores (most AI-generated).
 * Returns a compact DTO for sidebar display.
 */
export const getHallOfShameDTO = cache(
  async (limit = 3): Promise<SourceCompactDTO[]> => {
    return safeQuery(
      async () => {
        const result = await db
          .select({
            name: sources.name,
            id: sources.id,
            slug: sources.slug,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
          })
          .from(sources)
          .innerJoin(
            sourceScoreCache,
            eq(sources.id, sourceScoreCache.sourceId),
          )
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          )
          .orderBy(
            desc(sourceScoreCache.tier),
            desc(sourceScoreCache.claimCount),
          )
          .limit(limit);

        return result.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          tier: row.tier ?? null,
          claims: row.claimCount ?? 0,
        }));
      },
      [],
      "getHallOfShameDTO",
    );
  },
);

/**
 * Get aggregated site statistics.
 * Returns counts only - no sensitive data.
 */
export const getSiteStatsDTO = cache(async (): Promise<SiteStatsDTO> => {
  return safeQuery(
    async () => {
      const [sourcesResult, claimsResult, usersResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(sources)
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          ),
        db
          .select({ count: count() })
          .from(claims)
          .where(isNull(claims.deletedAt)),
        db.select({ count: count() }).from(user),
      ]);

      return {
        sources: sourcesResult[0]?.count ?? 0,
        claims: claimsResult[0]?.count ?? 0,
        users: usersResult[0]?.count ?? 0,
      };
    },
    { sources: 0, claims: 0, users: 0 },
    "getSiteStatsDTO",
  );
});

// =============================================================================
// BROWSE / SEARCH DATA ACCESS
// =============================================================================

export interface SourceTreeNodeDTO {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  tier: number | null;
  claimCount: number;
  depth: number;
  parentId: string | null;
  childCount: number;
  isMatch: boolean; // true if this item matched the search, false if it's an ancestor for context
}

export interface BrowseFilters {
  query?: string;
  type?: string;
  tierMin?: number;
  tierMax?: number;
}

// Maximum depth to load initially (0 = root only, 1 = root + direct children)
const INITIAL_LOAD_DEPTH = 1;
// Maximum children to show per parent before "load more"
const CHILDREN_PER_PAGE = 20;

/**
 * Get sources for the browse page with optional filters.
 * Returns a flat list that can be rendered as a tree on the client.
 * - Without filters: loads only depth 0-1 for fast initial load
 * - With filters: loads matching sources + their ancestors
 */
export const getSourcesForBrowseDTO = cache(
  async (filters: BrowseFilters = {}): Promise<SourceTreeNodeDTO[]> => {
    return safeQuery(
      async () => {
        const hasFilters =
          filters.query ||
          filters.type ||
          filters.tierMin !== undefined ||
          filters.tierMax !== undefined;

        // Build filter conditions
        const filterConditions = [
          isNull(sources.deletedAt),
          eq(sources.approvalStatus, "approved"),
        ];

        if (filters.type) {
          filterConditions.push(eq(sources.type, filters.type));
        }
        if (filters.tierMin !== undefined) {
          filterConditions.push(
            sql`COALESCE(${sourceScoreCache.tier}, 0) >= ${filters.tierMin}`,
          );
        }
        if (filters.tierMax !== undefined) {
          filterConditions.push(
            sql`COALESCE(${sourceScoreCache.tier}, 0) <= ${filters.tierMax}`,
          );
        }
        if (filters.query) {
          const searchTerm = `%${filters.query}%`;
          filterConditions.push(
            sql`(${sources.name} ILIKE ${searchTerm} OR ${sources.description} ILIKE ${searchTerm})`,
          );
        }

        // If no filters, only load shallow tree (depth 0-1)
        if (!hasFilters) {
          filterConditions.push(sql`${sources.depth} <= ${INITIAL_LOAD_DEPTH}`);
        }

        // Get the matching sources
        const matchingResults = await db
          .select({
            id: sources.id,
            slug: sources.slug,
            name: sources.name,
            type: sources.type,
            depth: sources.depth,
            parentId: sources.parentId,
            path: sources.path,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
          })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .where(and(...filterConditions))
          .orderBy(asc(sources.depth), asc(sources.name))
          .limit(200);

        const matchingIds = new Set(matchingResults.map((r) => r.id));

        // If we have filters and results, also fetch ancestors to maintain tree structure
        let ancestorResults: typeof matchingResults = [];
        if (hasFilters && matchingResults.length > 0) {
          // Extract all ancestor IDs from the path column
          // Path format: "uuid1.uuid2.uuid3" where uuid3 is the source itself
          const ancestorIds = new Set<string>();
          for (const row of matchingResults) {
            if (row.path) {
              const pathParts = row.path.split(".");
              // Add all ancestors (excluding the item itself which is the last part)
              for (let i = 0; i < pathParts.length - 1; i++) {
                const ancestorId = pathParts[i];
                if (ancestorId && !matchingIds.has(ancestorId)) {
                  ancestorIds.add(ancestorId);
                }
              }
            }
          }

          // Fetch ancestor sources if any
          if (ancestorIds.size > 0) {
            const ancestorIdArray = Array.from(ancestorIds);
            ancestorResults = await db
              .select({
                id: sources.id,
                slug: sources.slug,
                name: sources.name,
                type: sources.type,
                depth: sources.depth,
                parentId: sources.parentId,
                path: sources.path,
                tier: sourceScoreCache.tier,
                claimCount: sourceScoreCache.claimCount,
              })
              .from(sources)
              .leftJoin(
                sourceScoreCache,
                eq(sources.id, sourceScoreCache.sourceId),
              )
              .where(
                and(
                  sql`${sources.id} = ANY(ARRAY[${sql.raw(ancestorIdArray.map((id) => `'${id}'::uuid`).join(","))}])`,
                  isNull(sources.deletedAt),
                  eq(sources.approvalStatus, "approved"),
                ),
              )
              .orderBy(asc(sources.depth), asc(sources.name));
          }
        }

        // Combine matching and ancestor results
        const allResults = [...ancestorResults, ...matchingResults];

        // Dedupe by ID (ancestors might overlap)
        const seenIds = new Set<string>();
        const deduped = allResults.filter((row) => {
          if (seenIds.has(row.id)) return false;
          seenIds.add(row.id);
          return true;
        });

        // Sort by depth then name
        deduped.sort((a, b) => {
          if (a.depth !== b.depth) return a.depth - b.depth;
          return a.name.localeCompare(b.name);
        });

        // Get child counts
        const ids = deduped.map((r) => r.id);
        const childCounts =
          ids.length > 0
            ? await db
                .select({
                  parentId: sources.parentId,
                  count: count(),
                })
                .from(sources)
                .where(
                  and(
                    sql`${sources.parentId} = ANY(ARRAY[${sql.raw(ids.map((id) => `'${id}'::uuid`).join(","))}])`,
                    isNull(sources.deletedAt),
                    eq(sources.approvalStatus, "approved"),
                  ),
                )
                .groupBy(sources.parentId)
            : [];

        const childCountMap = new Map(
          childCounts.map((c) => [c.parentId, c.count]),
        );

        return deduped.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          type: row.type,
          tier: row.tier ?? null,
          claimCount: row.claimCount ?? 0,
          depth: row.depth,
          parentId: row.parentId,
          childCount: childCountMap.get(row.id) ?? 0,
          isMatch: matchingIds.has(row.id),
        }));
      },
      [],
      "getSourcesForBrowseDTO",
    );
  },
);

/**
 * Get children of a specific source for lazy loading.
 * Used when expanding a node in the tree view.
 */
export async function getSourceChildrenDTO(
  parentId: string,
  limit: number = CHILDREN_PER_PAGE,
  offset: number = 0,
): Promise<{ children: SourceTreeNodeDTO[]; hasMore: boolean }> {
  const result = await db
    .select({
      id: sources.id,
      slug: sources.slug,
      name: sources.name,
      type: sources.type,
      depth: sources.depth,
      parentId: sources.parentId,
      tier: sourceScoreCache.tier,
      claimCount: sourceScoreCache.claimCount,
    })
    .from(sources)
    .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
    .where(
      and(
        eq(sources.parentId, parentId),
        isNull(sources.deletedAt),
        eq(sources.approvalStatus, "approved"),
      ),
    )
    .orderBy(desc(sourceScoreCache.claimCount), asc(sources.name))
    .limit(limit + 1) // Fetch one extra to check if there are more
    .offset(offset);

  const hasMore = result.length > limit;
  const children = result.slice(0, limit);

  // Get child counts for these children
  const ids = children.map((r) => r.id);
  const childCounts =
    ids.length > 0
      ? await db
          .select({
            parentId: sources.parentId,
            count: count(),
          })
          .from(sources)
          .where(
            and(
              sql`${sources.parentId} = ANY(ARRAY[${sql.raw(ids.map((id) => `'${id}'::uuid`).join(","))}])`,
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          )
          .groupBy(sources.parentId)
      : [];

  const childCountMap = new Map(childCounts.map((c) => [c.parentId, c.count]));

  return {
    children: children.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      type: row.type,
      tier: row.tier ?? null,
      claimCount: row.claimCount ?? 0,
      depth: row.depth,
      parentId: row.parentId,
      childCount: childCountMap.get(row.id) ?? 0,
      isMatch: true, // Lazy-loaded children are always "matches" in context
    })),
    hasMore,
  };
}

/**
 * Get unique source types for filter dropdown.
 */
export const getSourceTypesDTO = cache(async (): Promise<string[]> => {
  return safeQuery(
    async () => {
      const result = await db
        .selectDistinct({ type: sources.type })
        .from(sources)
        .where(
          and(
            isNull(sources.deletedAt),
            eq(sources.approvalStatus, "approved"),
            sql`${sources.type} IS NOT NULL`,
          ),
        )
        .orderBy(asc(sources.type));

      return result.map((r) => r.type).filter((t): t is string => t !== null);
    },
    [],
    "getSourceTypesDTO",
  );
});

// =============================================================================
// SOURCE DETAIL DATA ACCESS
// =============================================================================

export const getSourceDetailByIdDTO = cache(
  async (sourceId: string): Promise<SourceDetailDTO | null> => {
    return safeQuery(
      async () => {
        const currentUser = await getCurrentUser();

        const approvalCondition = currentUser
          ? or(
              eq(sources.approvalStatus, "approved"),
              and(
                eq(sources.approvalStatus, "pending"),
                eq(sources.createdByUserId, currentUser.id),
              ),
            )
          : eq(sources.approvalStatus, "approved");

        const result = await db
          .select({
            id: sources.id,
            slug: sources.slug,
            name: sources.name,
            type: sources.type,
            description: sources.description,
            url: sources.url,
            parentId: sources.parentId,
            path: sources.path,
            depth: sources.depth,
            createdAt: sources.createdAt,
            createdByUsername: user.displayUsername,
            createdByHandle: user.username,
            officialAiPolicy: sources.officialAiPolicy,
            officialAiPolicyUrl: sources.officialAiPolicyUrl,
            officialAiPolicyUpdatedAt: sources.officialAiPolicyUpdatedAt,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
            rawScore: sourceScoreCache.rawScore,
            normalizedScore: sourceScoreCache.normalizedScore,
          })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .leftJoin(user, eq(sources.createdByUserId, user.id))
          .where(
            and(
              eq(sources.id, sourceId),
              isNull(sources.deletedAt),
              approvalCondition,
            ),
          )
          .limit(1);

        const row = result[0];
        if (!row) return null;

        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          type: row.type,
          description: row.description,
          url: row.url,
          parentId: row.parentId,
          path: row.path,
          depth: row.depth,
          createdAt: row.createdAt.toISOString(),
          createdByUsername: row.createdByUsername,
          createdByHandle: row.createdByHandle,
          tier: row.tier ?? null,
          claimCount: row.claimCount ?? 0,
          rawScore: row.rawScore ? Number(row.rawScore) : null,
          normalizedScore: row.normalizedScore
            ? Number(row.normalizedScore)
            : null,
          officialAiPolicy: row.officialAiPolicy,
          officialAiPolicyUrl: row.officialAiPolicyUrl,
          officialAiPolicyUpdatedAt: row.officialAiPolicyUpdatedAt
            ? row.officialAiPolicyUpdatedAt.toISOString()
            : null,
        };
      },
      null,
      `getSourceDetailByIdDTO(${sourceId})`,
    );
  },
);

export const getSourceDetailBySlugPathDTO = cache(
  async (slugPath: string[]): Promise<SourceDetailDTO | null> => {
    return safeQuery(
      async () => {
        if (slugPath.length === 0) return null;

        let parentId: string | null = null;
        let currentId: string | null = null;

        for (const slug of slugPath) {
          const result: { id: string }[] = await db
            .select({ id: sources.id })
            .from(sources)
            .where(
              and(
                eq(sources.slug, slug),
                parentId
                  ? eq(sources.parentId, parentId)
                  : isNull(sources.parentId),
                isNull(sources.deletedAt),
                eq(sources.approvalStatus, "approved"),
              ),
            )
            .limit(1);

          const row: { id: string } | undefined = result[0];
          if (!row) return null;
          currentId = row.id;
          parentId = row.id;
        }

        if (!currentId) return null;
        return getSourceDetailByIdDTO(currentId);
      },
      null,
      `getSourceDetailBySlugPathDTO(${slugPath.join("/")})`,
    );
  },
);

export const getSourceBreadcrumbsDTO = cache(
  async (path: string): Promise<SourceBreadcrumbDTO[]> => {
    return safeQuery(
      async () => {
        const ids = path.split(".").filter(Boolean);
        if (ids.length === 0) return [];

        const results = await db
          .select({
            id: sources.id,
            slug: sources.slug,
            name: sources.name,
            depth: sources.depth,
          })
          .from(sources)
          .where(
            and(
              sql`${sources.id} = ANY(ARRAY[${sql.raw(
                ids.map((id) => `'${id}'::uuid`).join(","),
              )}])`,
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          )
          .orderBy(asc(sources.depth));

        return results;
      },
      [],
      "getSourceBreadcrumbsDTO",
    );
  },
);

export const getSourceChildrenSummaryDTO = cache(
  async (
    parentId: string,
    limit = 20,
  ): Promise<{ children: SourceChildDTO[]; total: number }> => {
    return safeQuery(
      async () => {
        const [countResult, childrenResult] = await Promise.all([
          db
            .select({ count: count() })
            .from(sources)
            .where(
              and(
                eq(sources.parentId, parentId),
                isNull(sources.deletedAt),
                eq(sources.approvalStatus, "approved"),
              ),
            ),
          db
            .select({
              id: sources.id,
              slug: sources.slug,
              name: sources.name,
              type: sources.type,
              tier: sourceScoreCache.tier,
              claimCount: sourceScoreCache.claimCount,
            })
            .from(sources)
            .leftJoin(
              sourceScoreCache,
              eq(sources.id, sourceScoreCache.sourceId),
            )
            .where(
              and(
                eq(sources.parentId, parentId),
                isNull(sources.deletedAt),
                eq(sources.approvalStatus, "approved"),
              ),
            )
            .orderBy(desc(sourceScoreCache.claimCount), asc(sources.name))
            .limit(limit),
        ]);

        const children = childrenResult.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          type: row.type,
          tier: row.tier ?? null,
          claimCount: row.claimCount ?? 0,
          childCount: 0,
        }));

        const ids = children.map((child) => child.id);
        const childCounts =
          ids.length > 0
            ? await db
                .select({
                  parentId: sources.parentId,
                  count: count(),
                })
                .from(sources)
                .where(
                  and(
                    sql`${sources.parentId} = ANY(ARRAY[${sql.raw(
                      ids.map((id) => `'${id}'::uuid`).join(","),
                    )}])`,
                    isNull(sources.deletedAt),
                    eq(sources.approvalStatus, "approved"),
                  ),
                )
                .groupBy(sources.parentId)
            : [];

        const childCountMap = new Map(
          childCounts.map((row) => [row.parentId, row.count]),
        );

        const enriched = children.map((child) => ({
          ...child,
          childCount: childCountMap.get(child.id) ?? 0,
        }));

        return {
          children: enriched,
          total: countResult[0]?.count ?? 0,
        };
      },
      { children: [], total: 0 },
      `getSourceChildrenSummaryDTO(${parentId})`,
    );
  },
);

export const getSourceClaimsDTO = cache(
  async (
    sourceId: string,
    sort: SourceClaimSort,
    requestedPage = 1,
    pageSize = 10,
  ): Promise<SourceClaimsPageDTO> => {
    return safeQuery(
      async () => {
        // Get current user for vote lookup
        const currentUser = await getCurrentUser();

        const commentCounts = db
          .select({
            claimId: claimComments.claimId,
            commentCount: count(claimComments.id).as("comment_count"),
            disputeCount:
              sql<number>`SUM(CASE WHEN ${claimComments.isDispute} THEN 1 ELSE 0 END)`.as(
                "dispute_count",
              ),
          })
          .from(claimComments)
          .innerJoin(claims, eq(claimComments.claimId, claims.id))
          .where(
            and(
              eq(claims.sourceId, sourceId),
              isNull(claims.deletedAt),
              isNull(claimComments.deletedAt),
            ),
          )
          .groupBy(claimComments.claimId)
          .as("comment_counts");

        const countResult = await db
          .select({ count: count() })
          .from(claims)
          .where(and(eq(claims.sourceId, sourceId), isNull(claims.deletedAt)));

        const total = countResult[0]?.count ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, requestedPage), totalPages);
        const offset = (page - 1) * pageSize;

        const orderBy =
          sort === "helpful"
            ? [desc(claims.helpfulVotes), desc(claims.createdAt)]
            : [desc(claims.createdAt)];

        const result = await db
          .select({
            id: claims.id,
            impact: claims.impact,
            confidence: claims.confidence,
            content: claims.content,
            helpfulVotes: claims.helpfulVotes,
            notHelpfulVotes: claims.notHelpfulVotes,
            commentCount: commentCounts.commentCount,
            disputeCount: commentCounts.disputeCount,
            createdAt: claims.createdAt,
            contentUpdatedAt: claims.contentUpdatedAt,
            userId: user.id,
            username: user.username,
            displayUsername: user.displayUsername,
            avatarUrl: user.avatarUrl,
            reputation: user.reputation,
          })
          .from(claims)
          .innerJoin(user, eq(claims.userId, user.id))
          .leftJoin(commentCounts, eq(claims.id, commentCounts.claimId))
          .where(and(eq(claims.sourceId, sourceId), isNull(claims.deletedAt)))
          .orderBy(...orderBy)
          .limit(pageSize)
          .offset(offset);

        // Get user votes for these claims if logged in
        const claimIds = result.map((r) => r.id);
        let userVotesMap: Map<string, boolean> = new Map();

        if (currentUser && claimIds.length > 0) {
          const userVotes = await db
            .select({
              claimId: claimVotes.claimId,
              isHelpful: claimVotes.isHelpful,
            })
            .from(claimVotes)
            .where(
              and(
                eq(claimVotes.userId, currentUser.id),
                inArray(claimVotes.claimId, claimIds),
              ),
            );

          userVotesMap = new Map(
            userVotes.map((v) => [v.claimId, v.isHelpful]),
          );
        }

        return {
          claims: result.map((row) => ({
            id: row.id,
            impact: row.impact,
            confidence: row.confidence,
            content: row.content,
            helpfulVotes: row.helpfulVotes,
            notHelpfulVotes: row.notHelpfulVotes,
            commentCount: Number(row.commentCount ?? 0),
            disputeCount: Number(row.disputeCount ?? 0),
            createdAt: row.createdAt.toISOString(),
            isEdited: row.contentUpdatedAt !== null,
            userVote: userVotesMap.get(row.id) ?? null,
            user: {
              id: row.userId,
              username: row.username,
              displayUsername: row.displayUsername,
              avatarUrl: row.avatarUrl,
              reputation: row.reputation,
            },
          })),
          total,
          page,
          pageSize,
          totalPages,
          sort,
        };
      },
      {
        claims: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 1,
        sort,
      },
      `getSourceClaimsDTO(${sourceId}, ${sort}, ${requestedPage})`,
    );
  },
);

// =============================================================================
// DISCOVERY / BROWSE PAGES DATA ACCESS
// =============================================================================

export interface DiscoverySourceDTO {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  tier: number | null;
  claimCount: number;
}

export interface DiscoveryPageDTO<T = DiscoverySourceDTO> {
  sources: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: string;
}

export interface RecentlyAddedSourceDTO extends DiscoverySourceDTO {
  createdAt: Date;
  addedBy: string | null;
}

export interface ControversialSourceDTO extends DiscoverySourceDTO {
  controversyScore: number;
  totalVotes: number;
}

export interface DisputedSourceDTO extends DiscoverySourceDTO {
  disputeCount: number;
}

const DISCOVERY_PAGE_SIZE = 20;

/**
 * Get recently added sources with pagination.
 * Sort options: "newest" (default) | "oldest"
 */
export const getRecentlyAddedPageDTO = cache(
  async (
    requestedPage = 1,
    sort: "newest" | "oldest" = "newest",
    pageSize = DISCOVERY_PAGE_SIZE,
  ): Promise<DiscoveryPageDTO<RecentlyAddedSourceDTO>> => {
    const fallback: DiscoveryPageDTO<RecentlyAddedSourceDTO> = {
      sources: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      sort,
    };
    return safeQuery(
      async () => {
        const countResult = await db
          .select({ count: count() })
          .from(sources)
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          );

        const total = countResult[0]?.count ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, requestedPage), totalPages);
        const offset = (page - 1) * pageSize;

        const orderBy =
          sort === "oldest"
            ? [asc(sources.createdAt)]
            : [desc(sources.createdAt)];

        const result = await db
          .select({
            id: sources.id,
            slug: sources.slug,
            name: sources.name,
            type: sources.type,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
            createdAt: sources.createdAt,
            addedBy: user.name,
          })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .leftJoin(user, eq(sources.createdByUserId, user.id))
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          )
          .orderBy(...orderBy)
          .limit(pageSize)
          .offset(offset);

        return {
          sources: result.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            type: row.type,
            tier: row.tier ?? null,
            claimCount: row.claimCount ?? 0,
            createdAt: row.createdAt,
            addedBy: row.addedBy ?? null,
          })),
          total,
          page,
          pageSize,
          totalPages,
          sort,
        };
      },
      fallback,
      `getRecentlyAddedPageDTO(${requestedPage}, ${sort})`,
    );
  },
);

/**
 * Get Hall of Shame sources (tier >= 3) with pagination.
 * Sort options: "tier" (default) | "claims"
 */
export const getHallOfShamePageDTO = cache(
  async (
    requestedPage = 1,
    sort: "tier" | "claims" = "tier",
    pageSize = DISCOVERY_PAGE_SIZE,
  ): Promise<DiscoveryPageDTO> => {
    const fallback: DiscoveryPageDTO = {
      sources: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      sort,
    };
    return safeQuery(
      async () => {
        const whereConditions = and(
          isNull(sources.deletedAt),
          eq(sources.approvalStatus, "approved"),
          sql`${sourceScoreCache.tier} >= 3`,
        );

        const countResult = await db
          .select({ count: count() })
          .from(sources)
          .innerJoin(
            sourceScoreCache,
            eq(sources.id, sourceScoreCache.sourceId),
          )
          .where(whereConditions);

        const total = countResult[0]?.count ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, requestedPage), totalPages);
        const offset = (page - 1) * pageSize;

        const orderBy =
          sort === "claims"
            ? [desc(sourceScoreCache.claimCount), desc(sourceScoreCache.tier)]
            : [desc(sourceScoreCache.tier), desc(sourceScoreCache.claimCount)];

        const result = await db
          .select({
            id: sources.id,
            slug: sources.slug,
            name: sources.name,
            type: sources.type,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
          })
          .from(sources)
          .innerJoin(
            sourceScoreCache,
            eq(sources.id, sourceScoreCache.sourceId),
          )
          .where(whereConditions)
          .orderBy(...orderBy)
          .limit(pageSize)
          .offset(offset);

        return {
          sources: result.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            type: row.type,
            tier: row.tier ?? null,
            claimCount: row.claimCount ?? 0,
          })),
          total,
          page,
          pageSize,
          totalPages,
          sort,
        };
      },
      fallback,
      `getHallOfShamePageDTO(${requestedPage}, ${sort})`,
    );
  },
);

/**
 * Get Hall of Fame sources (tier <= 1) with pagination.
 * Sort options: "tier" (default) | "claims"
 */
export const getHallOfFamePageDTO = cache(
  async (
    requestedPage = 1,
    sort: "tier" | "claims" = "tier",
    pageSize = DISCOVERY_PAGE_SIZE,
  ): Promise<DiscoveryPageDTO> => {
    const fallback: DiscoveryPageDTO = {
      sources: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      sort,
    };
    return safeQuery(
      async () => {
        const whereConditions = and(
          isNull(sources.deletedAt),
          eq(sources.approvalStatus, "approved"),
          sql`${sourceScoreCache.tier} <= 1`,
        );

        const countResult = await db
          .select({ count: count() })
          .from(sources)
          .innerJoin(
            sourceScoreCache,
            eq(sources.id, sourceScoreCache.sourceId),
          )
          .where(whereConditions);

        const total = countResult[0]?.count ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, requestedPage), totalPages);
        const offset = (page - 1) * pageSize;

        const orderBy =
          sort === "claims"
            ? [desc(sourceScoreCache.claimCount), asc(sourceScoreCache.tier)]
            : [asc(sourceScoreCache.tier), desc(sourceScoreCache.claimCount)];

        const result = await db
          .select({
            id: sources.id,
            slug: sources.slug,
            name: sources.name,
            type: sources.type,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
          })
          .from(sources)
          .innerJoin(
            sourceScoreCache,
            eq(sources.id, sourceScoreCache.sourceId),
          )
          .where(whereConditions)
          .orderBy(...orderBy)
          .limit(pageSize)
          .offset(offset);

        return {
          sources: result.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            type: row.type,
            tier: row.tier ?? null,
            claimCount: row.claimCount ?? 0,
          })),
          total,
          page,
          pageSize,
          totalPages,
          sort,
        };
      },
      fallback,
      `getHallOfFamePageDTO(${requestedPage}, ${sort})`,
    );
  },
);

/**
 * Get most controversial sources (most evenly split votes) with pagination.
 * Sort options: "controversy" (default) | "votes"
 */
export const getMostControversialPageDTO = cache(
  async (
    requestedPage = 1,
    sort: "controversy" | "votes" = "controversy",
    pageSize = DISCOVERY_PAGE_SIZE,
  ): Promise<DiscoveryPageDTO<ControversialSourceDTO>> => {
    const fallback: DiscoveryPageDTO<ControversialSourceDTO> = {
      sources: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      sort,
    };
    return safeQuery(
      async () => {
        const sourceVotes = db
          .select({
            sourceId: claims.sourceId,
            totalHelpful:
              sql<number>`COALESCE(SUM(${claims.helpfulVotes}), 0)`.as(
                "total_helpful",
              ),
            totalNotHelpful:
              sql<number>`COALESCE(SUM(${claims.notHelpfulVotes}), 0)`.as(
                "total_not_helpful",
              ),
            totalVotes:
              sql<number>`COALESCE(SUM(${claims.helpfulVotes} + ${claims.notHelpfulVotes}), 0)`.as(
                "total_votes",
              ),
            controversyScore:
              sql<number>`LEAST(COALESCE(SUM(${claims.helpfulVotes}), 0), COALESCE(SUM(${claims.notHelpfulVotes}), 0))`.as(
                "controversy_score",
              ),
          })
          .from(claims)
          .where(isNull(claims.deletedAt))
          .groupBy(claims.sourceId)
          .as("source_votes");

        const countResult = await db
          .select({ count: count() })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .innerJoin(sourceVotes, eq(sources.id, sourceVotes.sourceId))
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          );

        const total = countResult[0]?.count ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, requestedPage), totalPages);
        const offset = (page - 1) * pageSize;

        const orderBy =
          sort === "votes"
            ? [desc(sourceVotes.totalVotes)]
            : [desc(sourceVotes.controversyScore)];

        const result = await db
          .select({
            id: sources.id,
            slug: sources.slug,
            name: sources.name,
            type: sources.type,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
            controversyScore: sourceVotes.controversyScore,
            totalVotes: sourceVotes.totalVotes,
          })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .innerJoin(sourceVotes, eq(sources.id, sourceVotes.sourceId))
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          )
          .orderBy(...orderBy)
          .limit(pageSize)
          .offset(offset);

        return {
          sources: result.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            type: row.type,
            tier: row.tier ?? null,
            claimCount: row.claimCount ?? 0,
            controversyScore: Number(row.controversyScore),
            totalVotes: Number(row.totalVotes),
          })),
          total,
          page,
          pageSize,
          totalPages,
          sort,
        };
      },
      fallback,
      `getMostControversialPageDTO(${requestedPage}, ${sort})`,
    );
  },
);

/**
 * Get most disputed sources (most dispute comments) with pagination.
 * Sort: "disputes" (default only)
 */
export const getDisputedPageDTO = cache(
  async (
    requestedPage = 1,
    sort = "disputes",
    pageSize = DISCOVERY_PAGE_SIZE,
  ): Promise<DiscoveryPageDTO<DisputedSourceDTO>> => {
    const fallback: DiscoveryPageDTO<DisputedSourceDTO> = {
      sources: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      sort,
    };
    return safeQuery(
      async () => {
        const sourceDisputes = db
          .select({
            sourceId: claims.sourceId,
            disputeCount: sql<number>`COUNT(${claimComments.id})`.as(
              "dispute_count",
            ),
          })
          .from(claimComments)
          .innerJoin(claims, eq(claimComments.claimId, claims.id))
          .where(
            and(
              eq(claimComments.isDispute, true),
              isNull(claimComments.deletedAt),
              isNull(claims.deletedAt),
            ),
          )
          .groupBy(claims.sourceId)
          .as("source_disputes");

        const countResult = await db
          .select({ count: count() })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .innerJoin(sourceDisputes, eq(sources.id, sourceDisputes.sourceId))
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          );

        const total = countResult[0]?.count ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, requestedPage), totalPages);
        const offset = (page - 1) * pageSize;

        const result = await db
          .select({
            id: sources.id,
            slug: sources.slug,
            name: sources.name,
            type: sources.type,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
            disputeCount: sourceDisputes.disputeCount,
          })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .innerJoin(sourceDisputes, eq(sources.id, sourceDisputes.sourceId))
          .where(
            and(
              isNull(sources.deletedAt),
              eq(sources.approvalStatus, "approved"),
            ),
          )
          .orderBy(desc(sourceDisputes.disputeCount))
          .limit(pageSize)
          .offset(offset);

        return {
          sources: result.map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            type: row.type,
            tier: row.tier ?? null,
            claimCount: row.claimCount ?? 0,
            disputeCount: Number(row.disputeCount),
          })),
          total,
          page,
          pageSize,
          totalPages,
          sort,
        };
      },
      fallback,
      `getDisputedPageDTO(${requestedPage}, ${sort})`,
    );
  },
);

export const getClaimCommentsDTO = cache(
  async (claimId: string): Promise<ClaimCommentDTO[]> => {
    return safeQuery(
      async () => {
        // Get current user for vote lookup
        const currentUser = await getCurrentUser();

        const result = await db
          .select({
            id: claimComments.id,
            claimId: claimComments.claimId,
            content: claimComments.content,
            isDispute: claimComments.isDispute,
            helpfulVotes: claimComments.helpfulVotes,
            createdAt: claimComments.createdAt,
            updatedAt: claimComments.updatedAt,
            userId: user.id,
            username: user.username,
            displayUsername: user.displayUsername,
            avatarUrl: user.avatarUrl,
            reputation: user.reputation,
          })
          .from(claimComments)
          .innerJoin(user, eq(claimComments.userId, user.id))
          .where(
            and(
              eq(claimComments.claimId, claimId),
              isNull(claimComments.deletedAt),
            ),
          )
          .orderBy(
            desc(claimComments.isDispute), // Disputes first (true sorts before false)
            desc(claimComments.helpfulVotes), // Then by helpfulness
            desc(claimComments.createdAt), // Then by recency
          );

        // Batch-fetch current user's votes for all returned comments
        const commentIds = result.map((r) => r.id);
        let userVotesMap: Map<string, boolean> = new Map();

        if (currentUser && commentIds.length > 0) {
          const userVotes = await db
            .select({
              commentId: commentVotes.commentId,
              isHelpful: commentVotes.isHelpful,
            })
            .from(commentVotes)
            .where(
              and(
                eq(commentVotes.userId, currentUser.id),
                inArray(commentVotes.commentId, commentIds),
              ),
            );

          userVotesMap = new Map(
            userVotes.map((v) => [v.commentId, v.isHelpful]),
          );
        }

        return result.map((row) => ({
          id: row.id,
          claimId: row.claimId,
          content: row.content,
          isDispute: row.isDispute,
          helpfulVotes: row.helpfulVotes,
          createdAt: row.createdAt.toISOString(),
          isEdited: row.updatedAt.getTime() > row.createdAt.getTime(),
          userVote: userVotesMap.get(row.id) ?? null,
          user: {
            id: row.userId,
            username: row.username,
            displayUsername: row.displayUsername,
            avatarUrl: row.avatarUrl,
            reputation: row.reputation,
          },
        }));
      },
      [],
      `getClaimCommentsDTO(${claimId})`,
    );
  },
);
