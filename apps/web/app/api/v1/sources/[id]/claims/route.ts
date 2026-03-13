// PUBLIC API EXCEPTION: This route is the explicit exception to the DAL "no API routes"
// rule. It exists to serve the browser extension and third-party developers.
// See: .planning/STATE.md Decisions.
import { type NextRequest } from "next/server";
import { db, claims, sources } from "@repo/database";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { requireAuth } from "@/app/api/v1/lib/auth";
import { auth } from "@/app/lib/auth";
import {
  isUuid,
  validateImpact,
  validateConfidence,
  validateClaimContent,
} from "@isthatslop/validation";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const BodySchema = z.object({
  content: z.string(),
  impact: z.number().int(),
  confidence: z.number().int(),
});

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sourceId } = await params;

  // Auth check
  const authResult = await requireAuth(request);
  if (!authResult.ok) {
    return new Response(authResult.response.body, {
      status: authResult.response.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate source ID
  if (!isUuid(sourceId)) {
    return Response.json(
      { error: "Invalid source ID" },
      { status: 400, headers: CORS_HEADERS },
    );
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
    `claim:${authResult.userId}`,
    RATE_LIMITS.CLAIM_SUBMIT,
  );
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

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Domain validation
  const impactResult = validateImpact(parsed.data.impact);
  if (!impactResult.valid) {
    return Response.json(
      { error: impactResult.error },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  const confidenceResult = validateConfidence(parsed.data.confidence);
  if (!confidenceResult.valid) {
    return Response.json(
      { error: confidenceResult.error },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  const contentResult = validateClaimContent(parsed.data.content);
  if (!contentResult.valid) {
    return Response.json(
      { error: contentResult.error },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  // Check source exists
  const sourceRows = await db
    .select({ id: sources.id })
    .from(sources)
    .where(and(eq(sources.id, sourceId), isNull(sources.deletedAt)))
    .limit(1);

  if (!sourceRows[0]) {
    return Response.json(
      { error: "Source not found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  // Insert claim
  const inserted = await db
    .insert(claims)
    .values({
      sourceId: sourceId,
      userId: authResult.userId,
      content: parsed.data.content,
      impact: parsed.data.impact,
      confidence: parsed.data.confidence,
    })
    .returning({ id: claims.id });

  return Response.json(
    { claimId: inserted[0]!.id, sourceId: sourceId },
    { status: 201, headers: CORS_HEADERS },
  );
}
