"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  flags,
  moderationLogs,
  sources,
  claims,
  claimComments,
} from "@repo/database";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser, isModerator } from "@/app/lib/auth.server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";

// =============================================================================
// TYPES
// =============================================================================

export type FlagTargetType = "claim" | "source" | "comment";
export type FlagReason = "spam" | "abuse" | "incorrect_info" | "duplicate";

export interface FlagContentInput {
  targetType: FlagTargetType;
  targetId: string;
  reason: FlagReason;
}

export interface FlagContentResult {
  success: boolean;
  error?: string;
}

export interface ModerationActionResult {
  success: boolean;
  error?: string;
}

const VALID_REASONS: FlagReason[] = [
  "spam",
  "abuse",
  "incorrect_info",
  "duplicate",
];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Detect unique constraint violation errors (PostgreSQL error code 23505).
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

/**
 * Look up the owner user ID for a flaggable target.
 * Returns null if the target does not exist.
 */
async function getTargetOwnerId(
  targetType: FlagTargetType,
  targetId: string,
): Promise<string | null> {
  if (targetType === "claim") {
    const rows = await db
      .select({ userId: claims.userId })
      .from(claims)
      .where(and(eq(claims.id, targetId), isNull(claims.deletedAt)))
      .limit(1);
    return rows[0]?.userId ?? null;
  }

  if (targetType === "source") {
    const rows = await db
      .select({ userId: sources.createdByUserId })
      .from(sources)
      .where(and(eq(sources.id, targetId), isNull(sources.deletedAt)))
      .limit(1);
    return rows[0]?.userId ?? null;
  }

  if (targetType === "comment") {
    const rows = await db
      .select({ userId: claimComments.userId })
      .from(claimComments)
      .where(
        and(
          eq(claimComments.id, targetId),
          isNull(claimComments.deletedAt),
        ),
      )
      .limit(1);
    return rows[0]?.userId ?? null;
  }

  return null;
}

// =============================================================================
// FLAG CONTENT
// =============================================================================

/**
 * Flag a piece of content (claim, source, or comment) with a reason category.
 *
 * Rules:
 * - User must be logged in
 * - Rate limited: 20 flags per hour
 * - Reason must be one of the four valid categories
 * - User cannot flag their own content
 * - User cannot submit duplicate pending flags on the same item
 */
export async function flagContent(
  input: FlagContentInput,
): Promise<FlagContentResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in to flag content" };
    }

    // Rate limit
    const rl = checkRateLimit(`flag:${user.id}`, RATE_LIMITS.FLAG);
    if (!rl.allowed) {
      return {
        success: false,
        error: `Too many flags. Try again in ${rl.retryAfter} seconds.`,
      };
    }

    // Validate reason
    if (!VALID_REASONS.includes(input.reason)) {
      return { success: false, error: "Invalid flag reason" };
    }

    // Check target exists and get owner
    const ownerId = await getTargetOwnerId(input.targetType, input.targetId);
    if (ownerId === null) {
      return { success: false, error: "Content not found" };
    }

    // Prevent self-flagging
    if (ownerId === user.id) {
      return { success: false, error: "You cannot flag your own content" };
    }

    // Insert the flag (unique constraint on userId + targetType + targetId + pending handled by DB)
    await db.insert(flags).values({
      targetType: input.targetType,
      targetId: input.targetId,
      userId: user.id,
      reason: input.reason,
      status: "pending",
    });

    return { success: true };
  } catch (error) {
    // Unique constraint violation: user already has a pending flag on this item
    if (isUniqueViolation(error)) {
      return { success: false, error: "You already flagged this item" };
    }
    console.error("Error flagging content:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// RESOLVE FLAG
// =============================================================================

/**
 * Resolve (approve or dismiss) a pending flag.
 * Moderator only.
 */
export async function resolveFlag(
  flagId: string,
  action: "approve" | "dismiss",
  reason?: string,
): Promise<ModerationActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const mod = await isModerator();
    if (!mod) {
      return { success: false, error: "Moderator access required" };
    }

    const newStatus = action === "approve" ? "resolved" : "dismissed";
    const actionLog =
      action === "approve" ? "resolve_flag" : "dismiss_flag";

    await db.transaction(async (tx) => {
      // Update flag status
      await tx
        .update(flags)
        .set({
          status: newStatus,
          resolvedByUserId: user.id,
          resolvedAt: new Date(),
        })
        .where(eq(flags.id, flagId));

      // Insert moderation log
      await tx.insert(moderationLogs).values({
        moderatorId: user.id,
        action: actionLog,
        targetType: "flag",
        targetId: flagId,
        reason: reason ?? null,
      });
    });

    revalidatePath("/mod/flags");

    return { success: true };
  } catch (error) {
    console.error("Error resolving flag:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// REMOVE CONTENT
// =============================================================================

/**
 * Soft-delete a piece of content.
 * Moderator only.
 */
export async function removeContent(
  targetType: "claim" | "source" | "comment",
  targetId: string,
  reason?: string,
): Promise<ModerationActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const mod = await isModerator();
    if (!mod) {
      return { success: false, error: "Moderator access required" };
    }

    await db.transaction(async (tx) => {
      // Soft-delete the target
      if (targetType === "claim") {
        await tx
          .update(claims)
          .set({ deletedAt: new Date() })
          .where(eq(claims.id, targetId));
      } else if (targetType === "source") {
        await tx
          .update(sources)
          .set({ deletedAt: new Date() })
          .where(eq(sources.id, targetId));
      } else if (targetType === "comment") {
        await tx
          .update(claimComments)
          .set({ deletedAt: new Date() })
          .where(eq(claimComments.id, targetId));
      }

      // Insert moderation log
      await tx.insert(moderationLogs).values({
        moderatorId: user.id,
        action: "remove_content",
        targetType,
        targetId,
        reason: reason ?? null,
      });
    });

    revalidatePath("/mod");

    return { success: true };
  } catch (error) {
    console.error("Error removing content:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// APPROVE / REJECT SOURCE
// =============================================================================

/**
 * Approve a pending source submission.
 * Moderator only.
 */
export async function approveSource(
  sourceId: string,
  reason?: string,
): Promise<ModerationActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const mod = await isModerator();
    if (!mod) {
      return { success: false, error: "Moderator access required" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(sources)
        .set({ approvalStatus: "approved" })
        .where(eq(sources.id, sourceId));

      await tx.insert(moderationLogs).values({
        moderatorId: user.id,
        action: "approve_source",
        targetType: "source",
        targetId: sourceId,
        reason: reason ?? null,
      });
    });

    revalidatePath("/mod/sources");
    revalidatePath("/browse");

    return { success: true };
  } catch (error) {
    console.error("Error approving source:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Reject a pending source submission.
 * Moderator only.
 */
export async function rejectSource(
  sourceId: string,
  reason?: string,
): Promise<ModerationActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const mod = await isModerator();
    if (!mod) {
      return { success: false, error: "Moderator access required" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(sources)
        .set({ approvalStatus: "rejected" })
        .where(eq(sources.id, sourceId));

      await tx.insert(moderationLogs).values({
        moderatorId: user.id,
        action: "reject_source",
        targetType: "source",
        targetId: sourceId,
        reason: reason ?? null,
      });
    });

    revalidatePath("/mod/sources");

    return { success: true };
  } catch (error) {
    console.error("Error rejecting source:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
