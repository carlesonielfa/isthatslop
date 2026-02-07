import { NextRequest } from "next/server";
import { db, sourceScoreCache, claims } from "@repo/database";
import { calculateSourceScore } from "@repo/scoring";
import { eq, and, isNull, sql, gt, or } from "drizzle-orm";

/**
 * GET /api/cron/recalculate-scores
 *
 * Cron-callable endpoint that processes stale scores in batches.
 * Designed to be called by external cron (system cron, Hetzner cron, or manual curl).
 *
 * Authentication: Requires CRON_SECRET environment variable (Bearer token).
 * In development (NODE_ENV !== 'production'), auth is optional for testing.
 *
 * Algorithm:
 * 1. Query stale scores (WHERE recalculation_requested_at > last_calculated_at)
 * 2. For each stale source, fetch all active claims
 * 3. Calculate new score using @repo/scoring algorithm
 * 4. Update source_score_cache with new tier, scores, and timestamp
 * 5. Return processing stats (processed count, remaining count)
 */
export async function GET(request: NextRequest) {
  // Authenticate the request
  const cronSecret = process.env.CRON_SECRET;
  const isDevelopment = process.env.NODE_ENV !== "production";

  // In production, CRON_SECRET is required
  if (!isDevelopment && !cronSecret) {
    console.error("[Cron] CRON_SECRET not configured in production");
    return Response.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  // Check authorization header if CRON_SECRET is set
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${cronSecret}`;

    if (authHeader !== expectedAuth) {
      console.warn("[Cron] Unauthorized recalculation attempt");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (!isDevelopment) {
    // Production without CRON_SECRET should have been caught above
    return Response.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  // In development without CRON_SECRET, allow unauthenticated access

  const startTime = Date.now();

  try {
    // Query stale scores (oldest first, batch of 100)
    const staleScores = await db
      .select({
        sourceId: sourceScoreCache.sourceId,
      })
      .from(sourceScoreCache)
      .where(
        or(
          // recalculation_requested_at > last_calculated_at
          and(
            sql`${sourceScoreCache.recalculationRequestedAt} IS NOT NULL`,
            sql`${sourceScoreCache.lastCalculatedAt} IS NOT NULL`,
            gt(
              sourceScoreCache.recalculationRequestedAt,
              sourceScoreCache.lastCalculatedAt,
            ),
          ),
          // OR recalculation_requested_at IS NOT NULL AND last_calculated_at IS NULL
          and(
            sql`${sourceScoreCache.recalculationRequestedAt} IS NOT NULL`,
            isNull(sourceScoreCache.lastCalculatedAt),
          ),
        ),
      )
      .orderBy(
        sql`${sourceScoreCache.recalculationRequestedAt} ASC NULLS FIRST`,
      )
      .limit(100);

    console.log(`[Cron] Found ${staleScores.length} stale scores to process`);

    let processed = 0;
    const errors: string[] = [];

    // Process each stale score
    for (const { sourceId } of staleScores) {
      try {
        // Fetch all active claims for this source
        const claimResults = await db
          .select({
            impact: claims.impact,
            confidence: claims.confidence,
            helpfulVotes: claims.helpfulVotes,
          })
          .from(claims)
          .where(and(eq(claims.sourceId, sourceId), isNull(claims.deletedAt)));

        if (claimResults.length === 0) {
          // No claims: update cache to empty state
          await db
            .update(sourceScoreCache)
            .set({
              tier: null,
              rawScore: null,
              normalizedScore: null,
              claimCount: 0,
              lastCalculatedAt: new Date(),
            })
            .where(eq(sourceScoreCache.sourceId, sourceId));
        } else {
          // Calculate score using algorithm
          const score = calculateSourceScore(claimResults);

          // Update cache with new score
          await db
            .update(sourceScoreCache)
            .set({
              tier: score.tier,
              rawScore: score.rawScore.toFixed(2),
              normalizedScore: score.normalizedScore.toFixed(2),
              claimCount: score.claimCount,
              lastCalculatedAt: new Date(),
            })
            .where(eq(sourceScoreCache.sourceId, sourceId));
        }

        processed++;
      } catch (error) {
        console.error(`[Cron] Error processing source ${sourceId}:`, error);
        errors.push(sourceId);
      }
    }

    // Count remaining stale scores
    const remainingResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sourceScoreCache)
      .where(
        or(
          and(
            sql`${sourceScoreCache.recalculationRequestedAt} IS NOT NULL`,
            sql`${sourceScoreCache.lastCalculatedAt} IS NOT NULL`,
            gt(
              sourceScoreCache.recalculationRequestedAt,
              sourceScoreCache.lastCalculatedAt,
            ),
          ),
          and(
            sql`${sourceScoreCache.recalculationRequestedAt} IS NOT NULL`,
            isNull(sourceScoreCache.lastCalculatedAt),
          ),
        ),
      );

    const remaining = Number(remainingResult[0]?.count ?? 0);
    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Processed ${processed} scores in ${duration}ms, ${remaining} remaining`,
    );

    return Response.json({
      success: true,
      processed,
      remaining,
      errors: errors.length > 0 ? errors : undefined,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error in recalculation job:", error);
    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
