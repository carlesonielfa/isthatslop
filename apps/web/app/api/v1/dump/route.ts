// PUBLIC API EXCEPTION: This route is the explicit exception to the DAL "no API routes"
// rule. It exists to serve the browser extension and third-party developers.
// See: .planning/STATE.md Decisions.

import "server-only";
import { createHash } from "crypto";
import { db, sources, sourceScoreCache } from "@repo/database";

function normalizeUrl(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase();
}
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { createEndpointCache } from "@/lib/endpoint-cache";
import type { NextRequest } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface DumpPayload {
  generatedAt: string;
  count: number;
  entries: { urlHash: string; tier: number }[];
}

const dumpCache = createEndpointCache<DumpPayload>({
  ttlMs: 2 * 60 * 60 * 1000, // 2 hours
});

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

  const payload = await dumpCache.get(async () => {
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
        .update(normalizeUrl(row.url as string))
        .digest("hex")
        .slice(0, 16),
      tier: row.tier as number,
    }));

    return {
      generatedAt: new Date().toISOString(),
      count: entries.length,
      entries,
    };
  });

  return Response.json(payload, { status: 200, headers: CORS_HEADERS });
}
