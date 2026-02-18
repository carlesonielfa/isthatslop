import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, like } from "drizzle-orm";
import { calculateSourceScore } from "@repo/scoring";
import * as schema from "../src/schema.js";

// Load .env from monorepo root
config({ path: resolve(import.meta.dirname, "../../../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Seeded counter for deterministic randomization
let counter = 0;
function deterministicRandom(min: number, max: number): number {
  counter++;
  const seed = (counter * 9301 + 49297) % 233280;
  const rnd = seed / 233280;
  return Math.floor(rnd * (max - min + 1)) + min;
}

// Category definitions with expected claim patterns
// Ranges are tuned so normalized scores land in the correct tier:
//   weight = (1 + log(votes + 1)) * impact * confidence
//   normalizedScore = sum(weights) / sqrt(claimCount)
// Tier boundaries: <5 (tier 0), 5-15 (tier 1), 15-35 (tier 2), 35-60 (tier 3), >=60 (tier 4)
const categories = {
  a: {
    name: "Artisanal",
    expectedTier: 0,
    count: 5,
    claimCountRange: [0, 2] as [number, number],
    pattern: {
      impactRange: [1, 1] as [number, number],
      confidenceRange: [1, 2] as [number, number],
      votesRange: [1, 3] as [number, number],
    },
  },
  b: {
    name: "Mostly Human",
    expectedTier: 1,
    count: 7,
    claimCountRange: [2, 3] as [number, number],
    pattern: {
      impactRange: [2, 2] as [number, number],
      confidenceRange: [1, 2] as [number, number],
      votesRange: [2, 2] as [number, number],
    },
  },
  c: {
    name: "Questionable",
    expectedTier: 2,
    count: 8,
    claimCountRange: [3, 4] as [number, number],
    pattern: {
      impactRange: [2, 2] as [number, number],
      confidenceRange: [2, 3] as [number, number],
      votesRange: [3, 5] as [number, number],
    },
  },
  d: {
    name: "Compromised",
    expectedTier: 3,
    count: 6,
    claimCountRange: [3, 5] as [number, number],
    pattern: {
      impactRange: [3, 3] as [number, number],
      confidenceRange: [3, 3] as [number, number],
      votesRange: [5, 8] as [number, number],
    },
  },
  e: {
    name: "Slop",
    expectedTier: 4,
    count: 4,
    claimCountRange: [4, 8] as [number, number],
    pattern: {
      impactRange: [3, 5] as [number, number],
      confidenceRange: [3, 5] as [number, number],
      votesRange: [10, 30] as [number, number],
    },
  },
};

async function seed() {
  console.log("Seeding scoring test data...\n");

  // ---------------------------------------------------------------------------
  // 1. Check if test data exists and clean up
  // ---------------------------------------------------------------------------
  const existingSources = await db
    .select()
    .from(schema.sources)
    .where(like(schema.sources.slug, "scoring-test-%"))
    .limit(1);

  if (existingSources.length > 0) {
    console.log("⚠ Test data already exists. Cleaning up first...");
    // Get all test source IDs
    const testSourceIds = await db
      .select({ id: schema.sources.id })
      .from(schema.sources)
      .where(like(schema.sources.slug, "scoring-test-%"));

    // Delete in correct order due to foreign keys
    for (const source of testSourceIds) {
      // Delete claim votes first (through claims)
      const claimIds = await db
        .select({ id: schema.claims.id })
        .from(schema.claims)
        .where(eq(schema.claims.sourceId, source.id));

      for (const claim of claimIds) {
        await db
          .delete(schema.claimVotes)
          .where(eq(schema.claimVotes.claimId, claim.id));
      }

      // Delete claims
      await db
        .delete(schema.claims)
        .where(eq(schema.claims.sourceId, source.id));
    }

    // Delete sources
    await db
      .delete(schema.sources)
      .where(like(schema.sources.slug, "scoring-test-%"));
    // Delete test users
    await db.delete(schema.user).where(like(schema.user.id, "scoring-test-%"));
    await db.delete(schema.user).where(like(schema.user.id, "scoring-voter-%"));
    console.log("✓ Cleanup complete\n");
  }

  // ---------------------------------------------------------------------------
  // 2. Create test users
  // ---------------------------------------------------------------------------
  console.log("Creating test users...");

  // Main test user
  await db
    .insert(schema.user)
    .values({
      id: "scoring-test-user",
      name: "Scoring Test Bot",
      email: "scoring-test@example.com",
      emailVerified: true,
      username: "scoringtestbot",
      displayUsername: "ScoringTestBot",
      reputation: 0,
      role: "member",
    })
    .onConflictDoNothing();

  // Create 20 voter users
  const voterUsers = Array.from({ length: 20 }, (_, i) => ({
    id: `scoring-voter-${i + 1}`,
    name: `Voter ${i + 1}`,
    email: `voter${i + 1}@example.com`,
    emailVerified: true,
    username: `voter${i + 1}`,
    displayUsername: `Voter${i + 1}`,
    reputation: 0,
    role: "member" as const,
  }));

  await db.insert(schema.user).values(voterUsers).onConflictDoNothing();

  console.log("✓ Created test user and 20 voter users\n");

  // ---------------------------------------------------------------------------
  // 3. Create sources with varied claim patterns
  // ---------------------------------------------------------------------------
  console.log("Creating test sources...");

  let totalSources = 0;
  let totalClaims = 0;
  let totalVotes = 0;
  const expectedMappings: Array<{
    slug: string;
    claims: Array<{ impact: number; confidence: number; helpfulVotes: number }>;
    expectedTier: number;
    category: string;
  }> = [];

  for (const [categoryKey, category] of Object.entries(categories)) {
    console.log(
      `  Creating ${category.count} sources for Category ${categoryKey.toUpperCase()} (${category.name})...`,
    );

    for (let i = 1; i <= category.count; i++) {
      const sourceSlug = `scoring-test-${categoryKey}-${i}`;

      // Insert source
      const [source] = await db
        .insert(schema.sources)
        .values({
          slug: sourceSlug,
          name: `Test Source ${categoryKey.toUpperCase()}-${i}`,
          type: "website",
          description: `Test source for ${category.name} tier (expected tier ${category.expectedTier})`,
          url: `https://example.com/${sourceSlug}`,
          parentId: null,
          path: crypto.randomUUID(),
          depth: 0,
          createdByUserId: "scoring-test-user",
        })
        .returning();

      totalSources++;

      // Determine claim count for this source
      const claimCount = deterministicRandom(
        category.claimCountRange[0],
        category.claimCountRange[1],
      );

      const sourceClaims: Array<{
        impact: number;
        confidence: number;
        helpfulVotes: number;
      }> = [];

      // Create claims for this source
      for (let j = 0; j < claimCount; j++) {
        const impact = deterministicRandom(
          category.pattern.impactRange[0],
          category.pattern.impactRange[1],
        );
        const confidence = deterministicRandom(
          category.pattern.confidenceRange[0],
          category.pattern.confidenceRange[1],
        );
        const helpfulVotes = deterministicRandom(
          category.pattern.votesRange[0],
          category.pattern.votesRange[1],
        );

        const [claim] = await db
          .insert(schema.claims)
          .values({
            sourceId: source.id,
            userId: "scoring-test-user",
            content: `Test claim ${j + 1} for ${sourceSlug}. Impact: ${impact}, Confidence: ${confidence}. This is seed data for testing the scoring algorithm.`,
            impact,
            confidence,
            helpfulVotes: 0, // Will be updated after votes
            notHelpfulVotes: 0,
          })
          .returning();

        totalClaims++;

        // Create votes for this claim
        const voterIds = Array.from(
          { length: Math.min(helpfulVotes, 20) },
          (_, k) => `scoring-voter-${k + 1}`,
        );

        for (const voterId of voterIds) {
          await db.insert(schema.claimVotes).values({
            claimId: claim.id,
            userId: voterId,
            isHelpful: true,
          });
          totalVotes++;
        }

        // Update claim with vote count
        await db
          .update(schema.claims)
          .set({ helpfulVotes })
          .where(eq(schema.claims.id, claim.id));

        sourceClaims.push({ impact, confidence, helpfulVotes });
      }

      // Store expected mapping for verification
      expectedMappings.push({
        slug: sourceSlug,
        claims: sourceClaims,
        expectedTier: category.expectedTier,
        category: `${categoryKey.toUpperCase()} (${category.name})`,
      });
    }
  }

  console.log(
    `✓ Created ${totalSources} sources, ${totalClaims} claims, ${totalVotes} votes\n`,
  );

  // ---------------------------------------------------------------------------
  // 4. Calculate and cache scores for test sources
  // ---------------------------------------------------------------------------
  console.log("Calculating scores for test sources...");

  for (const mapping of expectedMappings) {
    if (mapping.claims.length === 0) {
      // No claims - insert empty state
      const sourceId = await db
        .select({ id: schema.sources.id })
        .from(schema.sources)
        .where(eq(schema.sources.slug, mapping.slug))
        .then((rows) => rows[0]?.id);

      if (sourceId) {
        await db
          .insert(schema.sourceScoreCache)
          .values({
            sourceId,
            tier: 0,
            rawScore: "0",
            normalizedScore: "0",
            claimCount: 0,
            lastCalculatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.sourceScoreCache.sourceId,
            set: {
              tier: 0,
              rawScore: "0",
              normalizedScore: "0",
              claimCount: 0,
              lastCalculatedAt: new Date(),
            },
          });
      }
      continue;
    }

    const score = calculateSourceScore(mapping.claims);
    const sourceId = await db
      .select({ id: schema.sources.id })
      .from(schema.sources)
      .where(eq(schema.sources.slug, mapping.slug))
      .then((rows) => rows[0]?.id);

    if (sourceId) {
      await db
        .insert(schema.sourceScoreCache)
        .values({
          sourceId,
          tier: score.tier,
          rawScore: score.rawScore.toFixed(2),
          normalizedScore: score.normalizedScore.toFixed(2),
          claimCount: score.claimCount,
          lastCalculatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.sourceScoreCache.sourceId,
          set: {
            tier: score.tier,
            rawScore: score.rawScore.toFixed(2),
            normalizedScore: score.normalizedScore.toFixed(2),
            claimCount: score.claimCount,
            lastCalculatedAt: new Date(),
          },
        });
    }
  }

  console.log("✓ Scores calculated and cached\n");

  // ---------------------------------------------------------------------------
  // 5. Verify expected tier mappings
  // ---------------------------------------------------------------------------
  console.log("Verifying expected tier mappings...\n");
  console.log("Expected tier mapping:");

  for (const mapping of expectedMappings) {
    if (mapping.claims.length === 0) {
      console.log(
        `  ${mapping.slug}: no claims -> tier 0 (expected: ${mapping.expectedTier}) ${mapping.expectedTier === 0 ? "OK" : "WARNING"}`,
      );
      continue;
    }

    const score = calculateSourceScore(mapping.claims);
    const calculatedTier = score.tier;
    const status = calculatedTier === mapping.expectedTier ? "OK" : "WARNING";
    const statusSymbol = status === "OK" ? "✓" : "⚠";

    console.log(
      `  ${statusSymbol} ${mapping.slug} (${mapping.category}): ${mapping.claims.length} claims -> normalizedScore=${score.normalizedScore.toFixed(2)} -> tier ${calculatedTier} (expected: ${mapping.expectedTier}) ${status}`,
    );

    if (status === "WARNING") {
      console.log(
        `      Claims: ${mapping.claims.map((c) => `i${c.impact}c${c.confidence}v${c.helpfulVotes}`).join(", ")}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n========================================");
  console.log("Scoring test data seed completed!");
  console.log("========================================");
  console.log(`Sources created: ${totalSources}`);
  console.log(`Claims created: ${totalClaims}`);
  console.log(`Votes created: ${totalVotes}`);
  console.log("========================================\n");

  await pool.end();
  process.exit(0);
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await pool.end();
  process.exit(1);
});
