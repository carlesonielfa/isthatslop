// Score calculation algorithm for claims-based tier system
// Tiers are calculated algorithmically from aggregated claims, not voted directly

export const tierThresholds = {
  artisanal: 5, // < 5 normalized score
  mostlyHuman: 15, // 5-15
  questionable: 35, // 15-35
  compromised: 60, // 35-60
  // >= 60 is slop
} as const;

export interface ClaimData {
  impact: number; // 1-5
  confidence: number; // 1-5
  helpfulVotes: number;
}

export interface SourceScore {
  tier: number; // 0-4
  rawScore: number;
  normalizedScore: number;
  claimCount: number;
}

/**
 * Calculate source score from claims
 *
 * Algorithm:
 * 1. Each claim weight = (1 + log(helpful_votes + 1)) * impact * confidence
 * 2. Raw score = sum of all claim weights
 * 3. Normalized score = raw_score / sqrt(claim_count) to prevent volume attacks
 * 4. Map normalized score to tier via thresholds
 */
export function calculateSourceScore(claims: ClaimData[]): SourceScore {
  if (claims.length === 0) {
    return { tier: 0, rawScore: 0, normalizedScore: 0, claimCount: 0 };
  }

  // Calculate weight for each claim
  const claimWeights = claims.map((claim) => {
    // Helpful votes boost the claim weight (logarithmic to prevent gaming)
    const helpfulFactor = Math.max(1, 1 + Math.log(claim.helpfulVotes + 1));
    return helpfulFactor * claim.impact * claim.confidence;
  });

  // Sum all claim weights
  const rawScore = claimWeights.reduce((sum, weight) => sum + weight, 0);

  // Normalize by sqrt of claim count to prevent pure volume attacks
  const normalizedScore = rawScore / Math.sqrt(claims.length);

  // Map normalized score to tier
  const tier = scoreToTier(normalizedScore);

  return {
    tier,
    rawScore,
    normalizedScore,
    claimCount: claims.length,
  };
}

/**
 * Map normalized score to tier (0-4)
 */
export function scoreToTier(normalizedScore: number): number {
  if (normalizedScore < tierThresholds.artisanal) return 0; // Artisanal
  if (normalizedScore < tierThresholds.mostlyHuman) return 1; // Mostly Human
  if (normalizedScore < tierThresholds.questionable) return 2; // Questionable
  if (normalizedScore < tierThresholds.compromised) return 3; // Compromised
  return 4; // Slop
}

/**
 * Calculate weight for a single claim
 * Useful for displaying claim importance in UI
 */
export function calculateClaimWeight(claim: ClaimData): number {
  const helpfulFactor = Math.max(1, 1 + Math.log(claim.helpfulVotes + 1));
  return helpfulFactor * claim.impact * claim.confidence;
}

/**
 * Calculate maximum possible claim weight (for normalization in UI)
 * Max: impact=5, confidence=5, with some helpful votes
 */
export function getMaxClaimWeight(): number {
  return 5 * 5 * 2; // 50 (assuming ~7 helpful votes for 2x multiplier)
}
