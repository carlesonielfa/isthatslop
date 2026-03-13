// PUBLIC API EXCEPTION: This route is the explicit exception to the DAL "no API routes"
// rule. It exists to serve the browser extension and third-party developers.
// See: .planning/STATE.md Decisions.
import { type NextRequest } from "next/server";
import { db, sources, sourceScoreCache } from "@repo/database";
import { eq, and, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { normalizeUrl } from "@repo/scoring";
import { requireAuth } from "@/app/api/v1/lib/auth";
import { auth } from "@/app/lib/auth";
import { validateSourceName, generateSlug } from "@isthatslop/validation";

const CORS_HEADERS = {
  // TODO: lock down to chrome-extension://<ID> once extension has a stable ID (Phase 12)
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const QuerySchema = z.object({
  url: z.string().min(1).max(500),
});

export { normalizeUrl };

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
        sql`lower(regexp_replace(${sources.url}, '^https?://', '')) = ${normalizedUrl}`,
        isNull(sources.deletedAt),
        eq(sources.approvalStatus, "approved"),
      ),
    )
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

const CreateSourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(500),
});

export async function POST(request: NextRequest) {
  // Auth check
  const authResult = await requireAuth(request);
  if (!authResult.ok) {
    return new Response(authResult.response.body, {
      status: authResult.response.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Email verification check
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.emailVerified) {
    return Response.json(
      { error: "Email verification required" },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // Rate limiting
  const rl = checkRateLimit(
    `source-create:${authResult.userId}`,
    RATE_LIMITS.SOURCE_CREATE,
  );
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { ...CORS_HEADERS, "Retry-After": String(rl.retryAfter) },
      },
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const parsed = CreateSourceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Domain validation
  const nameResult = validateSourceName(parsed.data.name);
  if (!nameResult.valid) {
    return Response.json(
      { error: nameResult.error },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const slug = generateSlug(parsed.data.name);
  if (!slug) {
    return Response.json(
      { error: "Invalid source name" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Insert source (two-step materialized path for root node)
  const inserted = await db
    .insert(sources)
    .values({
      name: parsed.data.name,
      url: parsed.data.url,
      slug,
      path: "",
      depth: 0,
      createdByUserId: authResult.userId,
      approvalStatus: "pending",
    })
    .returning({ id: sources.id });

  const newId = inserted[0]!.id;

  // Set path to own ID (root node materialized path)
  await db
    .update(sources)
    .set({ path: newId })
    .where(eq(sources.id, newId));

  return Response.json(
    { id: newId, name: parsed.data.name },
    { status: 201, headers: CORS_HEADERS },
  );
}
