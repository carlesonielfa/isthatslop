// PUBLIC API EXCEPTION: This route is the explicit exception to the DAL "no API routes"
// rule. It exists to serve the browser extension and third-party developers.
// See: .planning/STATE.md Decisions.
import { type NextRequest } from "next/server";
import { db, sources, sourceScoreCache } from "@repo/database";
import { eq, and, isNull } from "drizzle-orm";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";

const CORS_HEADERS = {
  // TODO: lock down to chrome-extension://<ID> once extension has a stable ID (Phase 12)
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function lookupSourceById(id: string) {
  // 5-minute TTL on the client side via Cache-Control header
  return db
    .select({
      id: sources.id,
      name: sources.name,
      tier: sourceScoreCache.tier,
      claimCount: sourceScoreCache.claimCount,
    })
    .from(sources)
    .leftJoin(sourceScoreCache, eq(sources.id, sourceScoreCache.sourceId))
    .where(
      and(
        eq(sources.id, id),
        isNull(sources.deletedAt),
        eq(sources.approvalStatus, "approved"),
      ),
    )
    .limit(1);
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;

  // Validate UUID format before hitting the DB
  if (!id || !UUID_RE.test(id)) {
    return Response.json(
      { error: "Invalid source ID" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  let result: Awaited<ReturnType<typeof lookupSourceById>>;
  try {
    result = await lookupSourceById(id);
  } catch (err) {
    console.error("[api/v1/sources/:id] DB lookup error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  if (!result[0]) {
    return Response.json(
      { error: "Source not found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const row = result[0];
  return Response.json(
    {
      id: row.id,
      name: row.name,
      tier: row.tier ?? null,
      claimCount: row.claimCount ?? 0,
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    },
  );
}
