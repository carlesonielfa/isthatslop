"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  sources,
  sourcePaths,
  claims,
  claimVotes,
  claimComments,
  sourceScoreCache,
} from "@repo/database";
import { eq, and, isNull, sql, desc, asc } from "drizzle-orm";
import { getCurrentUser, isEmailVerified } from "@/app/lib/auth.server";
import { getSourceChildrenDTO } from "./sources";
import type { SourceTreeNodeDTO } from "./sources";
import {
  validateImpact,
  validateConfidence,
  validateClaimContent,
  validateCommentContent,
  validateSourceName,
  generateSlug,
  validateSlug,
} from "@/lib/validation";
import { calculateSourceScore } from "@/lib/scoring";

/**
 * Server action to fetch children of a source for lazy loading in the browse tree.
 */
export async function fetchSourceChildren(
  parentId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ children: SourceTreeNodeDTO[]; hasMore: boolean }> {
  return getSourceChildrenDTO(parentId, limit, offset);
}

// =============================================================================
// CLAIM ACTIONS
// =============================================================================

export interface SubmitClaimInput {
  sourceId: string;
  content: string;
  impact: number;
  confidence: number;
}

export interface SubmitClaimResult {
  success: boolean;
  claimId?: string;
  error?: string;
}

/**
 * Submit a new claim of AI usage for a source.
 */
export async function submitClaim(
  input: SubmitClaimInput,
): Promise<SubmitClaimResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "You must be logged in to submit a claim",
      };
    }

    const verified = await isEmailVerified();
    if (!verified) {
      return {
        success: false,
        error: "Please verify your email address before submitting claims",
      };
    }

    // Validate impact
    const impactValidation = validateImpact(input.impact);
    if (!impactValidation.valid) {
      return { success: false, error: impactValidation.error };
    }

    // Validate confidence
    const confidenceValidation = validateConfidence(input.confidence);
    if (!confidenceValidation.valid) {
      return { success: false, error: confidenceValidation.error };
    }

    // Validate content length
    const contentValidation = validateClaimContent(input.content);
    if (!contentValidation.valid) {
      return { success: false, error: contentValidation.error };
    }

    // Check if source exists
    const sourceResult = await db
      .select({ id: sources.id })
      .from(sources)
      .where(and(eq(sources.id, input.sourceId), isNull(sources.deletedAt)))
      .limit(1);

    if (sourceResult.length === 0) {
      return { success: false, error: "Source not found" };
    }

    // Note: Users can submit multiple claims per source (different pieces of evidence/observations).
    // This action does not enforce rate limiting or spam prevention; callers or upstream middleware
    // are responsible for limiting abuse (e.g. per-user/per-source rate limits).

    // Insert the claim
    const insertResult = await db
      .insert(claims)
      .values({
        sourceId: input.sourceId,
        userId: user.id,
        content: input.content,
        impact: input.impact,
        confidence: input.confidence,
      })
      .returning({ id: claims.id });

    const claimId = insertResult[0]?.id;
    if (!claimId) {
      return { success: false, error: "Failed to create claim" };
    }

    // Update the source score cache
    await updateSourceScoreCache(input.sourceId);

    // Revalidate the source page
    revalidatePath(`/sources/${input.sourceId}`);
    revalidatePath("/");

    return { success: true, claimId };
  } catch (error) {
    console.error("Error submitting claim:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update the score cache for a source after claim changes.
 * Uses the algorithmic scoring based on impact, confidence, and helpful votes.
 */
async function updateSourceScoreCache(sourceId: string): Promise<void> {
  // Get all claims for this source
  const claimResults = await db
    .select({
      impact: claims.impact,
      confidence: claims.confidence,
      helpfulVotes: claims.helpfulVotes,
    })
    .from(claims)
    .where(and(eq(claims.sourceId, sourceId), isNull(claims.deletedAt)));

  if (claimResults.length === 0) {
    // No claims, delete the cache entry if it exists
    await db
      .delete(sourceScoreCache)
      .where(eq(sourceScoreCache.sourceId, sourceId));
    return;
  }

  // Calculate score using the algorithm
  const score = calculateSourceScore(claimResults);

  // Upsert the score cache
  await db
    .insert(sourceScoreCache)
    .values({
      sourceId,
      tier: score.tier,
      rawScore: score.rawScore.toFixed(2),
      normalizedScore: score.normalizedScore.toFixed(2),
      claimCount: score.claimCount,
      lastCalculatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: sourceScoreCache.sourceId,
      set: {
        tier: score.tier,
        rawScore: score.rawScore.toFixed(2),
        normalizedScore: score.normalizedScore.toFixed(2),
        claimCount: score.claimCount,
        lastCalculatedAt: new Date(),
      },
    });
}

// =============================================================================
// CLAIM VOTE ACTIONS
// =============================================================================

export interface VoteOnClaimInput {
  claimId: string;
  isHelpful: boolean;
}

export interface VoteOnClaimResult {
  success: boolean;
  error?: string;
}

/**
 * Vote on a claim (helpful/not helpful).
 * Voting affects the claim's weight in score calculation.
 */
export async function voteOnClaim(
  input: VoteOnClaimInput,
): Promise<VoteOnClaimResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in to vote" };
    }

    const verified = await isEmailVerified();
    if (!verified) {
      return {
        success: false,
        error: "Please verify your email address before voting",
      };
    }

    // Check if claim exists and get source ID
    const claimResult = await db
      .select({ id: claims.id, sourceId: claims.sourceId })
      .from(claims)
      .where(and(eq(claims.id, input.claimId), isNull(claims.deletedAt)))
      .limit(1);

    if (claimResult.length === 0) {
      return { success: false, error: "Claim not found" };
    }
    const claim = claimResult[0]!;

    // Check if user already voted on this claim
    const existingVote = await db
      .select({ isHelpful: claimVotes.isHelpful })
      .from(claimVotes)
      .where(
        and(
          eq(claimVotes.claimId, input.claimId),
          eq(claimVotes.userId, user.id),
        ),
      )
      .limit(1);

    if (existingVote.length > 0) {
      // Update existing vote if different
      if (existingVote[0]!.isHelpful !== input.isHelpful) {
        await db
          .update(claimVotes)
          .set({ isHelpful: input.isHelpful })
          .where(
            and(
              eq(claimVotes.claimId, input.claimId),
              eq(claimVotes.userId, user.id),
            ),
          );

        // Update vote counts on the claim
        if (input.isHelpful) {
          // Switched from not helpful to helpful
          await db
            .update(claims)
            .set({
              helpfulVotes: sql`${claims.helpfulVotes} + 1`,
              notHelpfulVotes: sql`${claims.notHelpfulVotes} - 1`,
            })
            .where(eq(claims.id, input.claimId));
        } else {
          // Switched from helpful to not helpful
          await db
            .update(claims)
            .set({
              helpfulVotes: sql`${claims.helpfulVotes} - 1`,
              notHelpfulVotes: sql`${claims.notHelpfulVotes} + 1`,
            })
            .where(eq(claims.id, input.claimId));
        }
      }
    } else {
      // Insert new vote
      await db.insert(claimVotes).values({
        claimId: input.claimId,
        userId: user.id,
        isHelpful: input.isHelpful,
      });

      // Update vote count on the claim
      if (input.isHelpful) {
        await db
          .update(claims)
          .set({ helpfulVotes: sql`${claims.helpfulVotes} + 1` })
          .where(eq(claims.id, input.claimId));
      } else {
        await db
          .update(claims)
          .set({ notHelpfulVotes: sql`${claims.notHelpfulVotes} + 1` })
          .where(eq(claims.id, input.claimId));
      }
    }

    // Update source score cache (votes affect claim weight)
    await updateSourceScoreCache(claim.sourceId);

    // Revalidate
    revalidatePath(`/sources/${claim.sourceId}`);
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error voting on claim:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// CLAIM COMMENT ACTIONS
// =============================================================================

export interface SubmitClaimCommentInput {
  claimId: string;
  content: string;
  isDispute: boolean;
}

export interface SubmitClaimCommentResult {
  success: boolean;
  commentId?: string;
  error?: string;
}

/**
 * Submit a comment on a claim.
 * Comments can be flagged as disputes to formally challenge a claim.
 */
export async function submitClaimComment(
  input: SubmitClaimCommentInput,
): Promise<SubmitClaimCommentResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in to comment" };
    }

    const verified = await isEmailVerified();
    if (!verified) {
      return {
        success: false,
        error: "Please verify your email address before commenting",
      };
    }

    // Validate content
    const contentValidation = validateCommentContent(input.content);
    if (!contentValidation.valid) {
      return { success: false, error: contentValidation.error };
    }

    // Check if claim exists
    const claimResult = await db
      .select({ id: claims.id, sourceId: claims.sourceId })
      .from(claims)
      .where(and(eq(claims.id, input.claimId), isNull(claims.deletedAt)))
      .limit(1);

    if (claimResult.length === 0) {
      return { success: false, error: "Claim not found" };
    }
    const claim = claimResult[0]!;

    // Insert the comment
    const insertResult = await db
      .insert(claimComments)
      .values({
        claimId: input.claimId,
        userId: user.id,
        content: input.content,
        isDispute: input.isDispute,
      })
      .returning({ id: claimComments.id });

    const commentId = insertResult[0]?.id;
    if (!commentId) {
      return { success: false, error: "Failed to create comment" };
    }

    // Revalidate
    revalidatePath(`/sources/${claim.sourceId}`);
    revalidatePath("/");

    return { success: true, commentId };
  } catch (error) {
    console.error("Error submitting comment:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// SOURCE ACTIONS
// =============================================================================

export interface CreateSourceInput {
  name: string;
  type?: string;
  description?: string;
  url?: string;
  parentId?: string;
}

export interface CreateSourceResult {
  success: boolean;
  sourceId?: string;
  slug?: string;
  error?: string;
}

/**
 * Helper function to detect unique constraint violation errors
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

/**
 * Create a new source.
 * Uses database transaction to atomically create source + source_paths entry.
 * Retries on slug conflicts (concurrent creation with same name under same parent).
 */
export async function createSource(
  input: CreateSourceInput,
): Promise<CreateSourceResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "You must be logged in to create a source",
      };
    }

    const verified = await isEmailVerified();
    if (!verified) {
      return {
        success: false,
        error: "Please verify your email address before creating sources",
      };
    }

    // Validate name
    const nameValidation = validateSourceName(input.name);
    if (!nameValidation.valid) {
      return { success: false, error: nameValidation.error };
    }

    // Generate and validate slug
    const baseSlug = generateSlug(input.name);
    const slugValidation = validateSlug(baseSlug);
    if (!slugValidation.valid) {
      return { success: false, error: slugValidation.error };
    }

    // Retry loop for slug conflicts
    let attempts = 0;
    const maxAttempts = 3;
    let currentSlug = baseSlug;

    while (attempts < maxAttempts) {
      try {
        const result = await db.transaction(async (tx) => {
          // Determine parent info
          let parentId: string | null = null;
          let parentPath: string = "";
          let depth = 0;

          if (input.parentId) {
            // Verify parent exists using transaction handle
            const parentResult = await tx
              .select({
                id: sources.id,
                path: sources.path,
                depth: sources.depth,
              })
              .from(sources)
              .where(
                and(eq(sources.id, input.parentId), isNull(sources.deletedAt)),
              )
              .limit(1);

            if (parentResult.length === 0) {
              throw new Error("Parent source not found");
            }

            const parent = parentResult[0]!;
            if (parent.depth >= 5) {
              throw new Error("Maximum hierarchy depth reached");
            }

            parentId = parent.id;
            parentPath = parent.path;
            depth = parent.depth + 1;
          }

          // Check for slug conflict within the same parent using transaction handle
          const slugConflict = await tx
            .select({ id: sources.id })
            .from(sources)
            .where(
              and(
                eq(sources.slug, currentSlug),
                parentId
                  ? eq(sources.parentId, parentId)
                  : isNull(sources.parentId),
                isNull(sources.deletedAt),
              ),
            )
            .limit(1);

          if (slugConflict.length > 0) {
            throw new Error("A source with this name already exists");
          }

          // Insert the source using transaction handle
          const insertResult = await tx
            .insert(sources)
            .values({
              slug: currentSlug,
              name: input.name.trim(),
              type: input.type?.trim() || null,
              description: input.description?.trim() || null,
              url: input.url?.trim() || null,
              parentId,
              path: "placeholder", // Will update after
              depth,
              createdByUserId: user.id,
            })
            .returning({ id: sources.id });

          const sourceId = insertResult[0]?.id;
          if (!sourceId) {
            throw new Error("Failed to create source");
          }

          // Calculate path with the actual ID
          const path = parentPath ? `${parentPath}.${sourceId}` : sourceId;

          // Update source path using transaction handle
          await tx
            .update(sources)
            .set({ path })
            .where(eq(sources.id, sourceId));

          // Insert into source_paths table using transaction handle
          await tx.insert(sourcePaths).values({
            sourceId: sourceId,
            ancestorId: parentId || sourceId, // Root sources are their own ancestor
            path: path,
            pathType: "primary",
            depth: depth,
          });

          return { sourceId, slug: currentSlug };
        });

        // Transaction succeeded
        // Revalidate browse page
        revalidatePath("/browse");
        revalidatePath("/");

        return { success: true, sourceId: result.sourceId, slug: result.slug };
      } catch (error: unknown) {
        attempts++;

        // Check if it's a unique constraint violation and we have retries left
        if (isUniqueViolation(error) && attempts < maxAttempts) {
          // Retry with modified slug
          currentSlug = `${baseSlug}-${attempts + 1}`;
          continue;
        }

        // For all other errors or if we're out of retries, throw
        if (error instanceof Error) {
          // Return user-friendly error messages for known error types
          return { success: false, error: error.message };
        }
        throw error;
      }
    }

    // This should never be reached, but satisfies TypeScript
    return {
      success: false,
      error: "Failed to create source after multiple attempts",
    };
  } catch (error) {
    console.error("Error creating source:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// SEARCH ACTIONS
// =============================================================================

export interface SearchSourcesResult {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  tier: number | null;
  claimCount: number;
  path: string;
}

/**
 * Search sources by name for the claim form autocomplete.
 */
export async function searchSources(
  query: string,
  limit: number = 10,
): Promise<SearchSourcesResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = `%${query.trim()}%`;

  const results = await db
    .select({
      id: sources.id,
      name: sources.name,
      slug: sources.slug,
      type: sources.type,
      path: sources.path,
      tier: sourceScoreCache.tier,
      claimCount: sourceScoreCache.claimCount,
    })
    .from(sources)
    .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
    .where(
      and(isNull(sources.deletedAt), sql`${sources.name} ILIKE ${searchTerm}`),
    )
    .orderBy(desc(sourceScoreCache.claimCount), asc(sources.name))
    .limit(limit);

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    tier: row.tier ?? null,
    claimCount: row.claimCount ?? 0,
    path: row.path,
  }));
}
