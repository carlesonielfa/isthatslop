// Impact scale (1-5): How much AI usage affects the content's integrity

export const impacts = [
  {
    level: 1,
    name: "Cosmetic",
    description: "Doesn't affect core content",
  },
  {
    level: 2,
    name: "Supplementary",
    description: "Affects supporting elements",
  },
  {
    level: 3,
    name: "Partial",
    description: "Some core content affected",
  },
  {
    level: 4,
    name: "Substantial",
    description: "Major portions affected",
  },
  {
    level: 5,
    name: "Pervasive",
    description: "Core content fundamentally compromised",
  },
] as const;

export type ImpactInfo = (typeof impacts)[number];
export type ImpactLevel = ImpactInfo["level"];

export function getImpactInfo(level: number): ImpactInfo | undefined {
  return impacts.find((i) => i.level === level);
}

export function getImpactName(level: number): string {
  return getImpactInfo(level)?.name ?? "Unknown";
}

export function getImpactColor(level: number): string {
  // Color scale from green (low impact) to red (high impact)
  const colors: Record<number, string> = {
    1: "#22c55e", // green
    2: "#84cc16", // lime
    3: "#eab308", // yellow
    4: "#f97316", // orange
    5: "#ef4444", // red
  };
  return colors[level] ?? "#808080";
}
