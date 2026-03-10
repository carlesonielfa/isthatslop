// PUBLIC API EXCEPTION: This route is the explicit exception to the DAL "no API routes"
// rule. It exists to serve the browser extension and third-party developers.
// See: .planning/STATE.md Decisions.

import "server-only";
import { createHash } from "crypto";
import { db, sources, sourceScoreCache } from "@repo/database";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import type { NextRequest } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = checkRateLimit(`dump:${ip}`, RATE_LIMITS.DUMP);
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(rl.retryAfter),
        },
      },
    );
  }

  const rows = await db
    .select({ url: sources.url, tier: sourceScoreCache.tier })
    .from(sources)
    .innerJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
    .where(
      and(
        isNull(sources.deletedAt),
        eq(sources.approvalStatus, "approved"),
        isNotNull(sourceScoreCache.tier),
        isNotNull(sources.url),
      ),
    );

  const entries = rows.map((row) => ({
    urlHash: createHash("sha256")
      .update(row.url as string)
      .digest("hex")
      .slice(0, 16),
    tier: row.tier as number,
  }));

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      count: entries.length,
      entries,
    },
    { status: 200, headers: CORS_HEADERS },
  );
}
