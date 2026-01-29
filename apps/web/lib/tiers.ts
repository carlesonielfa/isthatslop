// Tier configuration - calculated from claims, not directly voted
// 5-tier system (0-4): Artisanal → Mostly Human → Questionable → Compromised → Slop

export const tiers = [
  { tier: 0, name: "Artisanal", icon: "sparkle", color: "#006400" },
  { tier: 1, name: "Mostly Human", icon: "user", color: "#008000" },
  { tier: 2, name: "Questionable", icon: "question", color: "#FFD700" },
  { tier: 3, name: "Compromised", icon: "warning", color: "#FF8C00" },
  { tier: 4, name: "Slop", icon: "robot", color: "#FF0000" },
] as const;

export type TierInfo = (typeof tiers)[number];
export type TierValue = TierInfo["tier"];

// Tier thresholds for normalized score mapping
export { tierThresholds } from "@repo/scoring";

export function getTierInfo(tier: number | null): TierInfo | null {
  if (tier === null) return null;
  return tiers.find((t) => t.tier === tier) ?? null;
}

export function getTierColor(tier: number | null): string {
  if (tier === null) return "#808080"; // Gray for no claims
  return getTierInfo(tier)?.color ?? "#808080";
}

export function getTierName(tier: number | null): string {
  if (tier === null) return "No Claims";
  return getTierInfo(tier)?.name ?? "Unknown";
}
