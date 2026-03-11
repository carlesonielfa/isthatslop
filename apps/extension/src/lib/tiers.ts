export const TIER_COLORS: Record<number | "neutral", string> = {
  0: "#006400", // Artisanal — dark green
  1: "#008000", // Mostly Human — green
  2: "#FFD700", // Questionable — gold/yellow
  3: "#FF8C00", // Compromised — orange
  4: "#FF0000", // Slop — red
  neutral: "#808080", // Unscored — grey
};

export const TIER_NAMES: Record<number | "neutral", string> = {
  0: "Artisanal",
  1: "Mostly Human",
  2: "Questionable",
  3: "Compromised",
  4: "Slop",
  neutral: "Unscored",
};
