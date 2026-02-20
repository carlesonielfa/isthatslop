import "server-only";

import { cache } from "react";
import {
  db,
  flags,
  moderationLogs,
  sources,
  user,
} from "@repo/database";
import { eq, desc, count, and, gte } from "drizzle-orm";
import { formatTimeAgo } from "@/lib/date";

// =============================================================================
// TYPES / DTOs
// =============================================================================

export interface ModDashboardStatsDTO {
  pendingFlagsCount: number;
  pendingSourcesCount: number;
  recentModActionsCount: number;
}

export interface PendingFlagDTO {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
  flaggerUsername: string | null;
  flaggerId: string;
}

export interface PendingFlagsPageDTO {
  flags: PendingFlagDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PendingSourceDTO {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  description: string | null;
  url: string | null;
  createdAt: string;
  submittedByUsername: string | null;
  submittedById: string;
}

export interface PendingSourcesPageDTO {
  sources: PendingSourceDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ModerationLogDTO {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: string;
  moderatorUsername: string | null;
  moderatorId: string;
}

export interface ModerationLogsPageDTO {
  logs: ModerationLogDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =============================================================================
// MOD DASHBOARD STATS
// =============================================================================

/**
 * Get summary counts for the moderation dashboard.
 * - Pending flags count
 * - Pending sources count
 * - Mod actions in the last 7 days
 */
export const getModDashboardStatsDTO = cache(
  async (): Promise<ModDashboardStatsDTO> => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [pendingFlagsResult, pendingSourcesResult, recentActionsResult] =
      await Promise.all([
        db
          .select({ total: count() })
          .from(flags)
          .where(eq(flags.status, "pending")),
        db
          .select({ total: count() })
          .from(sources)
          .where(eq(sources.approvalStatus, "pending")),
        db
          .select({ total: count() })
          .from(moderationLogs)
          .where(gte(moderationLogs.createdAt, sevenDaysAgo)),
      ]);

    return {
      pendingFlagsCount: pendingFlagsResult[0]?.total ?? 0,
      pendingSourcesCount: pendingSourcesResult[0]?.total ?? 0,
      recentModActionsCount: recentActionsResult[0]?.total ?? 0,
    };
  },
);

// =============================================================================
// PENDING FLAGS
// =============================================================================

/**
 * Get paginated list of pending flags for the moderation queue.
 */
export const getPendingFlagsDTO = cache(
  async (page = 1, pageSize = 20): Promise<PendingFlagsPageDTO> => {
    const offset = (page - 1) * pageSize;

    const [totalResult, rows] = await Promise.all([
      db
        .select({ total: count() })
        .from(flags)
        .where(eq(flags.status, "pending")),
      db
        .select({
          id: flags.id,
          targetType: flags.targetType,
          targetId: flags.targetId,
          reason: flags.reason,
          status: flags.status,
          createdAt: flags.createdAt,
          flaggerId: flags.userId,
          flaggerUsername: user.username,
        })
        .from(flags)
        .leftJoin(flaggerAlias, eq(flags.userId, flaggerAlias.id))
        .where(eq(flags.status, "pending"))
        .orderBy(desc(flags.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return {
      flags: rows.map((row) => ({
        id: row.id,
        targetType: row.targetType,
        targetId: row.targetId,
        reason: row.reason,
        status: row.status,
        createdAt: formatTimeAgo(row.createdAt),
        flaggerId: row.flaggerId,
        flaggerUsername: row.flaggerUsername ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
);

// =============================================================================
// PENDING SOURCES
// =============================================================================

/**
 * Get paginated list of sources pending approval.
 */
export const getPendingSourcesDTO = cache(
  async (page = 1, pageSize = 20): Promise<PendingSourcesPageDTO> => {
    const offset = (page - 1) * pageSize;

    const [totalResult, rows] = await Promise.all([
      db
        .select({ total: count() })
        .from(sources)
        .where(
          and(
            eq(sources.approvalStatus, "pending"),
          ),
        ),
      db
        .select({
          id: sources.id,
          name: sources.name,
          slug: sources.slug,
          type: sources.type,
          description: sources.description,
          url: sources.url,
          createdAt: sources.createdAt,
          submittedById: sources.createdByUserId,
          submittedByUsername: user.username,
        })
        .from(sources)
        .leftJoin(user, eq(sources.createdByUserId, user.id))
        .where(
          and(
            eq(sources.approvalStatus, "pending"),
          ),
        )
        .orderBy(desc(sources.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return {
      sources: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        type: row.type,
        description: row.description,
        url: row.url,
        createdAt: formatTimeAgo(row.createdAt),
        submittedById: row.submittedById,
        submittedByUsername: row.submittedByUsername ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
);

// =============================================================================
// MODERATION LOGS
// =============================================================================

/**
 * Get paginated moderation action logs with moderator username.
 */
export const getModerationLogsDTO = cache(
  async (page = 1, pageSize = 20): Promise<ModerationLogsPageDTO> => {
    const offset = (page - 1) * pageSize;

    const [totalResult, rows] = await Promise.all([
      db.select({ total: count() }).from(moderationLogs),
      db
        .select({
          id: moderationLogs.id,
          action: moderationLogs.action,
          targetType: moderationLogs.targetType,
          targetId: moderationLogs.targetId,
          reason: moderationLogs.reason,
          createdAt: moderationLogs.createdAt,
          moderatorId: moderationLogs.moderatorId,
          moderatorUsername: user.username,
        })
        .from(moderationLogs)
        .leftJoin(user, eq(moderationLogs.moderatorId, user.id))
        .orderBy(desc(moderationLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return {
      logs: rows.map((row) => ({
        id: row.id,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        reason: row.reason,
        createdAt: formatTimeAgo(row.createdAt),
        moderatorId: row.moderatorId,
        moderatorUsername: row.moderatorUsername ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
);
