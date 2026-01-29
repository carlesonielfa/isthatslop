// Confidence scale (1-5): How certain the user is that content is AI-generated

export const confidenceLevels = [
  {
    level: 1,
    name: "Speculative",
    description: "Pattern matching, gut feeling",
  },
  {
    level: 2,
    name: "Suspicious",
    description: "Multiple circumstantial indicators",
  },
  {
    level: 3,
    name: "Probable",
    description: "Strong stylistic/structural evidence",
  },
  {
    level: 4,
    name: "Likely",
    description: "Multiple strong indicators align",
  },
  {
    level: 5,
    name: "Confirmed",
    description: "Watermark, metadata, admission, or definitive proof",
  },
] as const;

export type ConfidenceInfo = (typeof confidenceLevels)[number];
export type ConfidenceLevel = ConfidenceInfo["level"];

export function getConfidenceInfo(level: number): ConfidenceInfo | undefined {
  return confidenceLevels.find((c) => c.level === level);
}

export function getConfidenceName(level: number): string {
  return getConfidenceInfo(level)?.name ?? "Unknown";
}

export function getConfidenceColor(level: number): string {
  // Color scale from gray (low confidence) to blue (high confidence)
  const colors: Record<number, string> = {
    1: "#9ca3af", // gray
    2: "#60a5fa", // light blue
    3: "#3b82f6", // blue
    4: "#2563eb", // darker blue
    5: "#1d4ed8", // deep blue
  };
  return colors[level] ?? "#808080";
}
