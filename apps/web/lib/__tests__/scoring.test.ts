import { describe, it, expect } from "bun:test";
import { calculateSourceScore } from "../scoring";

describe("calculateSourceScore", () => {
  it("returns tier 0 for empty claims", () => {
    const result = calculateSourceScore([]);
    expect(result.tier).toBe(0);
    expect(result.rawScore).toBe(0);
    expect(result.normalizedScore).toBe(0);
    expect(result.claimCount).toBe(0);
  });

  it("scores a single claim correctly", () => {
    const result = calculateSourceScore([
      { impact: 2, confidence: 3, helpfulVotes: 0 },
    ]);
    expect(result.rawScore).toBeCloseTo(6, 5);
    expect(result.normalizedScore).toBeCloseTo(6, 5);
    expect(result.tier).toBe(1);
    expect(result.claimCount).toBe(1);
  });

  it("aggregates multiple claims and normalizes by volume", () => {
    const result = calculateSourceScore([
      { impact: 5, confidence: 5, helpfulVotes: 0 },
      { impact: 5, confidence: 5, helpfulVotes: 0 },
    ]);
    expect(result.rawScore).toBeCloseTo(50, 5);
    expect(result.normalizedScore).toBeCloseTo(35.355, 3);
    expect(result.tier).toBe(3);
    expect(result.claimCount).toBe(2);
  });

  it("weights helpful votes logarithmically", () => {
    const lowHelp = calculateSourceScore([
      { impact: 1, confidence: 1, helpfulVotes: 0 },
    ]);
    const highHelp = calculateSourceScore([
      { impact: 1, confidence: 1, helpfulVotes: 9 },
    ]);

    expect(highHelp.rawScore).toBeGreaterThan(lowHelp.rawScore);
    expect(highHelp.normalizedScore).toBeGreaterThan(lowHelp.normalizedScore);
  });

  it("maps normalized scores to tiers", () => {
    const low = calculateSourceScore([
      { impact: 1, confidence: 1, helpfulVotes: 0 },
    ]);
    const mid = calculateSourceScore([
      { impact: 2, confidence: 3, helpfulVotes: 0 },
    ]);
    const high = calculateSourceScore([
      { impact: 5, confidence: 5, helpfulVotes: 10 },
    ]);

    expect(low.tier).toBe(0);
    expect(mid.tier).toBe(1);
    expect(high.tier).toBe(4);
  });
});
