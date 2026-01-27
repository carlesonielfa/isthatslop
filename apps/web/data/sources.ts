import "server-only";

import { cache } from "react";
import { db, sources, sourceScoreCache, reviews, user } from "@repo/database";
import { desc, eq, isNull, count, and, sql, asc } from "drizzle-orm";
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
  type: string | null;
  tier: number;
  reviews: number;
  addedBy: string;
  timeAgo: string;
}

export interface SourceCompactDTO {
  name: string;
  tier: number;
  reviews: number;
}

export interface SiteStatsDTO {
  sources: number;
  reviews: number;
  users: number;
}

// Tier configuration - public data, safe to expose
export const tiers = [
  { tier: 0, name: "Pure Artisanal", icon: "sparkle", color: "#006400" },
  { tier: 1, name: "AI-Inspired", icon: "lightbulb", color: "#008000" },
  { tier: 2, name: "AI-Polished", icon: "check", color: "#90EE90" },
  { tier: 3, name: "Co-Created", icon: "handshake", color: "#FFD700" },
  { tier: 4, name: "Human-Guided", icon: "target", color: "#FF8C00" },
  { tier: 5, name: "Light Edit", icon: "magnifying-glass", color: "#FF4500" },
  { tier: 6, name: "Pure Slop", icon: "robot", color: "#FF0000" },
] as const;

export type TierInfo = (typeof tiers)[number];

/**
 * Get recent sources with their scores and review counts.
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
            type: sources.type,
            createdAt: sources.createdAt,
            addedByUsername: user.username,
            tier: sourceScoreCache.tier,
            reviewCount: sourceScoreCache.reviewCount,
          })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .leftJoin(user, eq(sources.createdByUserId, user.id))
          .where(isNull(sources.deletedAt))
          .orderBy(desc(sources.createdAt))
          .limit(limit);

        return result.map((row, index) => ({
          id: row.id,
          rank: index + 1,
          name: row.name,
          type: row.type,
          tier: row.tier ? Math.round(Number(row.tier)) : 3,
          reviews: row.reviewCount ?? 0,
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
            tier: sourceScoreCache.tier,
            reviewCount: sourceScoreCache.reviewCount,
          })
          .from(sources)
          .innerJoin(
            sourceScoreCache,
            eq(sources.id, sourceScoreCache.sourceId),
          )
          .where(isNull(sources.deletedAt))
          .orderBy(sourceScoreCache.tier, desc(sourceScoreCache.reviewCount))
          .limit(limit);

        return result.map((row) => ({
          name: row.name,
          tier: row.tier ? Math.round(Number(row.tier)) : 0,
          reviews: row.reviewCount ?? 0,
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
            tier: sourceScoreCache.tier,
            reviewCount: sourceScoreCache.reviewCount,
          })
          .from(sources)
          .innerJoin(
            sourceScoreCache,
            eq(sources.id, sourceScoreCache.sourceId),
          )
          .where(isNull(sources.deletedAt))
          .orderBy(
            desc(sourceScoreCache.tier),
            desc(sourceScoreCache.reviewCount),
          )
          .limit(limit);

        return result.map((row) => ({
          name: row.name,
          tier: row.tier ? Math.round(Number(row.tier)) : 6,
          reviews: row.reviewCount ?? 0,
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
      const [sourcesResult, reviewsResult, usersResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(sources)
          .where(isNull(sources.deletedAt)),
        db
          .select({ count: count() })
          .from(reviews)
          .where(isNull(reviews.deletedAt)),
        db.select({ count: count() }).from(user),
      ]);

      return {
        sources: sourcesResult[0]?.count ?? 0,
        reviews: reviewsResult[0]?.count ?? 0,
        users: usersResult[0]?.count ?? 0,
      };
    },
    { sources: 0, reviews: 0, users: 0 },
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
  reviewCount: number;
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
        const filterConditions = [isNull(sources.deletedAt)];

        if (filters.type) {
          filterConditions.push(eq(sources.type, filters.type));
        }
        if (filters.tierMin !== undefined) {
          filterConditions.push(
            sql`COALESCE(${sourceScoreCache.tier}, 3) >= ${filters.tierMin}`,
          );
        }
        if (filters.tierMax !== undefined) {
          filterConditions.push(
            sql`COALESCE(${sourceScoreCache.tier}, 3) <= ${filters.tierMax}`,
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
            reviewCount: sourceScoreCache.reviewCount,
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
                reviewCount: sourceScoreCache.reviewCount,
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
          tier: row.tier ? Math.round(Number(row.tier)) : null,
          reviewCount: row.reviewCount ?? 0,
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
      reviewCount: sourceScoreCache.reviewCount,
    })
    .from(sources)
    .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
    .where(and(eq(sources.parentId, parentId), isNull(sources.deletedAt)))
    .orderBy(desc(sourceScoreCache.reviewCount), asc(sources.name))
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
      tier: row.tier ? Math.round(Number(row.tier)) : null,
      reviewCount: row.reviewCount ?? 0,
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
        .where(and(isNull(sources.deletedAt), sql`${sources.type} IS NOT NULL`))
        .orderBy(asc(sources.type));

      return result.map((r) => r.type).filter((t): t is string => t !== null);
    },
    [],
    "getSourceTypesDTO",
  );
});
