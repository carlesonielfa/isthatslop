import "server-only";

import { cache } from "react";
import { db, sources, sourceScoreCache, reviews, user } from "@repo/database";
import { desc, eq, isNull, count } from "drizzle-orm";

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

// Helper function to format time ago
// TODO: Use a proper date-fns or dayjs library for localization and better formatting
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d`;
  }
  if (diffHours > 0) {
    return `${diffHours}h`;
  }
  return "now";
}

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
