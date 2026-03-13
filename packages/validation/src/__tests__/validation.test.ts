import { describe, expect, it } from "bun:test";
import {
  generateSlug,
  isUuid,
  validateClaimContent,
  validateCommentContent,
  validateConfidence,
  validateImpact,
  validateSlug,
  validateSourceName,
} from "../index";

describe("validateImpact", () => {
  it("returns valid for impact=1", () => {
    expect(validateImpact(1)).toEqual({ valid: true });
  });

  it("returns valid for impact=5", () => {
    expect(validateImpact(5)).toEqual({ valid: true });
  });

  it("returns invalid for impact=0", () => {
    expect(validateImpact(0)).toEqual({
      valid: false,
      error: "Impact must be between 1 and 5",
    });
  });

  it("returns invalid for impact=6", () => {
    const result = validateImpact(6);
    expect(result.valid).toBe(false);
  });

  it("returns invalid for non-integer impact (1.5)", () => {
    const result = validateImpact(1.5);
    expect(result.valid).toBe(false);
  });
});

describe("validateConfidence", () => {
  it("returns valid for confidence=3", () => {
    expect(validateConfidence(3)).toEqual({ valid: true });
  });

  it("returns invalid for confidence=0", () => {
    const result = validateConfidence(0);
    expect(result.valid).toBe(false);
  });
});

describe("validateClaimContent", () => {
  it("returns valid for exactly 100 characters", () => {
    expect(validateClaimContent("a".repeat(100))).toEqual({ valid: true });
  });

  it("returns valid for exactly 2000 characters", () => {
    expect(validateClaimContent("a".repeat(2000))).toEqual({ valid: true });
  });

  it("returns invalid for 99 characters", () => {
    expect(validateClaimContent("a".repeat(99))).toEqual({
      valid: false,
      error: "Claim must be at least 100 characters",
    });
  });

  it("returns invalid for 2001 characters", () => {
    const result = validateClaimContent("a".repeat(2001));
    expect(result.valid).toBe(false);
  });
});

describe("validateCommentContent", () => {
  it("returns valid for exactly 10 characters", () => {
    expect(validateCommentContent("a".repeat(10))).toEqual({ valid: true });
  });

  it("returns valid for exactly 1000 characters", () => {
    expect(validateCommentContent("a".repeat(1000))).toEqual({ valid: true });
  });

  it("returns invalid for 9 characters", () => {
    const result = validateCommentContent("a".repeat(9));
    expect(result.valid).toBe(false);
  });

  it("returns invalid for 1001 characters", () => {
    const result = validateCommentContent("a".repeat(1001));
    expect(result.valid).toBe(false);
  });
});

describe("validateSourceName", () => {
  it("returns valid for a normal name", () => {
    expect(validateSourceName("My Source")).toEqual({ valid: true });
  });

  it("returns invalid for empty string", () => {
    const result = validateSourceName("");
    expect(result.valid).toBe(false);
  });

  it("returns invalid for name exceeding 200 characters", () => {
    const result = validateSourceName("a".repeat(201));
    expect(result.valid).toBe(false);
  });
});

describe("generateSlug", () => {
  it("lowercases and hyphenates words", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("trims and removes special characters", () => {
    expect(generateSlug("  My Source!! ")).toBe("my-source");
  });
});

describe("validateSlug", () => {
  it("returns valid for a non-empty slug", () => {
    expect(validateSlug("hello-world")).toEqual({ valid: true });
  });

  it("returns invalid for empty string", () => {
    const result = validateSlug("");
    expect(result.valid).toBe(false);
  });
});

describe("isUuid", () => {
  it("returns true for valid UUID", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("returns false for non-UUID string", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});
