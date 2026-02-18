import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, isNotNull, like } from "drizzle-orm";
import { calculateSourceScore, tierThresholds } from "@repo/scoring";
import * as schema from "../src/schema.js";

// Load .env from monorepo root
config({ path: resolve(import.meta.dirname, "../../../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function createHistogram(scores: number[], buckets: number = 10): void {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;
  const bucketSize = range / buckets;

  const bucketCounts = new Array(buckets).fill(0);
  const bucketLabels: string[] = [];

  // Populate buckets
  for (const score of scores) {
    const bucketIndex = Math.min(
      Math.floor((score - min) / bucketSize),
      buckets - 1,
    );
    bucketCounts[bucketIndex]++;
  }

  // Generate labels
  for (let i = 0; i < buckets; i++) {
    const bucketStart = min + i * bucketSize;
    const bucketEnd = min + (i + 1) * bucketSize;
    if (i === buckets - 1) {
      bucketLabels.push(`${bucketStart.toFixed(0)}+`);
    } else {
      bucketLabels.push(`${bucketStart.toFixed(0)}-${bucketEnd.toFixed(0)}`);
    }
  }

  // Find max count for scaling
  const maxCount = Math.max(...bucketCounts);
  const barWidth = 40;

  console.log("\nScore Distribution (Histogram):");
  console.log("=".repeat(60));

  for (let i = 0; i < buckets; i++) {
    const count = bucketCounts[i];
    const barLength =
      maxCount > 0 ? Math.round((count / maxCount) * barWidth) : 0;
    const bar = "█".repeat(barLength);
    const label = bucketLabels[i].padEnd(12);

    // Show tier markers
    const bucketMid = min + (i + 0.5) * bucketSize;
    let tierMarker = "";
    if (bucketMid < tierThresholds.artisanal) {
      tierMarker = " [Tier 0: Artisanal]";
    } else if (bucketMid < tierThresholds.mostlyHuman) {
      tierMarker = " [Tier 1: Mostly Human]";
    } else if (bucketMid < tierThresholds.questionable) {
      tierMarker = " [Tier 2: Questionable]";
    } else if (bucketMid < tierThresholds.compromised) {
      tierMarker = " [Tier 3: Compromised]";
    } else {
      tierMarker = " [Tier 4: Slop]";
    }

    console.log(`${label} | ${bar} (${count})${tierMarker}`);
  }
  console.log("=".repeat(60));
}

async function analyzeTierDistribution() {
  console.log("Analyzing Score Distribution and Tier Thresholds\n");

  // ---------------------------------------------------------------------------
  // 1. Query all scores from cache
  // ---------------------------------------------------------------------------
  const scoreCache = await db
    .select()
    .from(schema.sourceScoreCache)
    .where(isNotNull(schema.sourceScoreCache.normalizedScore));

  if (scoreCache.length === 0) {
    console.log("⚠ No scores found in source_score_cache.");
    console.log(
      "   Run the scoring seed script first: bun run db:seed-scoring",
    );
    console.log(
      "   Or run the recalculation cron endpoint if sources and claims exist.",
    );
    await pool.end();
    process.exit(1);
  }

  console.log(`Found ${scoreCache.length} sources with scores\n`);

  // ---------------------------------------------------------------------------
  // 2. Check for stale scores
  // ---------------------------------------------------------------------------
  const staleScores = scoreCache.filter(
    (s) =>
      s.recalculationRequestedAt &&
      s.lastCalculatedAt &&
      new Date(s.recalculationRequestedAt) > new Date(s.lastCalculatedAt),
  );

  if (staleScores.length > 0) {
    console.log(
      `⚠ WARNING: ${staleScores.length} stale scores detected (recalculation_requested_at > last_calculated_at)`,
    );
    console.log(
      "   Run the recalculation cron endpoint first for accurate analysis:",
    );
    console.log("   curl http://localhost:3000/api/cron/recalculate-scores\n");
  }

  // ---------------------------------------------------------------------------
  // 3. Calculate distribution statistics
  // ---------------------------------------------------------------------------
  const normalizedScores = scoreCache
    .map((s) => parseFloat(s.normalizedScore as string))
    .sort((a, b) => a - b);

  const min = Math.min(...normalizedScores);
  const max = Math.max(...normalizedScores);
  const median = calculatePercentile(normalizedScores, 50);

  console.log("Score Range:");
  console.log(`  Min: ${min.toFixed(2)}`);
  console.log(`  Max: ${max.toFixed(2)}`);
  console.log(`  Median: ${median.toFixed(2)}\n`);

  // ---------------------------------------------------------------------------
  // 4. Current tier distribution
  // ---------------------------------------------------------------------------
  const tierCounts = new Map<number, number>();
  for (let i = 0; i <= 4; i++) {
    tierCounts.set(i, 0);
  }

  for (const score of scoreCache) {
    const tier = score.tier ?? 0;
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
  }

  console.log("Current Tier Distribution:");
  const tierNames = [
    "Artisanal",
    "Mostly Human",
    "Questionable",
    "Compromised",
    "Slop",
  ];
  for (let i = 0; i <= 4; i++) {
    const count = tierCounts.get(i) ?? 0;
    const percentage = ((count / scoreCache.length) * 100).toFixed(1);
    console.log(`  Tier ${i} (${tierNames[i]}): ${count} (${percentage}%)`);
  }
  console.log();

  // ---------------------------------------------------------------------------
  // 5. Percentile analysis
  // ---------------------------------------------------------------------------
  console.log("Percentile Analysis:");
  const percentiles = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  for (const p of percentiles) {
    const value = calculatePercentile(normalizedScores, p);
    console.log(`  p${p}: ${value.toFixed(2)}`);
  }
  console.log();

  // ---------------------------------------------------------------------------
  // 6. Current thresholds
  // ---------------------------------------------------------------------------
  console.log("Current Tier Thresholds:");
  console.log(`  Tier 0 -> 1: < ${tierThresholds.artisanal}`);
  console.log(
    `  Tier 1 -> 2: ${tierThresholds.artisanal} - ${tierThresholds.mostlyHuman}`,
  );
  console.log(
    `  Tier 2 -> 3: ${tierThresholds.mostlyHuman} - ${tierThresholds.questionable}`,
  );
  console.log(
    `  Tier 3 -> 4: ${tierThresholds.questionable} - ${tierThresholds.compromised}`,
  );
  console.log(`  Tier 4: >= ${tierThresholds.compromised}\n`);

  // Show sources near boundaries (within 10%)
  const boundaries = [
    tierThresholds.artisanal,
    tierThresholds.mostlyHuman,
    tierThresholds.questionable,
    tierThresholds.compromised,
  ];

  console.log("Sources near tier boundaries (±10%):");
  let nearBoundaryCount = 0;
  for (const boundary of boundaries) {
    const margin = boundary * 0.1;
    const near = scoreCache.filter((s) => {
      const score = parseFloat(s.normalizedScore as string);
      return Math.abs(score - boundary) <= margin;
    });
    if (near.length > 0) {
      console.log(`  Near ${boundary} threshold: ${near.length} sources`);
      nearBoundaryCount += near.length;
    }
  }
  if (nearBoundaryCount === 0) {
    console.log("  None");
  }
  console.log();

  // ---------------------------------------------------------------------------
  // 7. Recommend percentile-based thresholds
  // ---------------------------------------------------------------------------
  console.log("Recommended Percentile-Based Thresholds:");
  console.log("  (for more balanced distribution)");
  const p20 = calculatePercentile(normalizedScores, 20);
  const p40 = calculatePercentile(normalizedScores, 40);
  const p60 = calculatePercentile(normalizedScores, 60);
  const p80 = calculatePercentile(normalizedScores, 80);

  console.log(`  Tier 0 -> 1: < ${p20.toFixed(2)} (p20)`);
  console.log(`  Tier 1 -> 2: ${p20.toFixed(2)} - ${p40.toFixed(2)} (p40)`);
  console.log(`  Tier 2 -> 3: ${p40.toFixed(2)} - ${p60.toFixed(2)} (p60)`);
  console.log(`  Tier 3 -> 4: ${p60.toFixed(2)} - ${p80.toFixed(2)} (p80)`);
  console.log(`  Tier 4: >= ${p80.toFixed(2)}\n`);

  console.log(
    "Note: Balanced doesn't mean uniform. Bimodal distribution (more at extremes) is expected.\n",
  );

  // ---------------------------------------------------------------------------
  // 8. ASCII Histogram
  // ---------------------------------------------------------------------------
  createHistogram(normalizedScores, 10);

  // ---------------------------------------------------------------------------
  // 9. Tier Verification (for seeded test data)
  // ---------------------------------------------------------------------------
  console.log("\n\nTier Verification (seeded test data):");
  console.log("=".repeat(80));

  const testSources = await db
    .select()
    .from(schema.sources)
    .where(like(schema.sources.slug, "scoring-test-%"));

  if (testSources.length === 0) {
    console.log(
      "No test data found. Run 'bun run db:seed-scoring' to create test data.",
    );
    await pool.end();
    process.exit(0);
  }

  // Category mappings
  const categoryExpectedTier = {
    a: 0, // Artisanal
    b: 1, // Mostly Human
    c: 2, // Questionable
    d: 3, // Compromised
    e: 4, // Slop
  };

  console.log(
    `\n${"Source".padEnd(25)} | ${"Cached".padEnd(6)} | ${"Recalc".padEnd(6)} | ${"Expected".padEnd(8)} | Status`,
  );
  console.log("-".repeat(80));

  let passCount = 0;
  let totalCount = 0;
  const failures: Array<{
    slug: string;
    cachedTier: number;
    recalcTier: number;
    expectedTier: number;
    score: number;
    claims: Array<{ impact: number; confidence: number; helpfulVotes: number }>;
  }> = [];

  for (const source of testSources) {
    totalCount++;

    // Extract category from slug (scoring-test-a-1 -> a)
    const categoryMatch = source.slug.match(/scoring-test-([a-e])-\d+/);
    if (!categoryMatch) continue;

    const category = categoryMatch[1] as keyof typeof categoryExpectedTier;
    const expectedTier = categoryExpectedTier[category];

    // Get cached tier
    const cached = scoreCache.find((s) => s.sourceId === source.id);
    const cachedTier = cached?.tier ?? 0;

    // Recalculate tier from actual claims
    const claims = await db
      .select({
        impact: schema.claims.impact,
        confidence: schema.claims.confidence,
        helpfulVotes: schema.claims.helpfulVotes,
      })
      .from(schema.claims)
      .where(eq(schema.claims.sourceId, source.id));

    const recalcScore = calculateSourceScore(claims);
    const recalcTier = recalcScore.tier;

    // Compare
    const cachedMatch = cachedTier === expectedTier;
    const recalcMatch = recalcTier === expectedTier;
    const allMatch = cachedMatch && recalcMatch;

    if (allMatch) {
      passCount++;
    } else {
      failures.push({
        slug: source.slug,
        cachedTier,
        recalcTier,
        expectedTier,
        score: recalcScore.normalizedScore,
        claims,
      });
    }

    const status = allMatch ? "PASS" : "FAIL";
    const statusSymbol = allMatch ? "✓" : "✗";

    console.log(
      `${statusSymbol} ${source.slug.padEnd(23)} | ${String(cachedTier).padEnd(6)} | ${String(recalcTier).padEnd(6)} | ${String(expectedTier).padEnd(8)} | ${status}`,
    );
  }

  console.log("-".repeat(80));
  console.log(
    `\nResult: ${passCount}/${totalCount} PASS (${((passCount / totalCount) * 100).toFixed(1)}%)`,
  );

  // Show diagnostics for failures
  if (failures.length > 0) {
    console.log("\n\nDiagnostics for Failed Sources:");
    console.log("=".repeat(80));

    for (const failure of failures) {
      console.log(`\n${failure.slug}:`);
      console.log(`  Expected tier: ${failure.expectedTier}`);
      console.log(`  Cached tier: ${failure.cachedTier}`);
      console.log(`  Recalculated tier: ${failure.recalcTier}`);
      console.log(`  Normalized score: ${failure.score.toFixed(2)}`);
      console.log(`  Claim count: ${failure.claims.length}`);

      if (failure.claims.length > 0) {
        console.log(`  Claims:`);
        for (const claim of failure.claims) {
          const weight =
            (1 + Math.log(claim.helpfulVotes + 1)) *
            claim.impact *
            claim.confidence;
          console.log(
            `    - impact=${claim.impact}, confidence=${claim.confidence}, votes=${claim.helpfulVotes}, weight=${weight.toFixed(2)}`,
          );
        }
      }

      console.log(`  Tier boundaries:`);
      console.log(`    Tier 0: < ${tierThresholds.artisanal}`);
      console.log(
        `    Tier 1: ${tierThresholds.artisanal} - ${tierThresholds.mostlyHuman}`,
      );
      console.log(
        `    Tier 2: ${tierThresholds.mostlyHuman} - ${tierThresholds.questionable}`,
      );
      console.log(
        `    Tier 3: ${tierThresholds.questionable} - ${tierThresholds.compromised}`,
      );
      console.log(`    Tier 4: >= ${tierThresholds.compromised}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Exit with appropriate code
  // ---------------------------------------------------------------------------
  const passRate = passCount / totalCount;
  const exitCode = passRate >= 0.8 ? 0 : 1;

  if (exitCode === 1) {
    console.log("\n⚠ Less than 80% of test sources mapped to expected tiers.");
    console.log(
      "   Consider adjusting tier thresholds or seed data claim patterns.",
    );
  } else {
    console.log("\n✓ Tier verification passed (>= 80% accuracy).");
  }

  await pool.end();
  process.exit(exitCode);
}

analyzeTierDistribution().catch(async (error) => {
  console.error("Analysis failed:", error);
  await pool.end();
  process.exit(1);
});
