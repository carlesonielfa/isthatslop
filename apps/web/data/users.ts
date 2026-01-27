import "server-only";

import { cache } from "react";
import {
  db,
  user,
  reviews,
  sources,
  reviewVotes,
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
    reviewsCount: number;
    sourcesAdded: number;
    helpfulVotes: number;
  };
}

export interface UserReviewDTO {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: string | null;
  tier: number;
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
  reviewCount: number;
  createdAt: string;
}

export interface UserStatsDTO {
  reviewsCount: number;
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
        const [reviewsResult, sourcesResult, helpfulVotesResult] =
          await Promise.all([
            db
              .select({ count: count() })
              .from(reviews)
              .where(
                and(eq(reviews.userId, userData.id), isNull(reviews.deletedAt)),
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
                total:
                  sql<number>`COALESCE(SUM(${reviews.helpfulVotes}), 0)`.as(
                    "total",
                  ),
              })
              .from(reviews)
              .where(
                and(eq(reviews.userId, userData.id), isNull(reviews.deletedAt)),
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
            reviewsCount: reviewsResult[0]?.count ?? 0,
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
        const [reviewsResult, sourcesResult, helpfulVotesResult] =
          await Promise.all([
            db
              .select({ count: count() })
              .from(reviews)
              .where(
                and(eq(reviews.userId, userData.id), isNull(reviews.deletedAt)),
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
                total:
                  sql<number>`COALESCE(SUM(${reviews.helpfulVotes}), 0)`.as(
                    "total",
                  ),
              })
              .from(reviews)
              .where(
                and(eq(reviews.userId, userData.id), isNull(reviews.deletedAt)),
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
            reviewsCount: reviewsResult[0]?.count ?? 0,
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
 * Get user's reviews with source information.
 */
export const getUserReviewsDTO = cache(
  async (userId: string, limit = 10, offset = 0): Promise<UserReviewDTO[]> => {
    return safeQuery(
      async () => {
        const result = await db
          .select({
            id: reviews.id,
            sourceId: reviews.sourceId,
            sourceName: sources.name,
            sourceType: sources.type,
            tier: reviews.tier,
            content: reviews.content,
            helpfulVotes: reviews.helpfulVotes,
            notHelpfulVotes: reviews.notHelpfulVotes,
            createdAt: reviews.createdAt,
            updatedAt: reviews.updatedAt,
          })
          .from(reviews)
          .innerJoin(sources, eq(reviews.sourceId, sources.id))
          .where(and(eq(reviews.userId, userId), isNull(reviews.deletedAt)))
          .orderBy(desc(reviews.createdAt))
          .limit(limit)
          .offset(offset);

        return result.map((row) => ({
          id: row.id,
          sourceId: row.sourceId,
          sourceName: row.sourceName,
          sourceType: row.sourceType,
          tier: row.tier,
          content: row.content,
          helpfulVotes: row.helpfulVotes,
          notHelpfulVotes: row.notHelpfulVotes,
          createdAt: row.createdAt.toISOString(),
          isEdited: row.updatedAt.getTime() > row.createdAt.getTime(),
        }));
      },
      [],
      `getUserReviewsDTO(${userId})`,
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
            reviewCount: sourceScoreCache.reviewCount,
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
          reviewCount: row.reviewCount ?? 0,
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
        const [reviewsResult, sourcesResult, helpfulVotesResult, votesResult] =
          await Promise.all([
            db
              .select({ count: count() })
              .from(reviews)
              .where(
                and(eq(reviews.userId, userId), isNull(reviews.deletedAt)),
              ),
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
                total:
                  sql<number>`COALESCE(SUM(${reviews.helpfulVotes}), 0)`.as(
                    "total",
                  ),
              })
              .from(reviews)
              .where(
                and(eq(reviews.userId, userId), isNull(reviews.deletedAt)),
              ),
            db
              .select({ count: count() })
              .from(reviewVotes)
              .where(eq(reviewVotes.userId, userId)),
          ]);

        return {
          reviewsCount: reviewsResult[0]?.count ?? 0,
          sourcesAdded: sourcesResult[0]?.count ?? 0,
          helpfulVotesReceived: Number(helpfulVotesResult[0]?.total) || 0,
          votesGiven: votesResult[0]?.count ?? 0,
        };
      },
      {
        reviewsCount: 0,
        sourcesAdded: 0,
        helpfulVotesReceived: 0,
        votesGiven: 0,
      },
      `getUserStatsDTO(${userId})`,
    );
  },
);
