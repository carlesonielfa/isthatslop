// PUBLIC API EXCEPTION: This route is the explicit exception to the DAL "no API routes"
// rule. It exists to serve the browser extension and third-party developers.
// See: .planning/STATE.md Decisions.
import { type NextRequest } from "next/server";
import { db, sources, sourceScoreCache } from "@repo/database";
import { eq, and, isNull, ilike, desc } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";

const CORS_HEADERS = {
  // TODO: lock down to chrome-extension://<ID> once extension has a stable ID (Phase 12)
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const QuerySchema = z.object({
  url: z.string().min(1).max(500),
});

function normalizeUrl(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

async function lookupSourceByUrl(normalizedUrl: string) {
  return db
    .select({
      id: sources.id,
      name: sources.name,
      slug: sources.slug,
      type: sources.type,
      url: sources.url,
      path: sources.path,
      depth: sources.depth,
      approvalStatus: sources.approvalStatus,
      tier: sourceScoreCache.tier,
      rawScore: sourceScoreCache.rawScore,
      normalizedScore: sourceScoreCache.normalizedScore,
      claimCount: sourceScoreCache.claimCount,
    })
    .from(sources)
    .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
    .where(
      and(
        ilike(sources.url, `%${normalizedUrl}%`),
        isNull(sources.deletedAt),
        eq(sources.approvalStatus, "approved"),
      ),
    )
    .orderBy(desc(sources.depth)) // Most specific match wins (greatest depth)
    .limit(1);
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  // Rate limiting — 120 req/min per IP
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = checkRateLimit(`api-lookup:${ip}`, RATE_LIMITS.API_LOOKUP);
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

  // Validate query params
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return Response.json(
      { error: "Missing required query parameter: url" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const normalizedUrl = normalizeUrl(parsed.data.url);

  let result: Awaited<ReturnType<typeof lookupSourceByUrl>>;
  try {
    result = await lookupSourceByUrl(normalizedUrl);
  } catch (err) {
    console.error("[api/v1/sources] DB lookup error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  if (!result[0]) {
    return Response.json(
      { error: "Source not found", url: parsed.data.url },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const row = result[0];
  return Response.json(
    {
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type ?? null,
      url: row.url ?? null,
      tier: row.tier ?? null,
      score: {
        raw: row.rawScore !== null ? Number(row.rawScore) : null,
        normalized:
          row.normalizedScore !== null ? Number(row.normalizedScore) : null,
      },
      claimCount: row.claimCount ?? 0,
      path: row.path,
      depth: row.depth,
      approvalStatus: row.approvalStatus,
    },
    { status: 200, headers: CORS_HEADERS },
  );
}
