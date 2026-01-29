// Pure validation functions for server actions
// These are extracted to be easily testable without Next.js/React dependencies

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const uuidPattern =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const uuidRegex = new RegExp(`^${uuidPattern}$`, "i");

export function isUuid(value: string): boolean {
  return uuidRegex.test(value);
}

/**
 * Validate impact value (1-5)
 * Impact measures how much AI usage affects the content's integrity
 */
export function validateImpact(impact: number): ValidationResult {
  if (!Number.isInteger(impact) || impact < 1 || impact > 5) {
    return { valid: false, error: "Impact must be between 1 and 5" };
  }
  return { valid: true };
}

/**
 * Validate confidence value (1-5)
 * Confidence measures how certain the user is that content is AI-generated
 */
export function validateConfidence(confidence: number): ValidationResult {
  if (!Number.isInteger(confidence) || confidence < 1 || confidence > 5) {
    return { valid: false, error: "Confidence must be between 1 and 5" };
  }
  return { valid: true };
}

/**
 * Validate claim content length (100-2000 characters)
 */
export function validateClaimContent(content: string): ValidationResult {
  if (content.length < 100) {
    return { valid: false, error: "Claim must be at least 100 characters" };
  }
  if (content.length > 2000) {
    return { valid: false, error: "Claim must be at most 2000 characters" };
  }
  return { valid: true };
}

/**
 * Validate comment content length (10-1000 characters)
 */
export function validateCommentContent(content: string): ValidationResult {
  if (content.length < 10) {
    return { valid: false, error: "Comment must be at least 10 characters" };
  }
  if (content.length > 1000) {
    return { valid: false, error: "Comment must be at most 1000 characters" };
  }
  return { valid: true };
}

/**
 * Validate source name
 */
export function validateSourceName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Source name is required" };
  }
  if (name.length > 200) {
    return {
      valid: false,
      error: "Source name must be at most 200 characters",
    };
  }
  return { valid: true };
}

/**
 * Generate slug from source name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

/**
 * Validate that a slug is valid (non-empty)
 */
export function validateSlug(slug: string): ValidationResult {
  if (!slug) {
    return { valid: false, error: "Invalid source name" };
  }
  return { valid: true };
}
