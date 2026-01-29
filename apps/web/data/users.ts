import "server-only";

import { cache } from "react";
import {
  db,
  user,
  claims,
  sources,
  claimVotes,
  sourceScoreCache,
} from "@repo/database";
import { eq, count, desc, isNull, and, sql } from "drizzle-orm";

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
    console.error(`[Database Error] ${context}:`, error);
    return fallback;
  }
}

// DTOs - Data Transfer Objects (safe to pass to client components)

export interface UserProfileDTO {
  id: string;
  username: string;
  displayUsername: string;
  name: string;
  avatarUrl: string | null;
  reputation: number;
  role: string;
  joinedAt: string;
  stats: {
    claimsCount: number;
    sourcesAdded: number;
    helpfulVotes: number;
  };
}

export interface UserClaimDTO {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: string | null;
  sourceSlug: string;
  impact: number;
  confidence: number;
  content: string;
  helpfulVotes: number;
  notHelpfulVotes: number;
  createdAt: string;
  isEdited: boolean;
}

export interface UserSourceDTO {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  tier: number | null;
  claimCount: number;
  createdAt: string;
}

export interface UserStatsDTO {
  claimsCount: number;
  sourcesAdded: number;
  helpfulVotesReceived: number;
  votesGiven: number;
}

/**
 * Get user profile by username.
 * Returns null if user not found.
 */
export const getUserByUsernameDTO = cache(
  async (username: string): Promise<UserProfileDTO | null> => {
    return safeQuery(
      async () => {
        const normalizedUsername = username.toLowerCase();

        const result = await db
          .select({
            id: user.id,
            username: user.username,
            displayUsername: user.displayUsername,
            name: user.name,
            avatarUrl: user.avatarUrl,
            reputation: user.reputation,
            role: user.role,
            createdAt: user.createdAt,
          })
          .from(user)
          .where(eq(user.username, normalizedUsername))
          .limit(1);

        const userData = result[0];
        if (!userData) {
          return null;
        }

        // Get user stats
        const [claimsResult, sourcesResult, helpfulVotesResult] =
          await Promise.all([
            db
              .select({ count: count() })
              .from(claims)
              .where(
                and(eq(claims.userId, userData.id), isNull(claims.deletedAt)),
              ),
            db
              .select({ count: count() })
              .from(sources)
              .where(
                and(
                  eq(sources.createdByUserId, userData.id),
                  isNull(sources.deletedAt),
                ),
              ),
            db
              .select({
                total: sql<number>`COALESCE(SUM(${claims.helpfulVotes}), 0)`.as(
                  "total",
                ),
              })
              .from(claims)
              .where(
                and(eq(claims.userId, userData.id), isNull(claims.deletedAt)),
              ),
          ]);

        return {
          id: userData.id,
          username: userData.username || normalizedUsername,
          displayUsername:
            userData.displayUsername || userData.username || normalizedUsername,
          name: userData.name,
          avatarUrl: userData.avatarUrl ?? null,
          reputation: userData.reputation,
          role: userData.role,
          joinedAt: userData.createdAt.toISOString(),
          stats: {
            claimsCount: claimsResult[0]?.count ?? 0,
            sourcesAdded: sourcesResult[0]?.count ?? 0,
            helpfulVotes: Number(helpfulVotesResult[0]?.total) || 0,
          },
        };
      },
      null,
      `getUserByUsernameDTO(${username})`,
    );
  },
);

/**
 * Get user profile by ID.
 * Returns null if user not found.
 */
export const getUserByIdDTO = cache(
  async (userId: string): Promise<UserProfileDTO | null> => {
    return safeQuery(
      async () => {
        const result = await db
          .select({
            id: user.id,
            username: user.username,
            displayUsername: user.displayUsername,
            name: user.name,
            avatarUrl: user.avatarUrl,
            reputation: user.reputation,
            role: user.role,
            createdAt: user.createdAt,
          })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1);

        const userData = result[0];
        if (!userData) {
          return null;
        }

        // Get user stats
        const [claimsResult, sourcesResult, helpfulVotesResult] =
          await Promise.all([
            db
              .select({ count: count() })
              .from(claims)
              .where(
                and(eq(claims.userId, userData.id), isNull(claims.deletedAt)),
              ),
            db
              .select({ count: count() })
              .from(sources)
              .where(
                and(
                  eq(sources.createdByUserId, userData.id),
                  isNull(sources.deletedAt),
                ),
              ),
            db
              .select({
                total: sql<number>`COALESCE(SUM(${claims.helpfulVotes}), 0)`.as(
                  "total",
                ),
              })
              .from(claims)
              .where(
                and(eq(claims.userId, userData.id), isNull(claims.deletedAt)),
              ),
          ]);

        return {
          id: userData.id,
          username: userData.username || userId,
          displayUsername:
            userData.displayUsername || userData.username || userId,
          name: userData.name,
          avatarUrl: userData.avatarUrl ?? null,
          reputation: userData.reputation,
          role: userData.role,
          joinedAt: userData.createdAt.toISOString(),
          stats: {
            claimsCount: claimsResult[0]?.count ?? 0,
            sourcesAdded: sourcesResult[0]?.count ?? 0,
            helpfulVotes: Number(helpfulVotesResult[0]?.total) || 0,
          },
        };
      },
      null,
      `getUserByIdDTO(${userId})`,
    );
  },
);

/**
 * Get user's claims with source information.
 */
export const getUserClaimsDTO = cache(
  async (userId: string, limit = 10, offset = 0): Promise<UserClaimDTO[]> => {
    return safeQuery(
      async () => {
        const result = await db
          .select({
            id: claims.id,
            sourceId: claims.sourceId,
            sourceName: sources.name,
            sourceType: sources.type,
            sourceSlug: sources.slug,
            impact: claims.impact,
            confidence: claims.confidence,
            content: claims.content,
            helpfulVotes: claims.helpfulVotes,
            notHelpfulVotes: claims.notHelpfulVotes,
            createdAt: claims.createdAt,
            updatedAt: claims.updatedAt,
          })
          .from(claims)
          .innerJoin(sources, eq(claims.sourceId, sources.id))
          .where(and(eq(claims.userId, userId), isNull(claims.deletedAt)))
          .orderBy(desc(claims.createdAt))
          .limit(limit)
          .offset(offset);

        return result.map((row) => ({
          id: row.id,
          sourceId: row.sourceId,
          sourceName: row.sourceName,
          sourceType: row.sourceType,
          sourceSlug: row.sourceSlug,
          impact: row.impact,
          confidence: row.confidence,
          content: row.content,
          helpfulVotes: row.helpfulVotes,
          notHelpfulVotes: row.notHelpfulVotes,
          createdAt: row.createdAt.toISOString(),
          isEdited: row.updatedAt.getTime() > row.createdAt.getTime(),
        }));
      },
      [],
      `getUserClaimsDTO(${userId})`,
    );
  },
);

/**
 * Get sources added by user.
 */
export const getUserSourcesDTO = cache(
  async (userId: string, limit = 10, offset = 0): Promise<UserSourceDTO[]> => {
    return safeQuery(
      async () => {
        const result = await db
          .select({
            id: sources.id,
            name: sources.name,
            slug: sources.slug,
            type: sources.type,
            createdAt: sources.createdAt,
            tier: sourceScoreCache.tier,
            claimCount: sourceScoreCache.claimCount,
          })
          .from(sources)
          .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
          .where(
            and(eq(sources.createdByUserId, userId), isNull(sources.deletedAt)),
          )
          .orderBy(desc(sources.createdAt))
          .limit(limit)
          .offset(offset);

        return result.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          type: row.type,
          tier: row.tier ? Number(row.tier) : null,
          claimCount: row.claimCount ?? 0,
          createdAt: row.createdAt.toISOString(),
        }));
      },
      [],
      `getUserSourcesDTO(${userId})`,
    );
  },
);

/**
 * Get detailed user statistics.
 */
export const getUserStatsDTO = cache(
  async (userId: string): Promise<UserStatsDTO> => {
    return safeQuery(
      async () => {
        const [claimsResult, sourcesResult, helpfulVotesResult, votesResult] =
          await Promise.all([
            db
              .select({ count: count() })
              .from(claims)
              .where(and(eq(claims.userId, userId), isNull(claims.deletedAt))),
            db
              .select({ count: count() })
              .from(sources)
              .where(
                and(
                  eq(sources.createdByUserId, userId),
                  isNull(sources.deletedAt),
                ),
              ),
            db
              .select({
                total: sql<number>`COALESCE(SUM(${claims.helpfulVotes}), 0)`.as(
                  "total",
                ),
              })
              .from(claims)
              .where(and(eq(claims.userId, userId), isNull(claims.deletedAt))),
            db
              .select({ count: count() })
              .from(claimVotes)
              .where(eq(claimVotes.userId, userId)),
          ]);

        return {
          claimsCount: claimsResult[0]?.count ?? 0,
          sourcesAdded: sourcesResult[0]?.count ?? 0,
          helpfulVotesReceived: Number(helpfulVotesResult[0]?.total) || 0,
          votesGiven: votesResult[0]?.count ?? 0,
        };
      },
      {
        claimsCount: 0,
        sourcesAdded: 0,
        helpfulVotesReceived: 0,
        votesGiven: 0,
      },
      `getUserStatsDTO(${userId})`,
    );
  },
);
